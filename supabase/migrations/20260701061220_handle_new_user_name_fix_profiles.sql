-- handle_new_user 재작성: (1) name 키 버그 수정 — name 컬럼도 nickname 처럼 COALESCE('name','full_name')(기존 full_name 단독 → 항상 NULL 버그).
--   COALESCE 라 SAIL(full_name 경로) 비파괴. (2) user_profiles INSERT(성별·생년·종교·신앙연수) — 방어적 sanitize(CHECK 위반이 가입을 깨지 않게 잘못된 값은 NULL).
-- coach 신청 INSERT 는 넣지 않는다(client metadata 신뢰 폐기 — 신청은 createCoachApplication RPC). 전화·loginheaven admin 분기 유지. SET search_path 보존.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_phone  TEXT;
  v_gender TEXT;
  v_birth  INT;
  v_faith  INT;
BEGIN
  INSERT INTO public.users (id, email, nickname, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    CASE WHEN NEW.email = 'loginheaven@gmail.com' THEN 'admin' ELSE 'user' END
  )
  ON CONFLICT (id) DO UPDATE
    SET role = CASE WHEN EXCLUDED.email = 'loginheaven@gmail.com' THEN 'admin' ELSE public.users.role END,
        name = COALESCE(public.users.name, EXCLUDED.name);

  -- 참여 프로필(방어적 sanitize — 잘못된 값은 NULL 로, CHECK 위반이 가입을 깨지 않게)
  v_gender := CASE WHEN NEW.raw_user_meta_data->>'gender' IN ('남성','여성','기타') THEN NEW.raw_user_meta_data->>'gender' ELSE NULL END;
  v_birth  := CASE WHEN NEW.raw_user_meta_data->>'birth_year' ~ '^[0-9]+$'
                   AND (NEW.raw_user_meta_data->>'birth_year')::int BETWEEN 1900 AND 2100
                   THEN (NEW.raw_user_meta_data->>'birth_year')::int ELSE NULL END;
  v_faith  := CASE WHEN NEW.raw_user_meta_data->>'faith_years' ~ '^[0-9]+$'
                   THEN (NEW.raw_user_meta_data->>'faith_years')::int ELSE NULL END;
  INSERT INTO public.user_profiles (user_id, gender, birth_year, religion, faith_years)
  VALUES (NEW.id, v_gender, v_birth, NULLIF(NEW.raw_user_meta_data->>'religion', ''), v_faith)
  ON CONFLICT (user_id) DO NOTHING;

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
