CREATE TABLE public.platform_terms (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version text NOT NULL UNIQUE CHECK(char_length(version) BETWEEN 1 AND 40), body text NOT NULL CHECK(char_length(body) BETWEEN 50 AND 50000), published boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT ON public.platform_terms TO authenticated; GRANT SELECT ON public.platform_terms TO anon; GRANT ALL ON public.platform_terms TO service_role;
ALTER TABLE public.platform_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_terms_public ON public.platform_terms FOR SELECT TO anon, authenticated USING(published);
CREATE POLICY platform_terms_admin_insert ON public.platform_terms FOR INSERT TO authenticated WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.account_legal_acceptances (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, terms_id uuid NOT NULL REFERENCES public.platform_terms(id), accepted_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,terms_id));
GRANT SELECT ON public.account_legal_acceptances TO authenticated; GRANT ALL ON public.account_legal_acceptances TO service_role;
ALTER TABLE public.account_legal_acceptances ENABLE ROW LEVEL SECURITY;
CREATE POLICY account_terms_read ON public.account_legal_acceptances FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.capture_signup_terms() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE term uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.platform_terms WHERE published) THEN RETURN NEW; END IF;
 BEGIN term := (NEW.raw_user_meta_data->>'platform_terms_id')::uuid; EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'Aceite os termos publicados da plataforma.'; END;
 IF term IS NULL OR NOT EXISTS(SELECT 1 FROM public.platform_terms WHERE id=term AND published) THEN RAISE EXCEPTION 'Aceite os termos publicados da plataforma.'; END IF;
 INSERT INTO public.account_legal_acceptances(user_id,terms_id) VALUES(NEW.id,term);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.capture_signup_terms() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER capture_empiria_signup_terms AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.capture_signup_terms();
CREATE TABLE public.learning_certificates (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text,'-',''), user_id uuid NOT NULL, program_id text NOT NULL REFERENCES public.learning_programs(id), student_name text NOT NULL, program_title text NOT NULL, grade numeric NOT NULL CHECK(grade BETWEEN 5 AND 10), activities jsonb NOT NULL, issued_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,program_id));
GRANT SELECT ON public.learning_certificates TO authenticated; GRANT ALL ON public.learning_certificates TO service_role;
ALTER TABLE public.learning_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY certificates_owner_read ON public.learning_certificates FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.issue_learning_certificate(p_user uuid,p_program text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p jsonb; a jsonb; score numeric; rows jsonb := '[]'::jsonb; total numeric := 0; n integer := 0; result text; student text;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('certificate:'||p_user::text||':'||p_program,0));
 SELECT code INTO result FROM public.learning_certificates WHERE user_id=p_user AND program_id=p_program;
 IF result IS NOT NULL THEN RETURN result; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.commerce_enrollments WHERE user_id=p_user AND product_id=p_program AND status='active' AND (expires_at IS NULL OR expires_at>now())) THEN RAISE EXCEPTION 'Matrícula inativa.'; END IF;
 SELECT content INTO p FROM public.learning_programs WHERE id=p_program;
 IF p IS NULL OR jsonb_array_length(p->'activities')=0 THEN RAISE EXCEPTION 'Curso sem atividades.'; END IF;
 IF EXISTS(SELECT 1 FROM public.learning_submissions WHERE user_id=p_user AND program_id=p_program AND voided_at IS NULL AND jsonb_array_length(human_reviews)>0 AND reviewed_at IS NULL) THEN RAISE EXCEPTION 'Aguarde a conclusão da revisão humana.'; END IF;
 FOR a IN SELECT value FROM jsonb_array_elements(p->'activities') LOOP
  SELECT max(CASE WHEN jsonb_typeof(s.grades)='array' AND jsonb_array_length(s.grades)>0 THEN (SELECT avg((g->>'score')::numeric) FROM jsonb_array_elements(s.grades) g) WHEN e.status='completed' THEN e.overall_score ELSE NULL END) INTO score FROM public.learning_submissions s LEFT JOIN public.learning_ai_evaluations e ON e.submission_id=s.id WHERE s.user_id=p_user AND s.program_id=p_program AND s.activity_id=a->>'id' AND s.voided_at IS NULL;
  IF score IS NULL OR score<5 THEN RAISE EXCEPTION 'Certificado requer nota mínima 5 em cada atividade.'; END IF;
  rows := rows || jsonb_build_array(jsonb_build_object('activityId',a->>'id','title',a->>'title','score',score,'passed',true)); total := total+score; n := n+1;
 END LOOP;
 SELECT full_name INTO student FROM public.profiles WHERE id=p_user;
 IF student IS NULL OR char_length(btrim(student))<2 THEN RAISE EXCEPTION 'Preencha seu nome na conta antes de emitir o certificado.'; END IF;
 INSERT INTO public.learning_certificates(user_id,program_id,student_name,program_title,grade,activities) VALUES(p_user,p_program,student,p->>'title',total/n,rows) RETURNING code INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.issue_learning_certificate(uuid,text) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.issue_learning_certificate(uuid,text) TO service_role;
CREATE FUNCTION public.verify_learning_certificate(p_code text) RETURNS TABLE(code text,student_name text,program_title text,grade numeric,activities jsonb,issued_at timestamptz) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT c.code,c.student_name,c.program_title,c.grade,c.activities,c.issued_at FROM public.learning_certificates c WHERE c.code=p_code AND char_length(p_code)=32 $$;
REVOKE ALL ON FUNCTION public.verify_learning_certificate(text) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.verify_learning_certificate(text) TO anon,authenticated,service_role;
CREATE TABLE public.learning_test_access_log (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), enrollment_id uuid NOT NULL REFERENCES public.commerce_enrollments(id), granted_by uuid NOT NULL, reason text NOT NULL CHECK(char_length(reason) BETWEEN 5 AND 500), previous_expiry timestamptz, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.learning_test_access_log TO authenticated; GRANT ALL ON public.learning_test_access_log TO service_role;
ALTER TABLE public.learning_test_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY test_access_admin_read ON public.learning_test_access_log FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.configure_learning_test_access(p_enrollment uuid,p_reason text) RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e public.commerce_enrollments; deadline timestamptz;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso restrito à administração.'; END IF;
 IF char_length(btrim(p_reason)) NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'Informe a autorização da turma de teste.'; END IF;
 SELECT * INTO e FROM public.commerce_enrollments WHERE id=p_enrollment FOR UPDATE;
 IF e.id IS NULL OR e.status<>'active' THEN RAISE EXCEPTION 'Matrícula ativa não encontrada.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.commerce_orders WHERE id=e.order_id AND total_cents=0 AND status='free') THEN RAISE EXCEPTION 'Somente matrículas gratuitas autorizadas para teste; matrículas pagas não são alteradas.'; END IF;
 deadline := e.enrolled_at + interval '6 months';
 INSERT INTO public.learning_test_access_log(enrollment_id,granted_by,reason,previous_expiry,expires_at) VALUES(e.id,auth.uid(),btrim(p_reason),e.expires_at,deadline);
 UPDATE public.commerce_enrollments SET expires_at=deadline WHERE id=e.id;
 RETURN deadline;
END $$;
REVOKE ALL ON FUNCTION public.configure_learning_test_access(uuid,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.configure_learning_test_access(uuid,text) TO authenticated;