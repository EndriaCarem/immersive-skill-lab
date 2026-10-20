CREATE TABLE public.interest_submissions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
 email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 255),
 interest text NOT NULL CHECK (char_length(interest) BETWEEN 1 AND 160),
 message text NOT NULL DEFAULT '' CHECK (char_length(message) <= 2000),
 source text NOT NULL CHECK (source IN ('interest','contact')),
 consent boolean NOT NULL CHECK (consent = true),
 consent_version text NOT NULL DEFAULT 'contact-v1',
 request_id uuid NOT NULL UNIQUE
);
GRANT ALL ON public.interest_submissions TO service_role;
REVOKE ALL ON public.interest_submissions FROM anon, authenticated;
ALTER TABLE public.interest_submissions ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.interest_submissions IS 'Private leads and contact messages. Server-only insertion; owner reads in Lovable Cloud until a protected owner area exists.';