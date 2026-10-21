-- Static fixture only; assumes an existing authenticated role and auth.uid().
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_self_read ON public.staff FOR SELECT TO authenticated USING (user_id = auth.uid());
