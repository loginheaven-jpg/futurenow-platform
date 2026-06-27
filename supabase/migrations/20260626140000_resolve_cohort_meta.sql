-- 20260626140000_resolve_cohort_meta.sql
-- 가입-by-코드 (directive 2026-06-26, Q1~Q3 확정): 미가입자도 코드로 차수 "공개 메타"를 확인하고
-- 가입을 결정해야 한다. resolve_cohort_by_code 를 UUID 반환 → 공개 메타 반환으로 확장한다.
--
-- SECURITY DEFINER 로 cohorts RLS 를 우회하되 **비민감 메타만** 노출한다:
--   id · coach_id · coach_name(코치 표시명) · instrument_id · name · code · status · max_members ·
--   member_count(현재 인원) · expires_at.
-- 응답·참여자 명단·전화번호 등 민감정보는 노출하지 않는다. 활성·미만료 차수만 반환.
--
-- 반환 타입 변경(uuid → table)이라 DROP 후 재생성. 의존 객체 없음(우리 코어 코드만 사용).
-- resolveCohortByCode 계약 반환은 Cohort | null 유지(계약 무변경). enrollByCode 가 내부에서 .id 사용.

DROP FUNCTION IF EXISTS public.resolve_cohort_by_code(text);

CREATE FUNCTION public.resolve_cohort_by_code(p_code text)
RETURNS TABLE (
  id            uuid,
  coach_id      uuid,
  coach_name    text,
  instrument_id text,
  name          text,
  code          text,
  status        text,
  max_members   integer,
  member_count  bigint,
  expires_at    timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    c.id,
    c.coach_id,
    u.name AS coach_name,
    c.instrument_id,
    c.name,
    c.code,
    c.status,
    c.max_members,
    (SELECT count(*) FROM public.enrollments e WHERE e.cohort_id = c.id) AS member_count,
    c.expires_at
  FROM public.cohorts c
  LEFT JOIN public.users u ON u.id = c.coach_id
  WHERE c.code = UPPER(p_code)
    AND c.status = 'active'
    AND (c.expires_at IS NULL OR c.expires_at > now())
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_cohort_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_cohort_by_code(text) TO anon, authenticated;
