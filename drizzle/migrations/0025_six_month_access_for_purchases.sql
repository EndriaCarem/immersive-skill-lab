CREATE OR REPLACE FUNCTION public.commerce_enrollment_default_access()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  -- Every purchase (paid or free order) grants six months of access from the enrollment date.
  -- Only new enrollments or re-enrollments get the default; existing rows and explicit deadlines are untouched.
  IF NEW.order_id IS NOT NULL AND NEW.status = 'active' AND NEW.expires_at IS NULL
     AND (TG_OP = 'INSERT' OR NEW.enrolled_at IS DISTINCT FROM OLD.enrolled_at OR NEW.order_id IS DISTINCT FROM OLD.order_id) THEN
    NEW.expires_at := COALESCE(NEW.enrolled_at, now()) + interval '6 months';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.commerce_enrollment_default_access() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS commerce_enrollment_default_access ON public.commerce_enrollments;
CREATE TRIGGER commerce_enrollment_default_access
  BEFORE INSERT OR UPDATE ON public.commerce_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.commerce_enrollment_default_access();