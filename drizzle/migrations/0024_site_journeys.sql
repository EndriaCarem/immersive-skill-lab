CREATE TABLE public.site_page_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id uuid NOT NULL,
  user_id uuid,
  path text NOT NULL CHECK (char_length(path) <= 300),
  section text NOT NULL DEFAULT '' CHECK (char_length(section) <= 40),
  referrer_host text NOT NULL DEFAULT '' CHECK (char_length(referrer_host) <= 120),
  first_source text NOT NULL DEFAULT '' CHECK (char_length(first_source) <= 120),
  first_medium text NOT NULL DEFAULT '' CHECK (char_length(first_medium) <= 80),
  first_campaign text NOT NULL DEFAULT '' CHECK (char_length(first_campaign) <= 80),
  first_landing text NOT NULL DEFAULT '' CHECK (char_length(first_landing) <= 300),
  device text NOT NULL DEFAULT '' CHECK (char_length(device) <= 20),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX site_page_visits_created_idx ON public.site_page_visits (created_at DESC);
CREATE INDEX site_page_visits_visitor_idx ON public.site_page_visits (visitor_id);
CREATE INDEX site_page_visits_user_idx ON public.site_page_visits (user_id);
GRANT SELECT ON public.site_page_visits TO authenticated;
GRANT ALL ON public.site_page_visits TO service_role;
ALTER TABLE public.site_page_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read page visits" ON public.site_page_visits FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));