-- Per-activity demand presentation (video, cover, accessible description, real duration) and simulated e-mail overrides.
ALTER TABLE public.learning_activity_staff
  ADD COLUMN IF NOT EXISTS video_path text CHECK (video_path IS NULL OR video_path ~ '^[A-Za-z0-9_-]{1,80}/[A-Za-z0-9_-]{1,80}/[0-9a-f-]{36}\.(mp4|webm|mov|m4v)$'),
  ADD COLUMN IF NOT EXISTS video_poster_path text CHECK (video_poster_path IS NULL OR video_poster_path ~ '^[A-Za-z0-9_-]{1,80}/[A-Za-z0-9_-]{1,80}/[0-9a-f-]{36}\.(jpg|png|webp)$'),
  ADD COLUMN IF NOT EXISTS video_description text NOT NULL DEFAULT '' CHECK (char_length(video_description) <= 1000),
  ADD COLUMN IF NOT EXISTS video_duration_seconds integer CHECK (video_duration_seconds IS NULL OR video_duration_seconds BETWEEN 1 AND 14400),
  ADD COLUMN IF NOT EXISTS mail_subject text NOT NULL DEFAULT '' CHECK (char_length(mail_subject) <= 200),
  ADD COLUMN IF NOT EXISTS mail_html text NOT NULL DEFAULT '' CHECK (char_length(mail_html) <= 20000),
  ADD COLUMN IF NOT EXISTS release_at timestamptz,
  ADD COLUMN IF NOT EXISTS release_offset_days integer CHECK (release_offset_days IS NULL OR release_offset_days BETWEEN 0 AND 365);
COMMENT ON COLUMN public.learning_activity_staff.mail_subject IS 'Empty = subject from learning_programs content.';
COMMENT ON COLUMN public.learning_activity_staff.mail_html IS 'Empty = demand body from learning_programs content. Rendered through the sanitizing Rich component.';
COMMENT ON COLUMN public.learning_activity_staff.release_at IS 'RESERVED for a future weekly release rule. NOT enforced anywhere until the pedagogical rule is approved.';
COMMENT ON COLUMN public.learning_activity_staff.release_offset_days IS 'RESERVED for a future weekly release rule (days after an approved reference date). NOT enforced anywhere until approved.';

-- Pre-delivery support library: case documents, annexes and delivery templates. Answer keys never live here.
CREATE TABLE public.learning_activity_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id text NOT NULL REFERENCES public.commerce_products(id) ON DELETE CASCADE,
  activity_id text NOT NULL CHECK (char_length(activity_id) BETWEEN 1 AND 80),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  doc_type text NOT NULL DEFAULT '' CHECK (char_length(doc_type) <= 60),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 600),
  category text NOT NULL CHECK (category IN ('case','annex','template')),
  version text NOT NULL DEFAULT '' CHECK (char_length(version) <= 40),
  file_path text NOT NULL UNIQUE CHECK (file_path ~ '^[A-Za-z0-9_-]{1,80}/[A-Za-z0-9_-]{1,80}/[0-9a-f-]{36}\.(pdf|docx?|xlsx?|pptx?|txt|jpg|png)$'),
  file_name text NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 255),
  file_size integer NOT NULL CHECK (file_size BETWEEN 1 AND 26214400),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX learning_activity_materials_activity ON public.learning_activity_materials (program_id, activity_id, position);
COMMENT ON TABLE public.learning_activity_materials IS 'Materials available BEFORE delivery only. Answer keys/reference answers stay in learning_answers (locked by delivery and pending review).';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_activity_materials TO authenticated;
GRANT ALL ON public.learning_activity_materials TO service_role;
ALTER TABLE public.learning_activity_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY activity_materials_admin ON public.learning_activity_materials FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY activity_materials_enrolled ON public.learning_activity_materials FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.commerce_enrollments e WHERE e.user_id = auth.uid() AND e.product_id = learning_activity_materials.program_id AND e.status = 'active' AND (e.expires_at IS NULL OR e.expires_at > now())));

-- Private media bucket: admins manage; enrolled learners read only files referenced for their course.
CREATE POLICY activity_media_admin_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'activity-media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY activity_media_admin_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'activity-media' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'activity-media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY activity_media_admin_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'activity-media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY activity_media_admin_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'activity-media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY activity_media_enrolled_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'activity-media'
    AND EXISTS (SELECT 1 FROM public.commerce_enrollments e WHERE e.user_id = auth.uid() AND e.product_id = (storage.foldername(storage.objects.name))[1] AND e.status = 'active' AND (e.expires_at IS NULL OR e.expires_at > now()))
    AND (EXISTS (SELECT 1 FROM public.learning_activity_materials m WHERE m.file_path = storage.objects.name)
      OR EXISTS (SELECT 1 FROM public.learning_activity_staff s WHERE s.video_path = storage.objects.name OR s.video_poster_path = storage.objects.name)));