-- cohort_member_detail 에 주소 추가 — 코치가 리포트에서 조원 신상(주소 포함)을 바로 보게. 지휘부 지시 2026-07-13. ADR-78.
--   목양(방문·연락) 목적상 자기 차수 코치·운영자에게 주소 개방(동의서 440f985 열람주체=본인·인도자·운영자와 정합).
--   계좌(bank_account)는 운영(장학금) 전용이라 여기 미포함 — 본부 멤버상세(getContactDetail)에만 유지.
-- RETURNS TABLE 컬럼 추가라 DROP 후 재생성(자격·구성원 검사·스코프 로직은 20260709150000 과 동일 + address).
DROP FUNCTION IF EXISTS public.cohort_member_detail(uuid, uuid);
CREATE OR REPLACE FUNCTION public.cohort_member_detail(p_cohort_id uuid, p_user_id uuid)
RETURNS TABLE(
  name text, email text, phone text, address text,
  gender text, birth_year int, religion text, faith_years int,
  response_count bigint, cohort_names text[]
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_admin boolean := public.is_admin(auth.uid());
BEGIN
  IF NOT (v_admin OR (
    public.is_cohort_coach(p_cohort_id, auth.uid()) AND (
      EXISTS(SELECT 1 FROM public.enrollments e WHERE e.cohort_id = p_cohort_id AND e.user_id = p_user_id)
      OR EXISTS(SELECT 1 FROM public.responses r WHERE r.cohort_id = p_cohort_id AND r.user_id = p_user_id)
    )
  )) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT
    u.name, u.email,
    (SELECT ct.phone   FROM public.user_contacts ct WHERE ct.user_id = p_user_id),
    (SELECT ct.address FROM public.user_contacts ct WHERE ct.user_id = p_user_id),
    up.gender, up.birth_year, up.religion, up.faith_years,
    (SELECT count(*) FROM public.responses r JOIN public.cohorts co ON co.id = r.cohort_id
       WHERE r.user_id = p_user_id AND (v_admin OR co.coach_id = auth.uid())),
    COALESCE((SELECT array_agg(co.name ORDER BY co.created_at)
       FROM public.enrollments e JOIN public.cohorts co ON co.id = e.cohort_id
       WHERE e.user_id = p_user_id AND (v_admin OR co.coach_id = auth.uid())), ARRAY[]::text[])
  FROM public.users u
  LEFT JOIN public.user_profiles up ON up.user_id = u.id
  WHERE u.id = p_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.cohort_member_detail(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cohort_member_detail(uuid,uuid) TO authenticated;
