CREATE OR REPLACE FUNCTION public.save_activity_rubric(p_program text, p_activity text, p_updated_at timestamptz, p_criteria jsonb)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_content jsonb; v_updated timestamptz; v_index integer; v_old jsonb; v_new_time timestamptz;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Acesso restrito à administração.'; END IF;
 IF jsonb_typeof(p_criteria) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Rubrica inválida.'; END IF;
 IF jsonb_array_length(p_criteria) NOT BETWEEN 1 AND 30 THEN RAISE EXCEPTION 'Rubrica inválida.'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_criteria) c WHERE jsonb_typeof(c->'criterion') IS DISTINCT FROM 'string' OR char_length(btrim(c->>'criterion')) NOT BETWEEN 1 AND 200 OR jsonb_typeof(c->'description') IS DISTINCT FROM 'string' OR char_length(btrim(c->>'description')) NOT BETWEEN 1 AND 4000 OR jsonb_typeof(c->'weight') IS DISTINCT FROM 'number') THEN RAISE EXCEPTION 'Preencha nome, descrição e peso de cada critério.'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_criteria) c WHERE (c->>'weight')::numeric <= 0) OR (SELECT count(DISTINCT lower(btrim(c->>'criterion'))) FROM jsonb_array_elements(p_criteria) c) <> jsonb_array_length(p_criteria) THEN RAISE EXCEPTION 'Pesos devem ser positivos e critérios únicos.'; END IF;
 SELECT content, updated_at INTO v_content,v_updated FROM public.learning_programs WHERE id=p_program FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Curso não encontrado.'; END IF;
 IF v_updated IS DISTINCT FROM p_updated_at THEN RAISE EXCEPTION 'O conteúdo mudou. Recarregue antes de salvar.'; END IF;
 SELECT (n-1)::integer,a->'rubric' INTO v_index,v_old FROM jsonb_array_elements(v_content->'activities') WITH ORDINALITY t(a,n) WHERE a->>'id'=p_activity;
 IF v_index IS NULL THEN RAISE EXCEPTION 'Atividade não encontrada.'; END IF;
 IF EXISTS(SELECT 1 FROM public.learning_submissions WHERE program_id=p_program AND activity_id=p_activity) AND (SELECT jsonb_agg(c->>'criterion' ORDER BY n) FROM jsonb_array_elements(v_old) WITH ORDINALITY t(c,n)) IS DISTINCT FROM (SELECT jsonb_agg(c->>'criterion' ORDER BY n) FROM jsonb_array_elements(p_criteria) WITH ORDINALITY t(c,n)) THEN RAISE EXCEPTION 'Esta atividade já tem entregas: preserve os nomes e a ordem dos critérios.'; END IF;
 v_new_time := clock_timestamp();
 UPDATE public.learning_programs SET content=jsonb_set(v_content,ARRAY['activities',v_index::text,'rubric'],p_criteria),updated_at=v_new_time WHERE id=p_program;
 RETURN v_new_time;
END; $$;
REVOKE ALL ON FUNCTION public.save_activity_rubric(text,text,timestamptz,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_activity_rubric(text,text,timestamptz,jsonb) TO authenticated;
COMMENT ON FUNCTION public.save_activity_rubric(text,text,timestamptz,jsonb) IS 'Admin-only targeted rubric edit with concurrency protection; preserves existing deliveries, grades, answers and evaluation snapshots.';