REVOKE UPDATE ON public.commerce_terms FROM authenticated;
DROP POLICY admin_terms ON public.commerce_terms;
CREATE POLICY admin_terms_read ON public.commerce_terms FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE POLICY admin_terms_insert ON public.commerce_terms FOR INSERT TO authenticated WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.immutable_published_terms() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF OLD.published AND (NEW.body IS DISTINCT FROM OLD.body OR NEW.version IS DISTINCT FROM OLD.version OR NEW.published IS DISTINCT FROM OLD.published) THEN RAISE EXCEPTION 'Termos publicados são imutáveis; publique uma nova versão.'; END IF; RETURN NEW; END $$;
CREATE TRIGGER immutable_terms BEFORE UPDATE ON public.commerce_terms FOR EACH ROW EXECUTE FUNCTION public.immutable_published_terms();