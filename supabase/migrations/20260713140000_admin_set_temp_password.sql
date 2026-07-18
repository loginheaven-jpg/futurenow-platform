-- 운영자 임시 비밀번호 설정 — 본부 멤버 세부에서 비번 리셋(계정 복구). 지휘부 지시 2026-07-13. ADR-79.
-- 자격: 운영자(is_admin)만. bcrypt(pgcrypto)로 auth.users.encrypted_password 갱신 — 서비스롤 키를 앱에 들이지 않음(RPC=postgres 권한).
--   최소 8자 검증. 강제 변경(다음 로그인)은 후속. 코치 불가(본부=운영자 전용).
CREATE OR REPLACE FUNCTION public.admin_set_temp_password(p_user_id uuid, p_password text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'admin only'; END IF;
  IF p_password IS NULL OR length(p_password) < 8 THEN RAISE EXCEPTION 'password must be at least 8 chars'; END IF;
  UPDATE auth.users
    SET encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
        updated_at = now()
    WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'user not found'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_temp_password(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_temp_password(uuid,text) TO authenticated;
