-- Etapa 4: Nidia, the in-room assistant. Logically separate from automated grading.
CREATE TABLE public.learning_assistant_config (
  id text PRIMARY KEY CHECK (id = 'default'),
  default_question_limit integer NOT NULL DEFAULT 3 CHECK (default_question_limit BETWEEN 2 AND 5),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.learning_assistant_config IS 'Provisional default of 3 questions per learner per activity until pedagogical approval; admins may change it (2-5).';
GRANT SELECT, UPDATE ON public.learning_assistant_config TO authenticated;
GRANT ALL ON public.learning_assistant_config TO service_role;
ALTER TABLE public.learning_assistant_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY assistant_config_admin_read ON public.learning_assistant_config FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY assistant_config_admin_update ON public.learning_assistant_config FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.learning_assistant_config (id) VALUES ('default') ON CONFLICT DO NOTHING;

CREATE TABLE public.learning_assistant_settings (
  program_id text NOT NULL REFERENCES public.commerce_products(id) ON DELETE CASCADE,
  activity_id text NOT NULL CHECK (char_length(activity_id) BETWEEN 1 AND 80),
  enabled boolean NOT NULL DEFAULT true,
  question_limit integer CHECK (question_limit IS NULL OR question_limit BETWEEN 2 AND 5),
  teacher_guidance text NOT NULL DEFAULT '' CHECK (char_length(teacher_guidance) <= 4000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (program_id, activity_id)
);
COMMENT ON COLUMN public.learning_assistant_settings.question_limit IS 'NULL = learning_assistant_config.default_question_limit.';
COMMENT ON COLUMN public.learning_assistant_settings.teacher_guidance IS 'Optional faculty guidance sent to the assistant only; never shown to learners. Empty = none.';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_assistant_settings TO authenticated;
GRANT ALL ON public.learning_assistant_settings TO service_role;
ALTER TABLE public.learning_assistant_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY assistant_settings_admin ON public.learning_assistant_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.learning_assistant_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  program_id text NOT NULL REFERENCES public.learning_programs(id) ON DELETE CASCADE,
  activity_id text NOT NULL CHECK (char_length(activity_id) BETWEEN 1 AND 80),
  question text NOT NULL CHECK (char_length(question) BETWEEN 1 AND 600),
  answer text CHECK (answer IS NULL OR char_length(answer) <= 4000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','answered','failed')),
  issue_code text,
  model text,
  prompt_version text,
  usage jsonb,
  gateway_request_id text,
  lease_until timestamptz NOT NULL DEFAULT (now() + interval '2 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  answered_at timestamptz
);
CREATE INDEX learning_assistant_questions_thread ON public.learning_assistant_questions (user_id, program_id, activity_id, created_at);
COMMENT ON TABLE public.learning_assistant_questions IS 'One row per learner question. Only status=answered consumes quota; rows are written by reserve_learning_assistant_question and the service role.';
GRANT SELECT ON public.learning_assistant_questions TO authenticated;
GRANT ALL ON public.learning_assistant_questions TO service_role;
ALTER TABLE public.learning_assistant_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY assistant_questions_own_read ON public.learning_assistant_questions FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY assistant_questions_admin_read ON public.learning_assistant_questions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Effective state for the caller: enrollment, progression, enablement, limit and consumed questions.
CREATE OR REPLACE FUNCTION public.learning_assistant_state(p_program text, p_activity text)
RETURNS TABLE(available boolean, reason text, enabled boolean, question_limit integer, used integer, pending boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); p jsonb; idx integer; en boolean := true; lim integer; dflt integer;
BEGIN
  SELECT c.default_question_limit INTO dflt FROM public.learning_assistant_config c WHERE c.id = 'default';
  dflt := COALESCE(dflt, 3);
  IF uid IS NULL THEN RETURN QUERY SELECT false, 'auth', false, dflt, 0, false; RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.commerce_enrollments e WHERE e.user_id = uid AND e.product_id = p_program AND e.status = 'active' AND (e.expires_at IS NULL OR e.expires_at > now())) THEN
    RETURN QUERY SELECT false, 'not_enrolled', false, dflt, 0, false; RETURN;
  END IF;
  SELECT content INTO p FROM public.learning_programs WHERE id = p_program;
  SELECT ord::integer INTO idx FROM jsonb_array_elements(p->'activities') WITH ORDINALITY a(v, ord) WHERE v->>'id' = p_activity;
  IF idx IS NULL THEN RETURN QUERY SELECT false, 'invalid_activity', false, dflt, 0, false; RETURN; END IF;
  SELECT s.enabled, COALESCE(s.question_limit, dflt) INTO en, lim FROM public.learning_assistant_settings s WHERE s.program_id = p_program AND s.activity_id = p_activity;
  en := COALESCE(en, true); lim := COALESCE(lim, dflt);
  IF idx > 1 AND NOT EXISTS (SELECT 1 FROM public.learning_submissions WHERE user_id = uid AND program_id = p_program AND activity_id = p->'activities'->(idx-2)->>'id') THEN
    RETURN QUERY SELECT false, 'locked', en, lim, 0, false; RETURN;
  END IF;
  RETURN QUERY SELECT en, CASE WHEN en THEN NULL ELSE 'disabled' END, en, lim,
    (SELECT count(*)::integer FROM public.learning_assistant_questions q WHERE q.user_id = uid AND q.program_id = p_program AND q.activity_id = p_activity AND q.status = 'answered'),
    EXISTS (SELECT 1 FROM public.learning_assistant_questions q WHERE q.user_id = uid AND q.program_id = p_program AND q.activity_id = p_activity AND q.status = 'pending' AND q.lease_until >= now());
END $$;
REVOKE ALL ON FUNCTION public.learning_assistant_state(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.learning_assistant_state(text, text) TO authenticated;

-- Reserves one question under a per-learner/activity advisory lock: one in flight at a time, never above the limit.
CREATE OR REPLACE FUNCTION public.reserve_learning_assistant_question(p_program text, p_activity text, p_question text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); q text := btrim(coalesce(p_question, '')); st record; recent integer; new_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'nidia:auth'; END IF;
  IF char_length(q) < 1 OR char_length(q) > 600 THEN RAISE EXCEPTION 'nidia:invalid'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('nidia:' || uid::text || ':' || p_program || ':' || p_activity, 0));
  UPDATE public.learning_assistant_questions SET status = 'failed', issue_code = 'abandoned'
   WHERE user_id = uid AND program_id = p_program AND activity_id = p_activity AND status = 'pending' AND lease_until < now();
  SELECT * INTO st FROM public.learning_assistant_state(p_program, p_activity);
  IF NOT st.available THEN RAISE EXCEPTION 'nidia:%', st.reason; END IF;
  IF st.pending THEN RAISE EXCEPTION 'nidia:busy'; END IF;
  IF st.used >= st.question_limit THEN RAISE EXCEPTION 'nidia:limit'; END IF;
  SELECT count(*) INTO recent FROM public.learning_assistant_questions WHERE user_id = uid AND created_at > now() - interval '1 minute';
  IF recent >= 4 THEN RAISE EXCEPTION 'nidia:rate'; END IF;
  INSERT INTO public.learning_assistant_questions (user_id, program_id, activity_id, question)
  VALUES (uid, p_program, p_activity, q) RETURNING id INTO new_id;
  RETURN new_id;
END $$;
REVOKE ALL ON FUNCTION public.reserve_learning_assistant_question(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_learning_assistant_question(text, text, text) TO authenticated;