-- 공개 영역 — 소식 · 문의 · 자료실 (S-4 · ADR-123)
--   지시: CC_ORDER_site_v2.md §6 · IA v2.1 §2.2·§6
--
-- **적용 버전 = `20260826234713`** (파일명 `20260827130000_` 와 다르다 — 여섯 번째 사례).
--   상대 순서 보존: 파일명 20260827100000<20260827130000, 적용 150546<234713. ADR-122 ⑨.
--
-- 권한 규율은 이 저장소 선례 그대로 — 이 프로젝트는 default privileges 로 신규 public 테이블에
--   `authenticated` 전권을 자동 부여하므로 **GRANT 가 아니라 REVOKE 가 본체다.**
--   `TRUNCATE` 를 반드시 회수한다(RLS 대상이 아니라 남기면 로그인 사용자가 표를 비운다).

-- ============================================================
-- 1. 소식 — 최소 구현(등록·목록·상세)
--    읽기는 **공개**(비로그인 포함)라 anon SELECT 를 준다. 다만 **발행분만** 보인다.
-- ============================================================
CREATE TABLE public.news_posts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  body         text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 20000),
  -- NULL = 초안. 발행 시각이 곧 공개 여부라 별도 상태 컬럼을 두지 않는다(진실이 둘이 되지 않게).
  published_at timestamptz,
  author_id    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX news_posts_published_idx ON public.news_posts (published_at DESC) WHERE published_at IS NOT NULL;
CREATE TRIGGER news_posts_touch_updated_at
  BEFORE UPDATE ON public.news_posts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.news_posts TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.news_posts FROM anon, authenticated;

-- 발행분은 누구나. 초안은 운영자만(작성 중인 글이 현관에 새지 않게).
CREATE POLICY news_posts_select_published ON public.news_posts FOR SELECT TO anon, authenticated
  USING (published_at IS NOT NULL AND published_at <= now());
CREATE POLICY news_posts_select_admin ON public.news_posts FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
-- 쓰기 정책 없음 — DEFINER RPC 로만.

