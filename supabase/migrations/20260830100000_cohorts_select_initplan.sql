-- `cohorts_select` 정책 최적화 — 함수 호출을 **쿼리당 한 번**으로 (5차 후속)
--
-- ⚠ **이 파일은 아직 적용되지 않았다.** 별도 승인 사안이다.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- **왜 이 파일이 생겼나 — 내가 적은 근거가 틀렸다.**
--
-- 앞선 마이그레이션(`20260830090000`)의 주석에 나는 이렇게 적었다:
--
--   > **지금은 안전하다**: `member_state(auth.uid())` 가 **행에 의존하지 않으므로**
--   > PostgreSQL 이 InitPlan 으로 승격해 **쿼리당 한 번**만 평가한다.
--
-- **틀렸다.** 적용 뒤 실측(2026-08-30 · `EXPLAIN ANALYZE VERBOSE`)에서 `member_state` 가
-- `Filter` 안에 그대로 남았다 — **InitPlan 이 없다.**
--
--   Filter: (is_admin(…) OR ((member_state(…) <> 'expired') AND (…)))
--   Rows Removed by Filter: 5
--
-- **PostgreSQL 은 `STABLE` 함수 호출을 그 이유만으로 승격하지 않는다.**
-- InitPlan 승격은 **서브쿼리**에 적용되는 것이고, 맨 함수 호출은 Filter 에 남아 **행마다 돈다.**
-- 지휘부가 *원칙적으로 위험하다* 고 짚은 그 자리이고, *적용 후 실측으로 확인하라* 는 지시가
-- 정확히 이것을 잡았다. **내가 계획을 안 보고 원리로 추정한 것이 원인이다.**
--
-- **크기**: 지금은 기수 6개라 실해가 없다(Execution Time 1.1ms). 그러나 `member_state` 는
-- 안에서 `memberships` SELECT 와 `enrollments ⋈ cohorts` EXISTS 를 한다 — **행마다 두 질의**다.
-- 기수가 늘면 그만큼 늘고, *지금 안 아프다* 는 것이 *안 아플 것이다* 를 뜻하지 않는다.
--
-- **고침**: 호출을 **스칼라 서브쿼리로 감싼다**. Supabase 가 `(select auth.uid())` 로 권고하는
-- 것과 같은 관용구다. 실증했다(같은 날 · 트랜잭션 안에서 시험하고 ROLLBACK):
--
--   InitPlan 1
--     ->  Result  (actual time=0.534..0.535 rows=1 **loops=1**)
--           Output: member_state(…)
--
-- **판정 결과는 한 글자도 바뀌지 않는다** — 같은 함수를 같은 인자로 부르고 평가 횟수만 준다.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS cohorts_select ON public.cohorts;
CREATE POLICY cohorts_select ON public.cohorts FOR SELECT
  USING (
    -- `is_admin` 은 첫 OR 로 그대로 둔다(운영자 감독이 끊기지 않게).
    --   ⚠ 이 자리는 여전히 **미확정**이다 — `20260830090000` §4 의 주 참조.
    public.is_admin(auth.uid())
    OR (
      -- **스칼라 서브쿼리로 감싼다** — 이 괄호 하나가 매 행 호출을 InitPlan 으로 바꾼다.
      --   맨 호출로 되돌리면 조용히 느려지고 아무것도 알려주지 않는다.
      (SELECT public.member_state(auth.uid())) <> 'expired'
      AND (coach_id = auth.uid() OR public.is_cohort_member(id, auth.uid()))
    )
  );

-- ============================================================
-- 적용 뒤 검증
-- ============================================================
--   ① **계획을 본다**(시간이 아니라). 참여자 신원으로 시뮬레이션해야 정책이 실제로 붙는다 —
--      운영자는 첫 `OR` 로 통과해 뒤가 평가되지 않는다.
--        set local role authenticated;
--        select set_config('request.jwt.claims', '{"sub":"<참여자 uuid>","role":"authenticated"}', true);
--        explain (analyze, verbose) select id from public.cohorts;
--      `InitPlan 1` 이 나오고 그 아래 `loops=1` 이면 통과다.
--   ② **판정이 안 바뀌었는지** — `tests/membership.integration.test.ts` 전량.
--   ③ **화면 회귀** — 피드 · 내 기수 · 콘솔(정책을 다시 만들었으므로).
