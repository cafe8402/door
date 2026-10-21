-- 적용 전 조직·역할·쓰기 정책까지 별도로 검증해야 합니다.
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own" ON public.staff FOR SELECT TO authenticated USING (auth.uid() = owner_id);
