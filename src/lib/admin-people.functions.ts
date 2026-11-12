import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assistantLimitSchema } from "./admin-people";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Acesso restrito à administração.");
}

/** Students (accounts) and leads (interest forms) for export. Admin only. */
export const adminPeople = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const users: { id: string; email: string; created_at: string; last_sign_in_at: string | null; confirmed_at: string | null }[] = [];
    for (let page = 1; page <= 20; page++) {
      const r = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (r.error) throw new Error("Não foi possível carregar as contas.");
      users.push(...r.data.users.map((u) => ({ id: u.id, email: u.email ?? "", created_at: u.created_at, last_sign_in_at: u.last_sign_in_at ?? null, confirmed_at: u.email_confirmed_at ?? null })));
      if (r.data.users.length < 1000) break;
    }
    const [profiles, orders, enrollments, products, leads, visits] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, phone, tax_id, updated_at"),
      supabaseAdmin.from("commerce_orders").select("id, user_id, status, source, total_cents, created_at, terms_accepted_at, cancellation_reason, commerce_order_items(title)").order("created_at", { ascending: false }),
      supabaseAdmin.from("commerce_enrollments").select("user_id, product_id, status, enrolled_at"),
      supabaseAdmin.from("commerce_products").select("id, title"),
      supabaseAdmin.from("interest_submissions").select("created_at, name, email, phone, interest, source, campaign_path, marketing_opt_in").order("created_at", { ascending: false }),
      supabaseAdmin.from("site_page_visits").select("visitor_id, user_id, section, first_source, first_campaign, first_landing, created_at").gte("created_at", new Date(Date.now() - 180 * 864e5).toISOString()).order("created_at", { ascending: true }).limit(20000),
    ]);
    for (const r of [profiles, orders, enrollments, products, leads, visits]) if (r.error) throw new Error("Não foi possível carregar os dados.");
    const title = new Map((products.data ?? []).map((p) => [p.id, p.title]));
    const vrows = visits.data ?? [];
    const visitorsOf = new Map<string, Set<string>>();
    vrows.forEach((v) => { if (v.user_id) { const s = visitorsOf.get(v.user_id) ?? new Set(); s.add(v.visitor_id); visitorsOf.set(v.user_id, s); } });
    const journeyOf = (id: string) => {
      const vs = visitorsOf.get(id); if (!vs) return null;
      const rows = vrows.filter((v) => vs.has(v.visitor_id));
      const steps: string[] = []; rows.forEach((v) => { if (steps[steps.length - 1] !== v.section) steps.push(v.section); });
      const f = rows[0]!;
      return { source: f.first_source || "direto", campaign: f.first_campaign, landing: f.first_landing, firstAt: f.created_at, steps: steps.slice(-30) };
    };
    const people = users.map((u) => {
      const p = profiles.data?.find((x) => x.id === u.id);
      return {
        id: u.id, email: u.email, created_at: u.created_at, name: p?.full_name ?? "", phone: p?.phone ?? "",
        courses: (enrollments.data ?? []).filter((e) => e.user_id === u.id && e.status === "active").map((e) => title.get(e.product_id) ?? e.product_id),
        journey: journeyOf(u.id),
        source: journeyOf(u.id)?.source ?? (orders.data ?? []).find((o) => o.user_id === u.id)?.source ?? "",
        tax_id: p?.tax_id ?? "", last_sign_in_at: u.last_sign_in_at, confirmed_at: u.confirmed_at,
        orders: (orders.data ?? []).filter((o) => o.user_id === u.id).map((o) => ({ id: o.id, status: o.status, source: o.source, total_cents: o.total_cents, created_at: o.created_at, terms_accepted_at: o.terms_accepted_at, cancellation_reason: o.cancellation_reason, items: (o.commerce_order_items ?? []).map((i: { title: string }) => i.title) })),
        enrollments: (enrollments.data ?? []).filter((e) => e.user_id === u.id).map((e) => ({ course: title.get(e.product_id) ?? e.product_id, status: e.status, created_at: e.enrolled_at })),
        leads: (leads.data ?? []).filter((l) => l.email.trim().toLowerCase() === u.email.trim().toLowerCase()),
      };
    });
    return { people, orders: (orders.data ?? []).map((o) => ({ user_id: o.user_id, status: o.status })), leads: leads.data ?? [] };
  });

export const assistantLimits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [cfg, rows] = await Promise.all([
      context.supabase.from("learning_assistant_config").select("default_question_limit").eq("id", "default").maybeSingle(),
      context.supabase.from("learning_assistant_settings").select("program_id, activity_id, enabled, question_limit"),
    ]);
    if (cfg.error || rows.error) throw new Error("Não foi possível carregar o assistente.");
    return { defaultLimit: cfg.data?.default_question_limit ?? 3, rows: rows.data ?? [] };
  });

export const saveAssistantLimit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((x: unknown) => z.object({ programId: z.string().min(1).max(80), activityId: z.string().min(1).max(80), limit: assistantLimitSchema, enabled: z.boolean() }).parse(x))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const r = await context.supabase.from("learning_assistant_settings").upsert(
      { program_id: data.programId, activity_id: data.activityId, question_limit: data.limit, enabled: data.enabled, updated_at: new Date().toISOString() },
      { onConflict: "program_id,activity_id" },
    );
    if (r.error) throw new Error("Não foi possível salvar o limite.");
    return { ok: true };
  });
