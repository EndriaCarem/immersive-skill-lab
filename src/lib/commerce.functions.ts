import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { purchaseSchema, profileSchema, couponSchema } from "./commerce-schema";

export const accountData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [profile, roles, orders, enrollments] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("id", context.userId).single(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
      context.supabase
        .from("commerce_orders")
        .select("*, commerce_order_items(*)")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("commerce_enrollments")
        .select("*, commerce_products(*)")
        .eq("user_id", context.userId),
    ]);
    for (const r of [profile, roles, orders, enrollments])
      if (r.error) throw new Error("Não foi possível carregar sua conta.");
    return {
      profile: profile.data,
      roles: roles.data ?? [],
      orders: (orders.data ?? []).map((o) => ({
        ...o,
        terms_ip: typeof o.terms_ip === "string" ? o.terms_ip : null,
      })),
      enrollments: enrollments.data ?? [],
    };
  });
export const saveProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((x) => profileSchema.parse(x))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", context.userId);
    if (error) throw new Error("Não foi possível salvar o perfil.");
    return { success: true };
  });
export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((x) => purchaseSchema.parse(x))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Only the trusted hosting header is used. Never trust client-supplied IP or X-Forwarded-For.
    const ip = getRequest().headers.get("cf-connecting-ip");
    const { data: id, error } = await supabaseAdmin.rpc("create_commerce_order", {
      p_user: context.userId,
      p_request: data.requestId,
      p_products: data.productIds,
      p_coupon: data.coupon,
      p_method: data.method,
      p_installments: data.installments,
      p_terms: data.termsId,
      p_ip: ip ?? null,
      p_source: data.source,
      p_tags: data.tags,
    });
    if (error) throw new Error(error.message);
    return { id };
  });
export const cancelOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((x) =>
    z.object({ id: z.string().uuid(), reason: z.string().trim().min(3).max(1000) }).parse(x),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: status, error } = await supabaseAdmin.rpc("cancel_commerce_order", {
      p_user: context.userId,
      p_order: data.id,
      p_reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return { status, emailSent: false };
  });
export const adminCommerce = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: allowed } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!allowed) throw new Error("Acesso restrito à administração.");
    const [orders, products, coupons, terms, profiles, enrollments] = await Promise.all([
      context.supabase
        .from("commerce_orders")
        .select("*, commerce_order_items(*)")
        .order("created_at", { ascending: false }),
      context.supabase.from("commerce_products").select("*"),
      context.supabase.from("commerce_coupons").select("*"),
      context.supabase.from("commerce_terms").select("*").order("created_at", { ascending: false }),
      context.supabase.from("profiles").select("id,full_name"),
      context.supabase.from("commerce_enrollments").select("*"),
    ]);
    for (const r of [orders, products, coupons, terms, profiles, enrollments])
      if (r.error) throw new Error("Não foi possível carregar a operação comercial.");
    return {
      orders: (orders.data ?? []).map((o) => ({
        ...o,
        terms_ip: typeof o.terms_ip === "string" ? o.terms_ip : null,
      })),
      products: products.data ?? [],
      coupons: coupons.data ?? [],
      terms: terms.data ?? [],
      profiles: profiles.data ?? [],
      enrollments: enrollments.data ?? [],
    };
  });
export const saveCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((x) => couponSchema.parse(x))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("commerce_coupons")
      .upsert(data, { onConflict: "code" });
    if (error) throw new Error("Não foi possível salvar o cupom.");
    return true;
  });
export const publishTerms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((x) =>
    z
      .object({
        version: z.string().trim().min(1).max(40),
        body: z.string().trim().min(50).max(50000),
      })
      .parse(x),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("commerce_terms")
      .insert({ ...data, published: true });
    if (error) throw new Error("Não foi possível publicar esta versão dos termos.");
    return true;
  });
export const saveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((x) =>
    z
      .object({
        id: z.string().min(1).max(80),
        slug: z.string().min(1).max(100),
        title: z.string().min(1).max(200),
        kind: z.string().max(80),
        price_cents: z.number().int().min(0).max(100000000),
        active: z.boolean(),
      })
      .parse(x),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("commerce_products")
      .upsert({ ...data, updated_at: new Date().toISOString() });
    if (error) throw new Error("Não foi possível salvar o produto.");
    return true;
  });

// Read-only coupon preview so a 100% coupon can skip payment UI; the order RPC remains authoritative.
export const previewCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((x) => z.object({ code: z.string().trim().min(1).max(40) }).parse(x))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: c } = await supabaseAdmin
      .from("commerce_coupons")
      .select("kind, value, active, expires_at, max_uses, uses")
      .eq("code", data.code.toUpperCase())
      .maybeSingle();
    const valid =
      !!c && c.active && (!c.expires_at || new Date(c.expires_at) > new Date()) && (c.max_uses == null || c.uses < c.max_uses);
    if (!valid || (c.kind !== "percent" && c.kind !== "fixed")) return { valid: false as const };
    return { valid: true as const, kind: c.kind as "percent" | "fixed", value: c.value };
  });
