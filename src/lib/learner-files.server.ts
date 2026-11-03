import type { SupabaseClient } from "@supabase/supabase-js";
import { ORPHAN_FILE_MIN_AGE_MINUTES, selectRemovableOrphans } from "@/lib/learning-rules";

const BUCKET = "learner-submissions";

/**
 * Removes learner files that were uploaded but never became a registered delivery.
 * Service-role only. Files linked to any submission (and therefore to its AI evaluation
 * and human review) are excluded by the database listing and re-checked right before removal.
 */
export async function cleanupOrphanLearnerFiles(db: SupabaseClient, opts: { limit?: number } = {}) {
  const { data, error } = await db.rpc("list_orphan_learner_files", {
    p_min_age_minutes: ORPHAN_FILE_MIN_AGE_MINUTES, p_limit: opts.limit ?? 50,
  });
  if (error) throw new Error(`orphan listing failed: ${error.message}`);
  const candidates = ((data ?? []) as { name: string }[]).map(r => r.name);
  if (!candidates.length) return { found: 0, removed: [] as string[] };
  const { data: linked, error: linkErr } = await db.from("learning_submissions").select("file_path").in("file_path", candidates);
  if (linkErr) throw new Error(`link re-check failed: ${linkErr.message}`);
  const removable = selectRemovableOrphans(candidates, (linked ?? []).map(r => r.file_path as string));
  if (!removable.length) return { found: candidates.length, removed: [] as string[] };
  const { error: rmErr } = await db.storage.from(BUCKET).remove(removable);
  if (rmErr) throw new Error(`orphan removal failed: ${rmErr.message}`);
  return { found: candidates.length, removed: removable };
}
