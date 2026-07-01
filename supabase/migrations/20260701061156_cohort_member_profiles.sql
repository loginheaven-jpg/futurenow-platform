-- 차수 조원 프로필 열람(코치·운영자) — user_profiles RLS 를 코치에게 넓히지 않고 DEFINER 로 "이 차수 조원만" 범위 못박음(ADR-24 패턴).
CREATE OR REPLACE FUNCTION public.cohort_member_profiles(p_cohort_id uuid)
RETURNS TABLE (user_id uuid, gender text, birth_year int, religion text, faith_years int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.user_id, p.gender, p.birth_year, p.religion, p.faith_years
  FROM public.user_profiles p
  WHERE (public.is_cohort_coach(p_cohort_id, auth.uid()) OR public.is_admin(auth.uid()))
    AND p.user_id IN (SELECT e.user_id FROM public.enrollments e WHERE e.cohort_id = p_cohort_id);
$$;
REVOKE ALL ON FUNCTION public.cohort_member_profiles(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cohort_member_profiles(uuid) TO authenticated;
