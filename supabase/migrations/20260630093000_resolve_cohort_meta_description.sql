-- 20260630093000_resolve_cohort_meta_description.sql
-- 진입-2: 코드 미리보기에 차수 소개(description) 노출. cohorts.description 컬럼은 이미 존재 —
-- resolve_cohort_by_code(SECURITY DEFINER 공개 메타)가 description 을 반환하도록 확장한다.
-- description 은 코치 작성 차수 소개(비민감) → name·coach_name 과 동일하게 비로그인 공개 메타에 포함 OK.
-- 반환 타입 변경(컬럼 추가)이라 DROP 후 재생성. 테이블·RLS·컬럼 무변경. search_path·REVOKE/GRANT 보존.
-- directive 진입-2 승인 2026-06-30. (Supabase MCP 끊김 — Management API 로 적용.)

DROP FUNCTION IF EXISTS public.resolve_cohort_by_code(text);

CREATE FUNCTION public.resolve_cohort_by_code(p_code text)
RETURNS TABLE (
  id            uuid,
  coach_id      uuid,
  coach_name    text,
  instrument_id text,
  name          text,
  description   text,
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
    c.description,
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