CREATE FUNCTION public.news_upsert(
  p_id uuid, p_title text, p_body text, p_publish boolean DEFAULT false
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;
  IF char_length(coalesce(p_title,'')) = 0 OR char_length(coalesce(p_body,'')) = 0 THEN
    RAISE EXCEPTION 'title and body required' USING errcode = '22023';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.news_posts (title, body, published_at, author_id)
    VALUES (p_title, p_body, CASE WHEN p_publish THEN now() END, auth.uid())
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.news_posts SET
      title = p_title,
      body  = p_body,
      -- **이미 발행된 글의 발행 시각을 덮지 않는다** — 수정이 곧 재발행이 되면 목록 순서가 흔들린다.
      published_at = CASE WHEN p_publish THEN COALESCE(published_at, now()) ELSE NULL END
    WHERE id = p_id
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'post not found' USING errcode = 'P0002'; END IF;
  END IF;
  RETURN v_id;
END;
$$;

CREATE FUNCTION public.news_delete(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;
  DELETE FROM public.news_posts WHERE id = p_id;
END;
$$;

-- ============================================================
-- 2. 문의 — **메일이 아니라 저장으로 간다**
--
--    발송 수단 실측(2026-08-27): 메일 의존성 0 · 코드 내 발송 호출 0 · Edge Function 0 ·
--    메일 env 키 0 · Auth 발송 실적은 복구 1건 시도뿐(ADR-79 가 '도달 못 함'으로 판정한 경로).
--    **보낼 곳이 없다.** 그래서 폼의 제출을 여기 적재하고 운영자가 콘솔에서 읽는다 —
--    제출이 실재하는 곳으로 가므로 죽은 폼이 아니다. SMTP 가 서면 **알림만** 얹으면 된다.
--
--    `/contact` 는 공개 화면이라 **비로그인도 보낼 수 있어야 한다** → anon 실행 RPC.
--    그래서 스팸 가드를 함수 안에 둔다(길이 · 최근 창 빈도).
-- ============================================================
CREATE TABLE public.contact_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text CHECK (name IS NULL OR char_length(name) <= 40),
  email      text CHECK (email IS NULL OR char_length(email) <= 120),
  body       text NOT NULL CHECK (char_length(body) BETWEEN 5 AND 2000),
  user_id    uuid REFERENCES public.users(id) ON DELETE SET NULL, -- 로그인 상태면 기록(추적용, 필수 아님)
  handled_at timestamptz,
  handled_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX contact_messages_open_idx ON public.contact_messages (created_at DESC) WHERE handled_at IS NULL;

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.contact_messages TO authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.contact_messages FROM anon, authenticated;
REVOKE ALL ON public.contact_messages FROM anon;

-- **읽기는 운영자만.** 문의에는 연락처와 사연이 함께 담긴다(§6.0 이 경계하는 결합 형태다).
CREATE POLICY contact_messages_select_admin ON public.contact_messages FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE FUNCTION public.contact_submit(p_name text, p_email text, p_body text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_recent int;
BEGIN
  IF char_length(coalesce(p_body,'')) < 5 THEN
    RAISE EXCEPTION '내용을 조금 더 적어 주세요' USING errcode = '22023';
  END IF;
  IF char_length(p_body) > 2000 OR char_length(coalesce(p_name,'')) > 40 OR char_length(coalesce(p_email,'')) > 120 THEN
    RAISE EXCEPTION 'too long' USING errcode = '22023';
  END IF;

  -- 스팸 가드. anon 이 부를 수 있는 유일한 쓰기 통로라 **여기가 유일한 방벽이다.**
  --   로그인 사용자는 본인 기준, 비로그인은 전체 기준으로 최근 1분 창을 본다
  --   (비로그인은 식별자가 없어 개인 단위로 셀 수 없다 — 전체 창이 유일하게 셀 수 있는 것이다).
  IF auth.uid() IS NOT NULL THEN
    SELECT count(*) INTO v_recent FROM public.contact_messages
     WHERE user_id = auth.uid() AND created_at > now() - interval '1 minute';
  ELSE
    SELECT count(*) INTO v_recent FROM public.contact_messages
     WHERE user_id IS NULL AND created_at > now() - interval '1 minute';
  END IF;
  IF v_recent >= 3 THEN
    RAISE EXCEPTION '잠시 뒤 다시 보내 주세요' USING errcode = '55000';
  END IF;

  INSERT INTO public.contact_messages (name, email, body, user_id)
  VALUES (NULLIF(p_name,''), NULLIF(p_email,''), p_body, auth.uid());
END;
$$;

CREATE FUNCTION public.contact_mark_handled(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;
  UPDATE public.contact_messages SET handled_at = now(), handled_by = auth.uid()
   WHERE id = p_id AND handled_at IS NULL;
END;
$$;

-- ============================================================
-- 3. 자료실 — 3단 권한 + 만료형 서명 URL
--    **버킷은 비공개다.** 인도자 자료를 public 버킷에 두지 않는다(발주서 §6).
--    공개분도 같은 비공개 버킷에 두고 서명 URL 로 내준다 — 버킷이 둘이면 실수로 잘못된 쪽에
--    올리는 날이 오고, 그때 되돌릴 수 없다(§6.0 의 사고).
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('library', 'library', false)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.library_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  description  text CHECK (description IS NULL OR char_length(description) <= 500),
  -- 3단 권한. 'public' 도 **비로그인 열람 허용**이라는 뜻이지 공개 버킷이라는 뜻이 아니다.
  tier         text NOT NULL CHECK (tier IN ('public','member','coach')),
  storage_path text NOT NULL UNIQUE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX library_items_tier_idx ON public.library_items (tier, created_at DESC);
CREATE TRIGGER library_items_touch_updated_at
  BEFORE UPDATE ON public.library_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.library_items TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.library_items FROM anon, authenticated;

-- 목록은 tier 로 갈린다. **같은 경로에서 역할에 따라 섹션이 늘어난다**(발주서 §6).
CREATE POLICY library_items_select_public ON public.library_items FOR SELECT TO anon, authenticated
  USING (tier = 'public');
CREATE POLICY library_items_select_member ON public.library_items FOR SELECT TO authenticated
  USING (tier = 'member');
CREATE POLICY library_items_select_coach ON public.library_items FOR SELECT TO authenticated
  USING (tier = 'coach' AND public.user_role(auth.uid()) IN ('coach','admin'));

-- 서명 URL 발급 자격 판정 — **파일 접근의 유일한 관문**이다.
--   앱이 이 함수로 먼저 물어보고 통과할 때만 서명 URL 을 만든다(service_role 로 발급).
--   RLS 는 '목록에 뜨는가'를 가리고, 이 함수는 '파일을 받을 수 있는가'를 가린다 — 둘이 같은 표를 본다.
CREATE FUNCTION public.library_can_read(p_path text) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_tier text;
BEGIN
  SELECT tier INTO v_tier FROM public.library_items WHERE storage_path = p_path;
  IF v_tier IS NULL THEN RETURN false; END IF;
  IF v_tier = 'public' THEN RETURN true; END IF;
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF v_tier = 'member' THEN RETURN true; END IF;
  RETURN public.user_role(auth.uid()) IN ('coach','admin'); -- 'coach' 단
END;
$$;

CREATE FUNCTION public.library_upsert(
  p_id uuid, p_title text, p_description text, p_tier text, p_storage_path text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;
  IF p_tier NOT IN ('public','member','coach') THEN
    RAISE EXCEPTION 'bad tier: %', p_tier USING errcode = '22023';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.library_items (title, description, tier, storage_path)
    VALUES (p_title, NULLIF(p_description,''), p_tier, p_storage_path)
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.library_items
       SET title = p_title, description = NULLIF(p_description,''), tier = p_tier
     WHERE id = p_id RETURNING id INTO v_id;   -- storage_path 는 불변(파일과 행의 짝을 흔들지 않는다)
    IF v_id IS NULL THEN RAISE EXCEPTION 'item not found' USING errcode = 'P0002'; END IF;
  END IF;
  RETURN v_id;
END;
$$;

-- storage.objects 정책 — **인도자 자료가 비인가자에게 열리지 않게 테이블과 같은 표를 본다.**
--   업로드·삭제는 운영자만. 읽기는 library_can_read 가 판정한다.
CREATE POLICY library_objects_select ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'library' AND public.library_can_read(name));
CREATE POLICY library_objects_write ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'library' AND public.is_admin(auth.uid()));
CREATE POLICY library_objects_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'library' AND public.is_admin(auth.uid()));

REVOKE ALL ON FUNCTION public.news_upsert(uuid,text,text,boolean)            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.news_delete(uuid)                              FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.contact_mark_handled(uuid)                     FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.library_upsert(uuid,text,text,text,text)       FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.news_upsert(uuid,text,text,boolean)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.news_delete(uuid)                           TO authenticated;
GRANT EXECUTE ON FUNCTION public.contact_mark_handled(uuid)                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.library_upsert(uuid,text,text,text,text)    TO authenticated;
-- **문의 제출과 자료 열람 판정만 anon 에 연다** — /contact 와 /library 가 공개 화면이기 때문이다.
GRANT EXECUTE ON FUNCTION public.contact_submit(text,text,text)              TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.library_can_read(text)                      TO anon, authenticated;
