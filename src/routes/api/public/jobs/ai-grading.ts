import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/** Scheduled backstop: grades queued deliveries even when the learner closed the browser. Bounded per run.
 *  Also removes old learner uploads that never became a delivery (isolated so it never blocks grading). */
export const Route = createFileRoute("/api/public/jobs/ai-grading")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { processEvaluations } = await import("@/lib/ai-grading.server");
        const results = await processEvaluations(supabaseAdmin, { limit: 2 });
        let orphans: { found: number; removed: number } | { error: true } = { found: 0, removed: 0 };
        try {
          const { cleanupOrphanLearnerFiles } = await import("@/lib/learner-files.server");
          const r = await cleanupOrphanLearnerFiles(supabaseAdmin);
          orphans = { found: r.found, removed: r.removed.length };
        } catch (e) {
          console.error("orphan cleanup", e instanceof Error ? e.message : e);
          orphans = { error: true };
        }
        return Response.json({ processed: results.length, results: results.map(r => r.result), orphans });
      },
    },
  },
});
