-- 20260629000321_set_user_role.sql
-- 운영자(admin)가 멤버 역할을 직접 변경(승격/강등). SECURITY DEFINER. (ADR-28)
-- 가드: 내부 is_admin(운영자만)·역할 화이트리스트·자기강등 방지(admin→비admin 금지)·대상 부재 예외.
-- decide_coach_application(신청 승인) 과 공존: 이쪽은 운영자의 상시 직접 권한, 저쪽은 자가 신청 승인.
CREATE OR REPLACE FUNCTION public.set_user_role(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION '권한이 없습니다' USING errcode = '42501';
  END IF;
  IF p_role NOT IN ('user','coach','admin') THEN
    RAISE EXCEPTION '허용되지 않은 역할: %', p_role USING errcode = '22023';
  END IF;
  IF p_user_id = auth.uid() AND p_role <> 'admin' THEN
    RAISE EXCEPTION '자기 자신은 강등할 수 없습니다' USING errcode = '42501';
  END IF;
  UPDATE public.users SET role = p_role WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION '대상 사용자를 찾을 수 없습니다' USING errcode = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_role(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_user_role(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, text) TO authenticated;
