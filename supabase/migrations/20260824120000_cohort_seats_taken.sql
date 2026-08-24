-- ============================================================
-- cohort_seats_taken — 모집 랜딩(/recruit)의 '남은 자리' 집계 (ADR-110 개정)
-- ============================================================
-- 왜 필요한가: 랜딩은 **비인증 공개 페이지**다. anon 은 enrollments·responses·users 를
--   RLS 로 읽을 수 없다(그래야 맞다). 그래서 숫자 하나만 돌려주는 DEFINER 함수를 연다.
--   resolve_cohort_by_code · is_cohort_member 와 같은 계열이고 grant 도 같다.
--
-- 무엇을 세는가(발주서 §4.2 — 사전 체크 완료 시각을 신청 확정으로 본다):
--   ① 그 차수에 **현재 등록**돼 있고        ← 이동·삭제된 사람은 빠진다(ADR-84 #4 등록 기준 필터와 동일)
--   ② 그 차수의 **사전 체크를 마쳤고**      ← responses.wave='pre'
--   ③ **참여자**인 사람                     ← users.role='user'
--
-- ③이 이 함수의 핵심이다. 운영자·진행자가 문안 확인용으로 사전 체크를 마치는 일이 실제로 있다
--   (2026-08-24 실측: 2기 등록 7명 중 완료 6명이나 최철영(coach)·이승은(admin)은 세미나 운영자다).
--   정원은 참여자 자리이므로 운영자를 세면 남은 자리가 실제보다 적게 보인다.
--
-- 무엇을 노출하는가: **정수 하나뿐**이다. 이름·연락처·응답 어느 것도 나가지 않는다.
--   차수 코드는 카드뉴스에 인쇄돼 배포되므로 코드를 아는 것 자체가 비밀이 아니고,
--   '몇 명이 신청했는가'는 우리가 그 페이지에 스스로 공개하려는 값이다.
--
-- 없는 코드·오타는 0 을 돌려준다(예외를 던지지 않는다) — 랜딩이 카운터 때문에 깨지면 안 된다.
CREATE OR REPLACE FUNCTION public.cohort_seats_taken(p_code TEXT)
RETURNS INT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT COALESCE(COUNT(DISTINCT r.user_id), 0)::int
    FROM public.responses   r
    JOIN public.cohorts     c ON c.id = r.cohort_id
    JOIN public.enrollments e ON e.cohort_id = r.cohort_id AND e.user_id = r.user_id
    JOIN public.users       u ON u.id = r.user_id
   WHERE c.code = p_code
     AND r.wave = 'pre'
     AND u.role = 'user';
$$;

GRANT EXECUTE ON FUNCTION public.cohort_seats_taken(TEXT) TO anon, authenticated;
