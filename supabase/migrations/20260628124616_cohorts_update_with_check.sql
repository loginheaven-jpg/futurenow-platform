-- 20260628124616_cohorts_update_with_check.sql
-- cohorts_update 정책에 WITH CHECK 부기(소유 이전 차단). 기존 USING 은 어느 행을 고칠지,
-- WITH CHECK 는 고친 결과가 여전히 본인(또는 운영자) 소유인지 — 둘 다 충족해야 UPDATE 성립.
-- updateCohort 메서드는 coach_id 를 건드리지 않으나, raw UPDATE 의 소유 이전을 RLS 층에서 막아 둔다(ADR-26).
ALTER POLICY cohorts_update ON public.cohorts
  WITH CHECK ((coach_id = auth.uid()) OR public.is_admin(auth.uid()));
