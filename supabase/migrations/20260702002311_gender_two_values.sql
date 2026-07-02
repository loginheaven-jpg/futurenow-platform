-- A4(성별 남/여 2값, 2026-07-02 · ADR-48): user_profiles.gender 허용값을 '남'/'여' 2값으로 축소.
-- 전 서비스 공통 규약(성별=남/여, 지휘부 확정). TS 상수(contracts/vocab.ts GENDERS)와 값 일치 — 함께 변경(ADR-46 이원 동기화 의무).
-- 순서 중요: (1) 구 CHECK 제거 → (2) 데이터 변환 → (3) 새 CHECK 추가 → (4) sanitize 교체.
--   변환('남성'→'남')을 구 CHECK(IN '남성','여성','기타') 살아있는 채로 하면 '남'이 구 CHECK 에 걸린다 → 반드시 DROP 먼저.
-- 멱등: 이미 남/여면 (2) no-op. 실측 기존 데이터=남성 1행.

-- (1) 구 CHECK 제거(구 인라인 CHECK 이름 실측 = user_profiles_gender_check)
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_gender_check;

-- (2) 데이터 변환(남성→남·여성→여, 그 외(기타 등)→NULL) — 이제 구 CHECK 없어 변환값 통과
UPDATE public.user_profiles
SET gender = CASE gender WHEN '남성' THEN '남' WHEN '여성' THEN '여' ELSE NULL END,
    updated_at = now()
WHERE gender IS NOT NULL AND gender NOT IN ('남', '여');

-- (3) 새 CHECK 추가(남/여만)
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_gender_check
  CHECK (gender IS NULL OR gender IN ('남', '여'));

-- (4) handle_new_user sanitize 교체(남/여만 통과, 그 외 NULL). 나머지 로직은 20260701061220 과 동일(성별 sanitize 한 줄만 변경).
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

  -- 참여 프로필(방어적 sanitize — 잘못된 값은 NULL 로, CHECK 위반이 가입을 깨지 않게). 성별은 남/여만(A4).
  v_gender := CASE WHEN NEW.raw_user_meta_data->>'gender' IN ('남', '여') THEN NEW.raw_user_meta_data->>'gender' ELSE NULL END;
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
