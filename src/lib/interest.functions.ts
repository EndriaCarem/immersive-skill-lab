import { createServerFn } from "@tanstack/react-start";
import { interestSchema } from "./interest-schema";

// Public, write-only lead action. No lead data or lookup is exposed to visitors.
export const submitInterest = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => interestSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("interest_submissions").insert({
      name: data.name,
      email: data.email,
      interest: data.interest,
      message: data.message,
      source: data.source,
      consent: data.consent,
      request_id: data.requestId,
    });
    // A retry of the same request is already recorded; do not add duplicate rows.
    if (error && error.code !== "23505") return { success: false };
    if (!error) {
      const { emailInterestToTeam } = await import("./email.server");
      await emailInterestToTeam(data);
    }
    return { success: true };
  });