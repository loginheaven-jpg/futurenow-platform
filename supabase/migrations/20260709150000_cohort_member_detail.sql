-- 차수 멤버 신상정보(코치 조원 열람 — §10 완화, 자기 차수 한정). 지휘부 지시 2026-07-09.
-- 자격: 운영자(전체) OR 해당 차수 코치 + 그 대상이 이 차수의 실제 구성원(참여 OR 응답)일 때만.
--   → 코치는 '자기 차수 조원'만 열람(다른 코치 차수·비구성원·전체 회원은 불가). 코치가 남의 user_id 를 주입해도 구성원 검사로 차단.
-- 반환: 신원(이름·이메일)·연락(전화)·프로필(성별·생년·종교·신앙연수) + 참여 이력(응답 수·참여 차수명 — 호출자 가시 범위로 스코프).
--   전화(user_contacts)는 ADR-04 로 본인·운영자만이었으나, 목양 연락 목적상 자기 차수 코치에게 개방(범위 엄격·이 RPC 한정).
--   참여 이력은 운영자=전체 차수, 코치=자기 소유 차수만 집계(타 코치 차수 노출 차단).
CREATE OR REPLACE FUNCTION public.cohort_member_detail(p_cohort_id uuid, p_user_id uuid)
RETURNS TABLE(
  name text, email text, phone text,
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
    (SELECT ct.phone FROM public.user_contacts ct WHERE ct.user_id = p_user_id),
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
