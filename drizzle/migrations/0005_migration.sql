ALTER TABLE public.commerce_payment_tests ADD COLUMN IF NOT EXISTS live boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.apply_commerce_payment(p_order uuid, p_status text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_order public.commerce_orders%ROWTYPE; v_new text;
BEGIN
  SELECT * INTO v_order FROM public.commerce_orders WHERE id = p_order FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado.'; END IF;
  IF v_order.status IN ('free','cancelled','cancellation_requested') THEN RETURN v_order.status; END IF;
  v_new := CASE
    WHEN p_status = 'approved' THEN 'paid'
    WHEN p_status IN ('pending','in_process','authorized','in_mediation') THEN CASE WHEN v_order.status = 'paid' THEN 'paid' ELSE 'pending' END
    WHEN p_status IN ('refunded','charged_back') THEN 'refunded'
    WHEN p_status IN ('rejected','cancelled') THEN CASE WHEN v_order.status = 'paid' THEN 'paid' ELSE 'rejected' END
    ELSE v_order.status END;
  UPDATE public.commerce_orders SET status = v_new WHERE id = p_order;
  IF v_new = 'paid' THEN
    INSERT INTO public.commerce_enrollments(user_id, product_id, order_id)
      SELECT v_order.user_id, product_id, p_order FROM public.commerce_order_items WHERE order_id = p_order
      ON CONFLICT (user_id, product_id) DO UPDATE SET order_id = EXCLUDED.order_id, status = 'active', enrolled_at = now(), expires_at = NULL;
  ELSIF v_new = 'refunded' THEN
    UPDATE public.commerce_enrollments SET status = 'cancelled' WHERE order_id = p_order;
  END IF;
  RETURN v_new;
END $$;
REVOKE ALL ON FUNCTION public.apply_commerce_payment(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_commerce_payment(uuid, text) TO service_role;