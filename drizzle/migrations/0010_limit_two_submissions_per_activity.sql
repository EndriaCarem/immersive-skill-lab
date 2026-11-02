ALTER TABLE public.learning_submissions ADD COLUMN IF NOT EXISTS attempt integer;

-- Backfill: number existing rows per student/program/activity without altering or deleting them.
UPDATE public.learning_submissions s SET attempt = r.n
FROM (SELECT id, row_number() OVER (PARTITION BY user_id, program_id, activity_id ORDER BY submitted_at, id) AS n FROM public.learning_submissions) r
WHERE r.id = s.id AND s.attempt IS NULL;

COMMENT ON COLUMN public.learning_submissions.attempt IS 'Attempt number assigned by the database (1 or 2). Legacy rows may exceed 2 and are preserved; the limit then counts as reached.';

CREATE OR REPLACE FUNCTION public.enforce_learning_submission_attempts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE used integer;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.attempt := OLD.attempt;
    RETURN NEW;
  END IF;
  -- Serialize concurrent inserts for the same student + program + activity until commit.
  PERFORM pg_advisory_xact_lock(hashtextextended('learning_attempt:' || NEW.user_id::text || ':' || NEW.program_id || ':' || NEW.activity_id, 0));
  SELECT count(*) INTO used FROM public.learning_submissions
   WHERE user_id = NEW.user_id AND program_id = NEW.program_id AND activity_id = NEW.activity_id;
  IF used >= 2 THEN
    RAISE EXCEPTION 'Limite de 2 tentativas atingido para esta atividade.'
      USING ERRCODE = 'check_violation', HINT = 'learning_attempt_limit';
  END IF;
  NEW.attempt := used + 1;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.enforce_learning_submission_attempts() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_learning_submission_attempts ON public.learning_submissions;
CREATE TRIGGER enforce_learning_submission_attempts
BEFORE INSERT OR UPDATE ON public.learning_submissions
FOR EACH ROW EXECUTE FUNCTION public.enforce_learning_submission_attempts();