-- 20260825213000_cohort_member_directory_participants.sql
-- ADR-118 — cohort_member_directory 에 참여자 전용 필터를 **선택 인자**로 더한다.
--
-- 왜 필터가 필요한가: 이 RPC 가 돌려주는 명단에 운영자·인도자가 섞인다(enrollments 에 등록돼 있다).
--   갈무리 격자·신호가 그 명단으로 서면 **인도자가 '오늘 연락할 사람' 목록에서 자기 자신을 본다** —
--   그들은 제출하지 않으므로 '연속 미착수'·'작성 중 방치' 주 신호가 켜진다.
--   ADR-110 이 cohort_seats_taken 에서 같은 문제를 u.role='user' 로 풀었다. 같은 원칙이다 —
--   이름 목록이 아니라 **역할**로 거른다. 이름 목록은 운영자가 바뀔 때마다 낡는다.
--
-- 왜 기본값을 바꾸지 않는가: 이 함수는 **두 목적을 겸한다.**
--   ⓐ 코칭 대상 명단(회차 현황·격자) — 참여자만이 맞다
--   ⓑ userId → name 이름 조회(리포트 PDF 헤더 report/[responseId]/page.tsx · rosterModel) — 전부여야 맞다
--   ⓑ에서 걸러 버리면 role<>'user' 계정이 응답한 리포트의 헤더 이름이 '참여자' 로 폴백된다.
--   실측(2026-08-25): 1기에 그런 응답이 1건 실재한다. 그래서 **기본값 false = 기존 동작**이고
--   호출부 다섯 중 넷이 무변경으로 산다. ⓐ 두 곳만 true 로 부른다.
--
-- 시그니처가 바뀌므로 **구 함수를 먼저 지운다** — 인자 개수가 다르면 오버로드가 되어 둘이 공존한다.
DROP FUNCTION IF EXISTS public.cohort_member_directory(uuid);

CREATE OR REPLACE FUNCTION public.cohort_member_directory(
  p_cohort_id uuid,
  p_only_participants boolean DEFAULT false
)
RETURNS TABLE (user_id uuid, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_cohort_coach(p_cohort_id, auth.uid()) OR public.is_admin(auth.uid())) THEN
    RETURN; -- 빈 결과
  END IF;
  RETURN QUERY
    SELECT u.id, u.name
    FROM public.enrollments e
    JOIN public.users u ON u.id = e.user_id
    WHERE e.cohort_id = p_cohort_id
      AND (NOT p_only_participants OR u.role = 'user');
END;
$$;

REVOKE ALL ON FUNCTION public.cohort_member_directory(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cohort_member_directory(uuid, boolean) TO authenticated;
