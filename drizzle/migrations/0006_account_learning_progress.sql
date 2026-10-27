CREATE TABLE public.learning_programs (id text PRIMARY KEY REFERENCES public.commerce_products(id), content jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.learning_programs TO authenticated; GRANT ALL ON public.learning_programs TO service_role;
ALTER TABLE public.learning_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY learning_program_read ON public.learning_programs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.commerce_enrollments e WHERE e.user_id=auth.uid() AND e.product_id=learning_programs.id AND e.status='active' AND (e.expires_at IS NULL OR e.expires_at>now())));
CREATE TABLE public.learning_submissions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(), program_id text NOT NULL REFERENCES public.learning_programs(id), activity_id text NOT NULL, file_name text NOT NULL, file_size integer NOT NULL, file_path text NOT NULL UNIQUE, ai_use text NOT NULL DEFAULT 'Não declarado', submitted_at timestamptz NOT NULL DEFAULT now(), grades jsonb, teacher_comment text, reviewer_id uuid, human_reviews jsonb NOT NULL DEFAULT '[]', reviewed_at timestamptz);
GRANT SELECT, INSERT, UPDATE ON public.learning_submissions TO authenticated; GRANT ALL ON public.learning_submissions TO service_role;
ALTER TABLE public.learning_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY learning_sub_read ON public.learning_submissions FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY learning_sub_insert ON public.learning_submissions FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid() AND grades IS NULL AND reviewer_id IS NULL AND teacher_comment IS NULL AND reviewed_at IS NULL AND human_reviews='[]'::jsonb AND EXISTS(SELECT 1 FROM public.commerce_enrollments e WHERE e.user_id=auth.uid() AND e.product_id=program_id AND e.status='active' AND (e.expires_at IS NULL OR e.expires_at>now())));
CREATE POLICY learning_sub_grade ON public.learning_submissions FOR UPDATE TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE INDEX learning_sub_owner ON public.learning_submissions(user_id,program_id,submitted_at);
CREATE TABLE public.learning_notes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(), program_id text NOT NULL REFERENCES public.learning_programs(id), activity_id text NOT NULL, text text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT ON public.learning_notes TO authenticated; GRANT ALL ON public.learning_notes TO service_role;
ALTER TABLE public.learning_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY learning_notes_read ON public.learning_notes FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY learning_notes_insert ON public.learning_notes FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.commerce_enrollments e WHERE e.user_id=auth.uid() AND e.product_id=program_id AND e.status='active' AND (e.expires_at IS NULL OR e.expires_at>now())));
CREATE FUNCTION public.validate_learning_submission() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE p jsonb; idx integer;
BEGIN
SELECT content INTO p FROM public.learning_programs WHERE id=NEW.program_id;
SELECT ord::integer INTO idx FROM jsonb_array_elements(p->'activities') WITH ORDINALITY a(v,ord) WHERE v->>'id'=NEW.activity_id;
IF idx IS NULL THEN RAISE EXCEPTION 'Atividade inválida'; END IF;
IF TG_OP='INSERT' THEN
IF NEW.file_size<1 OR NEW.file_size>10485760 OR NEW.file_name !~* '\.(pdf|docx?)$' OR NEW.file_path NOT LIKE NEW.user_id::text||'/'||NEW.program_id||'/%' THEN RAISE EXCEPTION 'Arquivo inválido'; END IF;
IF idx>1 AND NOT EXISTS(SELECT 1 FROM public.learning_submissions WHERE user_id=NEW.user_id AND program_id=NEW.program_id AND activity_id=p->'activities'->(idx-2)->>'id') THEN RAISE EXCEPTION 'Entregue a atividade anterior primeiro'; END IF;
ELSE
IF NEW.user_id<>OLD.user_id OR NEW.program_id<>OLD.program_id OR NEW.activity_id<>OLD.activity_id OR NEW.file_path<>OLD.file_path OR NEW.submitted_at<>OLD.submitted_at THEN RAISE EXCEPTION 'Entrega imutável'; END IF;
END IF;
IF NEW.grades IS NOT NULL AND (jsonb_typeof(NEW.grades)<>'array' OR jsonb_array_length(NEW.grades)<>jsonb_array_length(p->'activities'->(idx-1)->'rubric') OR EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.grades) g WHERE (g->>'score')::numeric NOT BETWEEN 0 AND 10 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p->'activities'->(idx-1)->'rubric') r WHERE r->>'criterion'=g->>'criterion')) OR (SELECT count(DISTINCT g->>'criterion') FROM jsonb_array_elements(NEW.grades) g)<>jsonb_array_length(NEW.grades)) THEN RAISE EXCEPTION 'Rubrica inválida'; END IF;
RETURN NEW;
END $$;
CREATE TRIGGER validate_learning_submission BEFORE INSERT OR UPDATE ON public.learning_submissions FOR EACH ROW EXECUTE FUNCTION public.validate_learning_submission();
CREATE FUNCTION public.request_learning_review(p_submission uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.learning_submissions; used integer;
BEGIN
SELECT * INTO s FROM public.learning_submissions WHERE id=p_submission AND user_id=auth.uid();
IF s.id IS NULL THEN RAISE EXCEPTION 'Entrega não encontrada'; END IF;
PERFORM pg_advisory_xact_lock(hashtextextended(s.user_id::text||s.program_id,0));
IF NOT EXISTS(SELECT 1 FROM public.commerce_enrollments WHERE user_id=auth.uid() AND product_id=s.program_id AND status='active' AND (expires_at IS NULL OR expires_at>now())) THEN RAISE EXCEPTION 'Matrícula inativa'; END IF;
SELECT count(DISTINCT activity_id) INTO used FROM public.learning_submissions WHERE user_id=auth.uid() AND program_id=s.program_id AND jsonb_array_length(human_reviews)>0;
IF EXISTS(SELECT 1 FROM public.learning_submissions WHERE user_id=auth.uid() AND program_id=s.program_id AND activity_id=s.activity_id AND jsonb_array_length(human_reviews)>0) OR used>=2 THEN RAISE EXCEPTION 'Limite de revisões atingido'; END IF;
UPDATE public.learning_submissions SET human_reviews=jsonb_build_array(now()),reviewed_at=NULL WHERE id=s.id;
END $$;
REVOKE ALL ON FUNCTION public.request_learning_review(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.request_learning_review(uuid) TO authenticated;
CREATE POLICY learning_file_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='learner-submissions' AND (storage.foldername(name))[1]=auth.uid()::text AND EXISTS(SELECT 1 FROM public.commerce_enrollments WHERE user_id=auth.uid() AND product_id=(storage.foldername(name))[2] AND status='active' AND (expires_at IS NULL OR expires_at>now())));
CREATE POLICY learning_file_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='learner-submissions' AND ((storage.foldername(name))[1]=auth.uid()::text OR public.has_role(auth.uid(),'admin')));
CREATE POLICY learning_file_cleanup ON storage.objects FOR DELETE TO authenticated USING(bucket_id='learner-submissions' AND (storage.foldername(name))[1]=auth.uid()::text AND NOT EXISTS(SELECT 1 FROM public.learning_submissions WHERE file_path=name));