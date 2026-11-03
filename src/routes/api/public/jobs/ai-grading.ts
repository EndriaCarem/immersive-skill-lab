import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/** Scheduled backstop: grades queued deliveries even when the learner closed the browser. Bounded per run. */
export const Route = createFileRoute("/api/public/jobs/ai-grading")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { processEvaluations } = await import("@/lib/ai-grading.server");
        const results = await processEvaluations(supabaseAdmin, { limit: 2 });
        return Response.json({ processed: results.length, results: results.map(r => r.result) });
      },
    },
  },
});
