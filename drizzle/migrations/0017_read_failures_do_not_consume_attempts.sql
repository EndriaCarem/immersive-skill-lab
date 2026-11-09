ALTER TABLE public.learning_submissions ADD COLUMN IF NOT EXISTS voided_at timestamptz;
ALTER TABLE public.learning_submissions ADD COLUMN IF NOT EXISTS void_reason text;
COMMENT ON COLUMN public.learning_submissions.voided_at IS 'Set by the grading worker when the file could not be read for technical reasons; the delivery stays in history but does not count as an attempt, opens no answer key and uses no review.';

CREATE OR REPLACE FUNCTION public.enforce_learning_submission_attempts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE used integer;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.attempt := OLD.attempt;
    RETURN NEW;
  END IF;
  NEW.voided_at := NULL;
  NEW.void_reason := NULL;
  PERFORM pg_advisory_xact_lock(hashtextextended('learning_attempt:' || NEW.user_id::text || ':' || NEW.program_id || ':' || NEW.activity_id, 0));
  SELECT count(*) INTO used FROM public.learning_submissions
   WHERE user_id = NEW.user_id AND program_id = NEW.program_id AND activity_id = NEW.activity_id AND voided_at IS NULL;
  IF used >= 2 THEN
    RAISE EXCEPTION 'Limite de 2 tentativas atingido para esta atividade.'
      USING ERRCODE = 'check_violation', HINT = 'learning_attempt_limit';
  END IF;
  NEW.attempt := used + 1;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_learning_submission_attempts() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS learning_answer_read ON public.learning_answers;
CREATE POLICY learning_answer_read ON public.learning_answers FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
  OR (
    EXISTS (SELECT 1 FROM public.commerce_enrollments e
      WHERE e.user_id = auth.uid() AND e.product_id = learning_answers.program_id
        AND e.status = 'active' AND (e.expires_at IS NULL OR e.expires_at > now()))
    AND EXISTS (SELECT 1 FROM public.learning_submissions s
      WHERE s.user_id = auth.uid() AND s.program_id = learning_answers.program_id
        AND s.activity_id = learning_answers.activity_id AND s.voided_at IS NULL)
    AND NOT EXISTS (SELECT 1 FROM public.learning_submissions p
      WHERE p.user_id = auth.uid() AND p.program_id = learning_answers.program_id
        AND p.activity_id = learning_answers.activity_id
        AND jsonb_array_length(p.human_reviews) > 0 AND p.reviewed_at IS NULL)
  )
);

CREATE OR REPLACE FUNCTION public.request_learning_review(p_submission uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.learning_submissions; used integer;
BEGIN
SELECT * INTO s FROM public.learning_submissions WHERE id=p_submission AND user_id=auth.uid();
IF s.id IS NULL THEN RAISE EXCEPTION 'Entrega não encontrada'; END IF;
IF s.voided_at IS NOT NULL THEN RAISE EXCEPTION 'Esta entrega não pôde ser lida; envie novamente.'; END IF;
PERFORM pg_advisory_xact_lock(hashtextextended(s.user_id::text||s.program_id,0));
IF NOT EXISTS(SELECT 1 FROM public.commerce_enrollments WHERE user_id=auth.uid() AND product_id=s.program_id AND status='active' AND (expires_at IS NULL OR expires_at>now())) THEN RAISE EXCEPTION 'Matrícula inativa'; END IF;
SELECT count(DISTINCT activity_id) INTO used FROM public.learning_submissions WHERE user_id=auth.uid() AND program_id=s.program_id AND jsonb_array_length(human_reviews)>0;
IF EXISTS(SELECT 1 FROM public.learning_submissions WHERE user_id=auth.uid() AND program_id=s.program_id AND activity_id=s.activity_id AND jsonb_array_length(human_reviews)>0) OR used>=2 THEN RAISE EXCEPTION 'Limite de revisões atingido'; END IF;
UPDATE public.learning_submissions SET human_reviews=jsonb_build_array(now()),reviewed_at=NULL WHERE id=s.id;
END $$;
REVOKE ALL ON FUNCTION public.request_learning_review(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.request_learning_review(uuid) TO authenticated;