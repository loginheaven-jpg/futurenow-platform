-- 가입 대조 키 수집 — 승인 큐의 급소 (S-1 단계 6 · ADR-122)
--   지시: CC_MEMO_site_v2_S1.md 단계 6 개정 · 발주서 §4.3 "이 발주의 급소"
--
-- **적용 버전 = `20260826142335`** (파일명 `20260826200000_` 와 다르다 — 네 번째 사례).
--   상대 순서 보존: 파일명 190000<200000, 적용 141012<142335. ADR-122 ⑨.
--
-- **왜 지금인가**: 승인 화면이 섰는데 대조 키가 비면 운영자가 승인할 근거가 화면에 없다.
--   그리고 §4.3 이 못 박았다 — "나중에 필드를 추가해도 **이미 들어온 신청 건은 영원히
--   대조할 수 없다.**" 늦을수록 못 메우는 구멍이다.
--
-- **동의는 경로별로 가른다(메모 §3).** 기존 `privacy_use` 의 문안도 버전도 건드리지 않는다 —
--   올리면 해당 없는 기존 22명이 2기 진행 중에 재동의 화면을 만난다(`home/page.tsx` 가
--   `privacy_use` + CONSENT_VERSION 일치로 판정한다). 대신 **새 동의 유형 하나**를 더해
--   `/signup` 경로에서만 받는다. 기존 회원은 그 행이 없을 뿐 아무 화면도 달라지지 않는다.
--   ADR-107 의 규율("동의의 **내용**이 바뀔 때만 버전을 올린다")이 지켜진다 — 기존 동의의
--   내용은 그대로이고 새 경로에 새 항목이 붙을 뿐이다.

-- ============================================================
-- 1. 동의 유형 확장 — 'forum_match' 추가
-- ============================================================
ALTER TABLE public.user_consents DROP CONSTRAINT IF EXISTS user_consents_type_check;
ALTER TABLE public.user_consents
  ADD CONSTRAINT user_consents_type_check
  CHECK (type IN ('privacy_use', 'sensitive_use', 'coach_pledge', 'forum_match'));

-- ============================================================
-- 2. 대조 키 기록 — self-scoped DEFINER (ADR-39 `create_coach_application` 패턴)
--    연락처는 불변식 13 대로 user_contacts 에 넣는다. memberships 에는 가입 경위만.
-- ============================================================
CREATE FUNCTION public.record_signup_intake(
  p_forum_name  text DEFAULT NULL,
  p_forum_phone text DEFAULT NULL,
  p_signup_note text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'no session' USING errcode = '42501';
  END IF;
  -- 형식 검증은 DB 도 이중으로 건다(CLAUDE §9 — DB 는 느슨, 코드 경계는 엄격).
  IF p_forum_phone IS NOT NULL AND p_forum_phone !~ '^[+0-9\-\s]{8,20}$' THEN
    RAISE EXCEPTION 'bad forum phone' USING errcode = '22023';
  END IF;
  IF char_length(coalesce(p_forum_name,'')) > 40 OR char_length(coalesce(p_signup_note,'')) > 300 THEN
    RAISE EXCEPTION 'too long' USING errcode = '22023';
  END IF;

  -- 연락처: 넘기지 않은 값은 **보존**한다(갈무리·value_patch 의 COALESCE 선례).
  INSERT INTO public.user_contacts (user_id, forum_name, forum_phone)
  VALUES (auth.uid(), NULLIF(p_forum_name,''), NULLIF(p_forum_phone,''))
  ON CONFLICT (user_id) DO UPDATE SET
    forum_name  = COALESCE(NULLIF(EXCLUDED.forum_name,''),  user_contacts.forum_name),
    forum_phone = COALESCE(NULLIF(EXCLUDED.forum_phone,''), user_contacts.forum_phone);

  -- 가입 경위: 행이 없으면 만들고(기본 pending), 있으면 **note 만** 갱신한다.
  --   **status 를 건드리지 않는 것이 요점이다** — 이미 승인된 사람이 정보를 고친다고
  --   자격이 pending 으로 되돌아가면 안 된다. 운영자 결정은 decide_membership 만 바꾼다.
  INSERT INTO public.memberships (user_id, status, signup_note, decided_at, decision_note)
  VALUES (auth.uid(), 'pending', NULLIF(p_signup_note,''), NULL, NULL)
  ON CONFLICT (user_id) DO UPDATE SET
    signup_note = COALESCE(NULLIF(EXCLUDED.signup_note,''), memberships.signup_note);
END;
$$;

REVOKE ALL ON FUNCTION public.record_signup_intake(text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_signup_intake(text,text,text) TO authenticated;

-- ============================================================
-- 3. 가입 트리거 — 세션 없는 분기에서도 대조 키가 남게 한다
--    SignupClient 는 세션이 있을 때만 RPC 를 부른다. 이메일 확인이 켜지면 그 분기가 발화하고,
--    그때부터 승인 큐가 **대조 키 없는 행**으로 차기 시작한다(설계 §4.3).
--    실측상 지금은 확인이 꺼져 있어 발화한 적이 없으나, 켜는 순간 조용히 새는 자리다.
--
--    **metadata 를 신뢰하는 것이 아니다.** S3 §3.4 가 폐기한 것은 `coachApply` 처럼
--    **권한을 주는 값**이었다. 대조 키는 운영자가 눈으로 맞춰 볼 재료라, 위조하면
--    승인이 반려될 뿐 아무 권한도 생기지 않는다. 그래서 여기서는 받아 적어도 된다.
--
--    SAIL 가입에는 이 키가 없으므로 NULL 가드에 걸려 아무 행도 만들지 않는다(무영향).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_phone  TEXT;
  v_gender TEXT;
  v_birth  INT;
  v_faith  INT;
  v_fname  TEXT;
  v_fphone TEXT;
  v_note   TEXT;
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

  -- ── 대조 키(S-1 단계 6 신설). 있을 때만 쓴다 — SAIL 가입에는 없으므로 무영향.
  v_fname  := NULLIF(NEW.raw_user_meta_data->>'forum_name', '');
  v_fphone := NULLIF(NEW.raw_user_meta_data->>'forum_phone', '');
  v_note   := NULLIF(NEW.raw_user_meta_data->>'signup_note', '');

  IF v_fphone IS NOT NULL AND v_fphone !~ '^[+0-9\-\s]{8,20}$' THEN v_fphone := NULL; END IF;
  IF char_length(COALESCE(v_fname,'')) > 40  THEN v_fname := left(v_fname, 40); END IF;
  IF char_length(COALESCE(v_note,'')) > 300  THEN v_note  := left(v_note, 300); END IF;

  IF v_fname IS NOT NULL OR v_fphone IS NOT NULL THEN
    INSERT INTO public.user_contacts (user_id, forum_name, forum_phone)
    VALUES (NEW.id, v_fname, v_fphone)
    ON CONFLICT (user_id) DO UPDATE
      SET forum_name  = COALESCE(public.user_contacts.forum_name,  EXCLUDED.forum_name),
          forum_phone = COALESCE(public.user_contacts.forum_phone, EXCLUDED.forum_phone);
  END IF;

  IF v_note IS NOT NULL THEN
    INSERT INTO public.memberships (user_id, status, signup_note)
    VALUES (NEW.id, 'pending', v_note)
    ON CONFLICT (user_id) DO UPDATE
      SET signup_note = COALESCE(public.memberships.signup_note, EXCLUDED.signup_note);
  END IF;

  RETURN NEW;
END;
$function$;
