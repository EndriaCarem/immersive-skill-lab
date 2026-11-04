-- Additive: interrupted gradings (worker cut off mid-run) go back to the queue without spending a processing try.
ALTER TABLE public.learning_ai_evaluations ADD COLUMN IF NOT EXISTS interruptions integer NOT NULL DEFAULT 0;

-- Releases expired leases. The try that was interrupted is refunded; after 5 interruptions the row
-- stops looping and waits for an administrator (failed / processing_timeout), never stuck "em processamento".
CREATE OR REPLACE FUNCTION public.recover_expired_ai_leases()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  UPDATE public.learning_ai_evaluations
     SET status = CASE WHEN interruptions + 1 >= 5 THEN 'failed' ELSE 'pending' END,
         issue_code = CASE WHEN interruptions + 1 >= 5 THEN 'processing_timeout' ELSE 'interrupted' END,
         tries = GREATEST(0, tries - 1), interruptions = interruptions + 1,
         lease_token = NULL, lease_until = NULL, next_attempt_at = now(), updated_at = now()
   WHERE status IN ('extracting','evaluating') AND lease_until < now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.recover_expired_ai_leases() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recover_expired_ai_leases() TO service_role;

CREATE OR REPLACE FUNCTION public.claim_learning_ai_evaluations(p_limit integer, p_lease_seconds integer, p_only uuid DEFAULT NULL)
RETURNS SETOF public.learning_ai_evaluations LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.recover_expired_ai_leases();
  RETURN QUERY
  UPDATE public.learning_ai_evaluations e
     SET status = 'extracting', tries = e.tries + 1, lease_token = gen_random_uuid(),
         lease_until = now() + make_interval(secs => GREATEST(30, LEAST(p_lease_seconds, 900))),
         started_at = COALESCE(e.started_at, now()), issue_code = NULL, updated_at = now()
   WHERE e.id IN (
     SELECT q.id FROM public.learning_ai_evaluations q
      WHERE (p_only IS NULL OR q.id = p_only) AND q.tries < 3
        AND q.status = 'pending' AND q.next_attempt_at <= now()
      ORDER BY q.created_at
      LIMIT GREATEST(0, LEAST(p_limit, 5))
      FOR UPDATE SKIP LOCKED)
  RETURNING e.*;
END $$;
REVOKE ALL ON FUNCTION public.claim_learning_ai_evaluations(integer, integer, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_learning_ai_evaluations(integer, integer, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.requeue_learning_ai_evaluation(p_evaluation uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso restrito à administração.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.learning_ai_evaluations
     SET status = 'pending', tries = 0, interruptions = 0, next_attempt_at = now(), lease_token = NULL, lease_until = NULL,
         issue_code = NULL, updated_at = now()
   WHERE id = p_evaluation AND status IN ('failed','needs_human_review');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Esta avaliação não pode ser reprocessada agora.' USING ERRCODE = 'P0001';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.requeue_learning_ai_evaluation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.requeue_learning_ai_evaluation(uuid) TO authenticated;