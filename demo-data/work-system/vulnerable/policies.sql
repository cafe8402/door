-- 실행하지 않는 합성 테스트 자료입니다.
ALTER TABLE public.approvals DISABLE ROW LEVEL SECURITY;
CREATE POLICY "everyone" ON public.staff FOR SELECT TO authenticated USING (true);
