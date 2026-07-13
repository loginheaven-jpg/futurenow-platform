-- set_my_coach_kpc 완화 — 운영자(admin)도 본인 KPC 저장 가능(내 정보에서 모든 필드 수정, ADR-76 후속·2026-07-09).
--   운영자도 인도자처럼 차수를 운영하므로 KPC 관리 필요. role 무변경(coach_applications 에만 저장) — 권한 상승 경로 아님.
--   기존 로직 동일(형식검증·행 없으면 status='approved' 신규·있으면 kpc 만 갱신), 자격 게이트만 coach → coach|admin.
CREATE OR REPLACE FUNCTION public.set_my_coach_kpc(p_kpc text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF public.user_role(auth.uid()) NOT IN ('coach', 'admin') THEN RAISE EXCEPTION 'coach or admin only'; END IF;
  IF p_kpc !~ '^KPC[0-9]{5}$' THEN RAISE EXCEPTION 'invalid kpc format'; END IF;
  INSERT INTO public.coach_applications (user_id, status, kpc_number)
  VALUES (auth.uid(), 'approved', p_kpc)
  ON CONFLICT (user_id) DO UPDATE SET kpc_number = p_kpc; -- status 무변경
END;
$$;
REVOKE ALL ON FUNCTION public.set_my_coach_kpc(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_coach_kpc(text) TO authenticated;
