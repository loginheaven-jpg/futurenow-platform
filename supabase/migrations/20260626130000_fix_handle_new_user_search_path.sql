-- 20260626130000_fix_handle_new_user_search_path.sql
-- 보안 보정(directive 2026-06-26 / 어드바이저 0011): SECURITY DEFINER 함수에 search_path 부재는
-- 권한상승 표면이다. handle_new_user 에 SET search_path = public 만 추가한다.
-- 본문은 20260626120000_core_platform_upgrade.sql 의 정의와 동일(CREATE OR REPLACE).
-- 범위 밖: SAIL 기존 함수(resolve_group_by_code 등)의 동일 경고는 건드리지 않는다.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_phone TEXT;
BEGIN
  INSERT INTO public.users (id, email, nickname, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'full_name',
    CASE WHEN NEW.email = 'loginheaven@gmail.com' THEN 'admin' ELSE 'user' END
  )
  ON CONFLICT (id) DO UPDATE
    SET role = CASE
        WHEN EXCLUDED.email = 'loginheaven@gmail.com' THEN 'admin'
        ELSE public.users.role
      END,
      name = COALESCE(public.users.name, EXCLUDED.name);

  v_phone := COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone');
  IF v_phone IS NOT NULL THEN
    INSERT INTO public.user_contacts (user_id, phone)
    VALUES (NEW.id, v_phone)
    ON CONFLICT (user_id) DO UPDATE
      SET phone = COALESCE(public.user_contacts.phone, EXCLUDED.phone);
  END IF;

  RETURN NEW;
END;
$$;
