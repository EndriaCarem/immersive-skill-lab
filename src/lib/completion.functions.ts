import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { testAccessSchema } from "./completion-rules";

export const platformTerms = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env['SUPABASE_PUBLISHABLE_KEY']; const url = process.env['SUPABASE_URL'];
  if (!key || !url) throw new Error("Termos indisponíveis.");
  const db = createClient<Database>(url, key, { auth: { persistSession: false }, global: { fetch: (input, init) => {
    const headers = new Headers(init?.headers); headers.delete("Authorization"); headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  } } });
  const { data, error } = await db.from("platform_terms").select("id, version, body, created_at").eq("published", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error("Não foi possível carregar os termos.");
  return data;
});
export const publishPlatformTerms = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(x => z.object({ version: z.string().trim().min(1).max(40), body: z.string().trim().min(50).max(50000) }).parse(x))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("platform_terms").insert({ ...data, published: true });
    if (error) throw new Error("Não foi possível publicar os termos da plataforma.");
    return true;
  });
export const issueRealCertificate = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(x => z.object({ programId: z.string().min(1).max(80) }).parse(x)).handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: code, error } = await supabaseAdmin.rpc("issue_learning_certificate", { p_user: context.userId, p_program: data.programId });
    if (error) throw new Error(error.message);
    return code;
  });
export const verifyCertificate = createServerFn({ method: "GET" }).inputValidator(x => z.object({ code: z.string().max(100) }).parse(x))
  .handler(async ({ data }) => {
    if (!/^[a-f0-9]{32}$/.test(data.code)) return null;
    const key = process.env['SUPABASE_PUBLISHABLE_KEY']; const url = process.env['SUPABASE_URL'];
    if (!key || !url) throw new Error("Verificação indisponível.");
    const db = createClient<Database>(url, key, { auth: { persistSession: false }, global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers); headers.delete("Authorization"); headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } } });
    const { data: rows, error } = await db.rpc("verify_learning_certificate", { p_code: data.code });
    if (error) throw new Error("Não foi possível verificar o certificado.");
    return rows?.[0] ?? null;
  });
export const configureTestAccess = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((x: unknown) => testAccessSchema.parse(x)).handler(async ({ data, context }) => {
    const { data: expiry, error } = await context.supabase.rpc("configure_learning_test_access", { p_enrollment: data.enrollmentId, p_reason: data.reason });
    if (error) throw new Error(error.message);
    return expiry;
  });