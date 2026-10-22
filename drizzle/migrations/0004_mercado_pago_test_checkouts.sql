CREATE TABLE public.commerce_payment_tests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL REFERENCES public.commerce_orders(id),
 user_id uuid NOT NULL REFERENCES public.profiles(id),
 amount_cents integer NOT NULL CHECK (amount_cents > 0),
 method text NOT NULL CHECK (method IN ('pix','boleto','card')),
 installments integer NOT NULL CHECK (installments BETWEEN 1 AND 6),
 preference_id text UNIQUE,
 checkout_url text,
 payment_id text UNIQUE,
 status text NOT NULL DEFAULT 'creating' CHECK (status IN ('creating','ready','pending','approved','rejected','cancelled','refunded','charged_back','in_process','in_mediation','authorized')),
 created_at timestamptz NOT NULL DEFAULT now(),
 checked_at timestamptz,
 UNIQUE(order_id)
);
GRANT SELECT ON public.commerce_payment_tests TO authenticated;
GRANT ALL ON public.commerce_payment_tests TO service_role;
ALTER TABLE public.commerce_payment_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners and admins read payment tests" ON public.commerce_payment_tests FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
COMMENT ON TABLE public.commerce_payment_tests IS 'Mercado Pago test attempts only: never change commercial order status or create real enrollments.';