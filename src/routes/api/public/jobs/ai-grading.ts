import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/** Scheduled maintenance: removes old learner uploads that never became a delivery.
 *  It does not grade: the scheduler's call is cut after a few seconds, shorter than one grading,
 *  so claiming work here would only burn attempts. Grading runs in requests that wait for it
 *  (the learner's course pages and the admin "process now" action). */
export const Route = createFileRoute("/api/public/jobs/ai-grading")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let orphans: { found: number; removed: number } | { error: true } = { found: 0, removed: 0 };
        try {
          const { cleanupOrphanLearnerFiles } = await import("@/lib/learner-files.server");
          const r = await cleanupOrphanLearnerFiles(supabaseAdmin);
          orphans = { found: r.found, removed: r.removed.length };
        } catch (e) {
          console.error("orphan cleanup", e instanceof Error ? e.message : e);
          orphans = { error: true };
        }
        return Response.json({ processed: 0, results: [], orphans });
      },
    },
  },
});
