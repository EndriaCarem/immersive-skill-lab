CREATE TABLE public.webinars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  body_html text NOT NULL DEFAULT '',
  speaker text NOT NULL DEFAULT '',
  video_url text NOT NULL DEFAULT '',
  cover_url text NOT NULL DEFAULT '',
  starts_at timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.webinars TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webinars TO authenticated;
GRANT ALL ON public.webinars TO service_role;
ALTER TABLE public.webinars ENABLE ROW LEVEL SECURITY;
CREATE POLICY published_webinars ON public.webinars FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY admin_webinars ON public.webinars FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.webinar_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_id uuid NOT NULL REFERENCES public.webinars(id) ON DELETE CASCADE,
  ref text NOT NULL DEFAULT '',
  utm_source text NOT NULL DEFAULT '',
  utm_medium text NOT NULL DEFAULT '',
  utm_campaign text NOT NULL DEFAULT '',
  visitor_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX webinar_visits_webinar_idx ON public.webinar_visits (webinar_id, created_at);
GRANT SELECT ON public.webinar_visits TO authenticated;
GRANT ALL ON public.webinar_visits TO service_role;
ALTER TABLE public.webinar_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_webinar_visits ON public.webinar_visits FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));