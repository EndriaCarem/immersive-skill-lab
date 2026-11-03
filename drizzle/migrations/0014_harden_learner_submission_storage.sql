-- Tighten learner uploads: own folder, enrolled program, server-style generated name, PDF/DOC/DOCX only.
DROP POLICY IF EXISTS learning_file_insert ON storage.objects;
CREATE POLICY learning_file_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'learner-submissions'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND array_length(storage.foldername(name), 1) = 2
  AND name ~ ('^' || auth.uid()::text || '/[A-Za-z0-9_-]{1,80}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|doc|docx)$')
  AND EXISTS (SELECT 1 FROM public.commerce_enrollments e
    WHERE e.user_id = auth.uid() AND e.product_id = (storage.foldername(name))[2]
      AND e.status = 'active' AND (e.expires_at IS NULL OR e.expires_at > now()))
);
-- Explicit guard: nobody outside the service role may overwrite/move learner files.
DROP POLICY IF EXISTS learning_file_no_update ON storage.objects;
CREATE POLICY learning_file_no_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon, authenticated
  USING (bucket_id <> 'learner-submissions') WITH CHECK (bucket_id <> 'learner-submissions');

-- Service-only listing of learner files not linked to any registered delivery and older than the given age.
CREATE OR REPLACE FUNCTION public.list_orphan_learner_files(p_min_age_minutes integer, p_limit integer)
RETURNS TABLE(name text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, storage
AS $$
  SELECT o.name, o.created_at FROM storage.objects o
   WHERE o.bucket_id = 'learner-submissions'
     AND o.created_at < now() - make_interval(mins => GREATEST(p_min_age_minutes, 60))
     AND NOT EXISTS (SELECT 1 FROM public.learning_submissions s WHERE s.file_path = o.name)
   ORDER BY o.created_at
   LIMIT GREATEST(0, LEAST(p_limit, 100));
$$;
REVOKE ALL ON FUNCTION public.list_orphan_learner_files(integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_orphan_learner_files(integer, integer) TO service_role;