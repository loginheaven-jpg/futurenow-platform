-- 20260628095509_cohort_member_directory.sql
-- 코치/운영자가 자기 차수 멤버의 id+name만 조회. SECURITY DEFINER, 권한 미달 시 빈 결과(누출 없음).
-- (b) 멤버명부 RPC — users RLS를 넓히지 않고 id+name만 노출(ADR-04 최소 노출, ADR-24). plan Q6 해소.
CREATE OR REPLACE FUNCTION public.cohort_member_directory(p_cohort_id uuid)
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
    WHERE e.cohort_id = p_cohort_id;
END;
$$;
REVOKE ALL ON FUNCTION public.cohort_member_directory(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cohort_member_directory(uuid) TO authenticated;
