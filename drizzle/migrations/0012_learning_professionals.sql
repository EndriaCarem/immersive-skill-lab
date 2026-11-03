CREATE TABLE public.learning_professionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (char_length(btrim(full_name)) BETWEEN 2 AND 160),
  title text NOT NULL DEFAULT '' CHECK (char_length(title) <= 200),
  specialty text NOT NULL DEFAULT '' CHECK (char_length(specialty) <= 200),
  bio text NOT NULL DEFAULT '' CHECK (char_length(bio) <= 2000),
  photo_path text CHECK (photo_path IS NULL OR photo_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'),
  active boolean NOT NULL DEFAULT true,
  display_authorized boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX learning_professionals_name_unique ON public.learning_professionals (lower(btrim(full_name)));
COMMENT ON COLUMN public.learning_professionals.display_authorized IS 'Only rows with active AND display_authorized are visible outside administration.';

CREATE TABLE public.learning_course_professionals (
  program_id text NOT NULL REFERENCES public.commerce_products(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.learning_professionals(id) ON DELETE CASCADE,
  is_lead boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  PRIMARY KEY (program_id, professional_id)
);
CREATE UNIQUE INDEX learning_course_one_lead ON public.learning_course_professionals (program_id) WHERE is_lead;

CREATE TABLE public.learning_activity_staff (
  program_id text NOT NULL REFERENCES public.commerce_products(id) ON DELETE CASCADE,
  activity_id text NOT NULL CHECK (char_length(activity_id) BETWEEN 1 AND 80),
  supervisor_id uuid REFERENCES public.learning_professionals(id) ON DELETE SET NULL,
  feedback_professional_id uuid REFERENCES public.learning_professionals(id) ON DELETE SET NULL,
  demand_video_url text NOT NULL DEFAULT '' CHECK (demand_video_url = '' OR (demand_video_url ~ '^https://' AND char_length(demand_video_url) <= 500)),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (program_id, activity_id)
);

GRANT SELECT ON public.learning_professionals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_professionals TO authenticated;
GRANT ALL ON public.learning_professionals TO service_role;
GRANT SELECT ON public.learning_course_professionals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_course_professionals TO authenticated;
GRANT ALL ON public.learning_course_professionals TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_activity_staff TO authenticated;
GRANT ALL ON public.learning_activity_staff TO service_role;

ALTER TABLE public.learning_professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_course_professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_activity_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY professionals_admin ON public.learning_professionals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY professionals_visible ON public.learning_professionals FOR SELECT TO anon, authenticated
  USING (active AND display_authorized);

CREATE POLICY course_professionals_admin ON public.learning_course_professionals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY course_professionals_visible ON public.learning_course_professionals FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.learning_professionals p WHERE p.id = professional_id AND p.active AND p.display_authorized));

CREATE POLICY activity_staff_admin ON public.learning_activity_staff FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY activity_staff_enrolled ON public.learning_activity_staff FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.commerce_enrollments e WHERE e.user_id = auth.uid() AND e.product_id = learning_activity_staff.program_id AND e.status = 'active' AND (e.expires_at IS NULL OR e.expires_at > now())));

CREATE OR REPLACE FUNCTION public.touch_learning_staff() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
CREATE TRIGGER learning_professionals_touch BEFORE UPDATE ON public.learning_professionals FOR EACH ROW EXECUTE FUNCTION public.touch_learning_staff();
CREATE TRIGGER learning_activity_staff_touch BEFORE UPDATE ON public.learning_activity_staff FOR EACH ROW EXECUTE FUNCTION public.touch_learning_staff();

CREATE POLICY professional_photo_admin_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'professional-photos' AND public.has_role(auth.uid(), 'admin') AND lower(storage.extension(name)) IN ('jpg','png','webp'));
CREATE POLICY professional_photo_admin_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'professional-photos' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'professional-photos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY professional_photo_admin_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'professional-photos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY professional_photo_admin_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'professional-photos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY professional_photo_visible_read ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'professional-photos' AND EXISTS (SELECT 1 FROM public.learning_professionals p WHERE p.photo_path = storage.objects.name AND p.active AND p.display_authorized));