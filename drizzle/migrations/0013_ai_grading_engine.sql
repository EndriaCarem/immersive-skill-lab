-- Automated rubric grading (Etapa 2). One AI evaluation per submission, kept separate from human grading.
CREATE TABLE public.learning_ai_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL UNIQUE REFERENCES public.learning_submissions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  program_id text NOT NULL,
  activity_id text NOT NULL,
  attempt integer,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','extracting','evaluating','completed','failed','needs_human_review')),
  tries integer NOT NULL DEFAULT 0,
  lease_token uuid,
  lease_until timestamptz,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  rubric_snapshot jsonb,
  rubric_version text,
  model text,
  prompt_version text,
  extraction jsonb,
  criteria jsonb,
  overall_score numeric(4,2) CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 10)),
  overall_feedback text,
  ethics_note text,
  issue_code text,
  usage jsonb,
  gateway_request_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX learning_ai_evaluations_queue_idx ON public.learning_ai_evaluations (status, next_attempt_at);
CREATE INDEX learning_ai_evaluations_user_idx ON public.learning_ai_evaluations (user_id);

GRANT SELECT ON public.learning_ai_evaluations TO authenticated;
GRANT ALL ON public.learning_ai_evaluations TO service_role;
ALTER TABLE public.learning_ai_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "learner reads own ai evaluations" ON public.learning_ai_evaluations
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins read ai evaluations" ON public.learning_ai_evaluations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Job-wide circuit breaker (credits / policy denials). Written only by the service.
CREATE TABLE public.learning_ai_job_state (
  id text PRIMARY KEY,
  paused_reason text,
  paused_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.learning_ai_job_state TO authenticated;
GRANT ALL ON public.learning_ai_job_state TO service_role;
ALTER TABLE public.learning_ai_job_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read ai job state" ON public.learning_ai_job_state
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.learning_ai_job_state (id) VALUES ('grading') ON CONFLICT DO NOTHING;

-- Every new delivery is queued for automated grading in the same transaction.
CREATE OR REPLACE FUNCTION public.enqueue_learning_ai_evaluation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.learning_ai_evaluations (submission_id, user_id, program_id, activity_id, attempt)
  VALUES (NEW.id, NEW.user_id, NEW.program_id, NEW.activity_id, NEW.attempt)
  ON CONFLICT (submission_id) DO NOTHING;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enqueue_learning_ai_evaluation() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER learning_submissions_enqueue_ai
  AFTER INSERT ON public.learning_submissions
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_learning_ai_evaluation();

-- Lease-based claim: concurrent workers never process the same evaluation; expired leases are recovered.
CREATE OR REPLACE FUNCTION public.claim_learning_ai_evaluations(p_limit integer, p_lease_seconds integer, p_only uuid DEFAULT NULL)
RETURNS SETOF public.learning_ai_evaluations LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.learning_ai_evaluations
     SET status = 'failed', issue_code = 'processing_timeout', lease_token = NULL, lease_until = NULL, updated_at = now()
   WHERE status IN ('extracting','evaluating') AND lease_until < now() AND tries >= 3
     AND (p_only IS NULL OR id = p_only);
  RETURN QUERY
  UPDATE public.learning_ai_evaluations e
     SET status = 'extracting', tries = e.tries + 1, lease_token = gen_random_uuid(),
         lease_until = now() + make_interval(secs => GREATEST(30, LEAST(p_lease_seconds, 900))),
         started_at = COALESCE(e.started_at, now()), issue_code = NULL, updated_at = now()
   WHERE e.id IN (
     SELECT q.id FROM public.learning_ai_evaluations q
      WHERE (p_only IS NULL OR q.id = p_only) AND q.tries < 3
        AND ((q.status = 'pending' AND q.next_attempt_at <= now())
          OR (q.status IN ('extracting','evaluating') AND q.lease_until < now()))
      ORDER BY q.created_at
      LIMIT GREATEST(0, LEAST(p_limit, 5))
      FOR UPDATE SKIP LOCKED)
  RETURNING e.*;
END $$;
REVOKE ALL ON FUNCTION public.claim_learning_ai_evaluations(integer, integer, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_learning_ai_evaluations(integer, integer, uuid) TO service_role;

-- Administrators may send a failed or human-flagged evaluation back to the queue (does not create a new delivery).
CREATE OR REPLACE FUNCTION public.requeue_learning_ai_evaluation(p_evaluation uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso restrito à administração.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.learning_ai_evaluations
     SET status = 'pending', tries = 0, next_attempt_at = now(), lease_token = NULL, lease_until = NULL,
         issue_code = NULL, updated_at = now()
   WHERE id = p_evaluation AND status IN ('failed','needs_human_review');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Esta avaliação não pode ser reprocessada agora.' USING ERRCODE = 'P0001';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.requeue_learning_ai_evaluation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.requeue_learning_ai_evaluation(uuid) TO authenticated;