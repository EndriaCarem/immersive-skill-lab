DROP POLICY IF EXISTS learning_answer_read ON public.learning_answers;
CREATE POLICY learning_answer_read ON public.learning_answers FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
  OR (
    EXISTS (SELECT 1 FROM public.commerce_enrollments e
      WHERE e.user_id = auth.uid() AND e.product_id = learning_answers.program_id
        AND e.status = 'active' AND (e.expires_at IS NULL OR e.expires_at > now()))
    AND EXISTS (SELECT 1 FROM public.learning_submissions s
      WHERE s.user_id = auth.uid() AND s.program_id = learning_answers.program_id
        AND s.activity_id = learning_answers.activity_id)
    AND NOT EXISTS (SELECT 1 FROM public.learning_submissions p
      WHERE p.user_id = auth.uid() AND p.program_id = learning_answers.program_id
        AND p.activity_id = learning_answers.activity_id
        AND jsonb_array_length(p.human_reviews) > 0 AND p.reviewed_at IS NULL)
  )
);