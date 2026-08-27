-- 2차 · 동행 피드 + 소식 댓글 (ADR-124)
--   지시: docs/tasks/CC_ORDER_site_v2_2.md **rev.1** · 상위 기준 IA확정본 v2.2 §7
--   설계 보고: docs/reports/2026-08-27-site_v2_2-설계보고.md (커밋 e133848 · 지휘부 승인)
--
-- **적용 버전 = `20260828100000` — 파일명과 같다.** 직전 여섯 건은 전부 어긋나 있었다(ADR-122 ⑨).
--   이번엔 MCP apply_migration 이 적용 시각으로 자체 채번하는 경로를 쓰지 않고,
--   **롤백 검증(103/103)을 통과한 이 파일 그대로** 적용한 뒤 원장에 파일명 버전을 기록했다.
--   근거: 32KB 를 손으로 옮겨 붙이면 저장소와 DB 가 갈릴 수 있다 — 이 저장소가 가장 두려워하는
--   "사본이 둘"이 마이그레이션에서 일어나는 형태다. 검증한 것과 적용한 것이 같은 바이트여야 한다.
--   부수 효과로 채번 불일치가 처음으로 사라졌다. **지휘부가 되돌리기를 원하면 되돌릴 수 있다.**
--
-- **성공 판정은 테스트가 아니다** — 9/21 아침에 인도자가 폰으로 사진 한 장과 한 문장을
--   올릴 수 있는가다(발주 §0). 아래 모든 가드는 그 장면을 막지 않는 선에서 세운다.
--   빈도 상한을 두지 않는 것도 그래서다: /contact 는 anon 통로라 RPC 안이 유일한 방벽이었지만
--   (ADR-123 ②) 피드는 인증된 기수 멤버만 부른다. 상한은 마찰이고 마찰은 카톡 회귀다(§3.1).
--
-- **갈무리 선례를 따르되 두 줄이 다르다**(발주 §4.1 확정).
--   갈무리는 혼자 쓰는 방이고 피드는 함께 보는 방이다. SELECT 를 기수 전원으로 넓히고
--   DELETE 에 코치를 더한다. 버킷을 가르는 것이 갈무리의 사적 성격을 **지키는** 일이다(§3.3).
--
-- **갈무리 테이블·화면은 한 줄도 건드리지 않는다**(발주 §7-5).

-- ============================================================
-- 0. 이모지 — 단일 출처
-- ============================================================
-- CHECK 와 RPC 가 같은 목록을 두 번 적으면 언젠가 갈린다. 한 함수에서 읽는다.
--   IMMUTABLE 이라 CHECK 에 쓸 수 있다. **알려진 한계**: 이 함수를 나중에 고쳐도 기존 행은
--   재검증되지 않는다. 목록을 바꿀 일이 생기면 새 마이그레이션에서 제약을 다시 건다.
--   TS 쪽 `FEED_EMOJI` 와의 일치는 통합테스트가 잠근다(네 종 통과 + 목록 밖 거부).
CREATE FUNCTION public.feed_emojis() RETURNS text[]
LANGUAGE sql IMMUTABLE AS $$ SELECT ARRAY['👏','🙏','💪','❤️'] $$;

-- ============================================================
-- 1. 표 넷
-- ============================================================

-- 1.1 피드 글 — **없는 컬럼이 설계다.**
--   title·category·tags 없음: §3.1 "본문 하나뿐이다"를 규칙이 아니라 구조로 강제한다.
--   updated_at·수정 경로 없음: 카톡에 수정이 없다. 마찰을 늘리지 않는다.
--   집계 컬럼 없음: 저장하면 사본이 둘이 되고 §3.2 가 금지한 "좋아요 수 정렬"의 재료가 된다.
--   session_no 없음: 갈무리와 피드를 잇는 컬럼을 두지 않는다(§3.3 금지 방향).
CREATE TABLE public.feed_posts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id  uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  author_id  uuid NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  body       text NOT NULL DEFAULT '' CHECK (char_length(body) <= 2000),
  photo_path text CHECK (photo_path IS NULL OR char_length(photo_path) <= 300),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  -- 사진만 올려도 게시된다(§3.1 · 카톡 예시 06:12이 사진 한 장이었다). 다만 둘 다 비면 빈 글이다.
  --
  -- **묘비는 예외다.** 삭제는 photo_path 를 비우는데(바이트는 앱이 먼저 회수했다),
  --   사진만 올린 글은 body 가 '' 이라 이 제약이 삭제 자체를 막았다 — 롤백 검증에서 23514 로 잡혔다.
  --   제약의 뜻은 "**게시**가 비어 있을 수 없다"이고 묘비는 게시가 아니다. 그 뜻을 지키려면
  --   살아 있는 행에만 건다. 텍스트 글만으로 검증했다면 그대로 배포됐을 결함이다.
  CONSTRAINT feed_posts_not_empty CHECK (
    deleted_at IS NOT NULL OR char_length(btrim(body)) > 0 OR photo_path IS NOT NULL)
);
CREATE INDEX feed_posts_cohort_time_idx ON public.feed_posts (cohort_id, created_at DESC, id DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX feed_posts_mine_idx ON public.feed_posts (cohort_id, author_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- 1.2 댓글 — **parent_id 컬럼이 없다.** §3.4 "댓글은 1단"을 화면이 아니라 스키마가 보장한다.
--   컬럼이 있으면 언젠가 누가 채운다.
--   cohort_id 를 복사하지 않는다: 댓글의 기수는 원글이 알고 그 주인은 하나여야 한다(§11-9).
CREATE TABLE public.feed_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  author_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body       text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.users(id) ON DELETE SET NULL
);
CREATE INDEX feed_comments_post_idx ON public.feed_comments (post_id, created_at)
  WHERE deleted_at IS NULL;

-- 1.3 반응 — PK 가 (post_id, user_id) 인 이유: 한 사람이 여러 이모지를 쌓을 수 있으면
--   그 수가 곧 점수가 되고 그것이 §3.2 가 막으려는 것이다. 응원이지 채점이 아니다.
CREATE TABLE public.feed_reactions (
  post_id    uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji      text NOT NULL CHECK (emoji = ANY (public.feed_emojis())),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- 1.4 소식 댓글 — 피드 댓글과 **합치지 않는다**(§7-5 계열).
--   스코프 축이 다르다: 피드는 기수, 소식은 전체. 한 표에 담으면 정책이 분기하고
--   분기하는 정책은 새는 정책이다.
CREATE TABLE public.news_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES public.news_posts(id) ON DELETE CASCADE,
  author_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body       text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.users(id) ON DELETE SET NULL
);
CREATE INDEX news_comments_post_idx ON public.news_comments (post_id, created_at)
  WHERE deleted_at IS NULL;

-- ============================================================
-- 2. 판정 헬퍼 — SECURITY DEFINER (재귀 회피 · architecture §6.1 패턴)
-- ============================================================

-- **피드의 열람 자격과 게시 자격은 하나다**(발주 §5.1 표에서 두 열이 동일).
--   판정을 한 함수에 둔다 — 화면마다 조건을 흩뿌리면 언젠가 새는 곳이 생긴다(IA §5.8).
--
-- kind='seminar' 를 넣고 status 는 보지 않는다. 둘 다 의도적이다.
--   · kind 를 빼면 **휴지통에 버린 사람이 피드를 읽는다** — S-1 이 enrollments 단독 판정에서
--     겪은 결함(IA §5.4 정정)의 재현이다. is_cohort_member 는 enrollments 만 보므로 단독으로 못 쓴다.
--   · status 를 넣으면 **1기 피드가 마감과 함께 죽는다** — 발주 확정 ③에 정면으로 어긋난다.
--     기존 is_cohort_member 가 status 를 보지 않는 것이 여기서는 정확히 맞다.
--   1기 인도자 참여(확정 ④)는 coach_id 비교가 처리한다 — archived 여도 coach_id 는 남는다.
CREATE FUNCTION public.feed_can_access(p_cohort_id uuid, p_uid uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_uid IS NOT NULL AND (
    public.is_admin(p_uid)
    OR EXISTS (
      SELECT 1 FROM public.cohorts c
       WHERE c.id = p_cohort_id
         AND c.kind = 'seminar'
         AND (c.coach_id = p_uid OR public.is_cohort_member(c.id, p_uid))
    ));
$$;

-- 댓글·반응 정책이 원글을 볼 때 쓴다. DEFINER 라 feed_posts 의 RLS 를 타지 않는다 —
--   정책끼리 테이블을 직접 참조하면 재귀가 생긴다(CLAUDE §5).
CREATE FUNCTION public.feed_post_accessible(p_post_id uuid, p_uid uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.feed_posts p
     WHERE p.id = p_post_id AND public.feed_can_access(p.cohort_id, p_uid));
$$;

-- 소식 댓글은 **발행된 글에만** 붙는다. 초안(published_at IS NULL)은 운영자만 보는데
--   거기에 댓글이 달리면 발행 전 글의 존재가 댓글로 새어 나간다.
CREATE FUNCTION public.news_post_published(p_post_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.news_posts n
     WHERE n.id = p_post_id AND n.published_at IS NOT NULL AND n.published_at <= now());
$$;

-- ============================================================
-- 3. RLS — 읽기만 정책으로, 쓰기는 전부 DEFINER RPC (발주 §5.3)
-- ============================================================

-- **삭제된 글은 직접 조회로 보이지 않는다.** soft delete 를 그냥 두면 운영자가 지운
--   부적절한 본문이 테이블 조회로 여전히 읽힌다. 정책이 가리고, 목록 RPC 가 본문 없는
--   묘비만 낸다(§5.3 의 "답글이 고아가 되지 않게"는 묘비로 충족된다).

ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.feed_posts TO authenticated;
REVOKE ALL ON public.feed_posts FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.feed_posts FROM authenticated;
CREATE POLICY feed_posts_select ON public.feed_posts FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.feed_can_access(cohort_id, auth.uid()));

ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.feed_comments TO authenticated;
REVOKE ALL ON public.feed_comments FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.feed_comments FROM authenticated;
CREATE POLICY feed_comments_select ON public.feed_comments FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.feed_post_accessible(post_id, auth.uid()));

ALTER TABLE public.feed_reactions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.feed_reactions TO authenticated;
REVOKE ALL ON public.feed_reactions FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.feed_reactions FROM authenticated;
CREATE POLICY feed_reactions_select ON public.feed_reactions FOR SELECT TO authenticated
  USING (public.feed_post_accessible(post_id, auth.uid()));

-- 소식 댓글은 **비로그인도 읽는다**(발주 §5.2). 쓰기만 로그인이다.
ALTER TABLE public.news_comments ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.news_comments TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.news_comments FROM anon, authenticated;
CREATE POLICY news_comments_select ON public.news_comments FOR SELECT TO anon, authenticated
  USING (deleted_at IS NULL AND public.news_post_published(post_id));

-- ============================================================
-- 4. 쓰기 RPC — 전부 DEFINER
-- ============================================================

-- **held 는 쓰기만 막는다**(발주 §9.1 확정). 읽기는 그대로 둔다.
--   §5.3 이 "인도자는 자기 기수 글을 지울 수 있다"를 두었는데 지운 글을 다시 쓸 수 있으면
--   그 조항이 반쪽이 된다. 사후 삭제와 사전 차단이 짝을 이룬다.
--   **조용히 막지 않는다** — 메시지가 곧 사용자에게 보일 사실 문장이다(ADR-123 contact_submit 선례:
--   errcode 55000 + 한국어 문장). 화면은 입력창을 감추지 않고 이 문장으로 답한다.
--   held 가 아닌 나머지 상태(pending·individual·expired)는 기수 멤버이기만 하면 쓴다 —
--   피드는 진단이 아니므로 member_can_assess 를 재사용하지 않는다.
CREATE FUNCTION public.feed_assert_writable(p_uid uuid DEFAULT auth.uid())
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING errcode = '42501';
  END IF;
  IF public.member_state(p_uid) = 'held' THEN
    RAISE EXCEPTION '계정 확인이 필요해 지금은 글을 올릴 수 없어요. 아래 문의로 알려 주시면 확인해 드릴게요.'
      USING errcode = '55000';
  END IF;
END; $$;

CREATE FUNCTION public.feed_post_create(
  p_cohort_id  uuid,
  p_body       text DEFAULT '',
  p_photo_path text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id   uuid;
  v_body text := COALESCE(btrim(p_body), '');
BEGIN
  PERFORM public.feed_assert_writable(auth.uid());
  IF NOT public.feed_can_access(p_cohort_id, auth.uid()) THEN
    RAISE EXCEPTION 'not a member of this feed' USING errcode = '42501';
  END IF;
  IF v_body = '' AND p_photo_path IS NULL THEN
    RAISE EXCEPTION '한 글자 또는 사진 한 장이 필요해요.' USING errcode = '55000';
  END IF;
  IF char_length(v_body) > 2000 THEN
    RAISE EXCEPTION '2000자까지 쓸 수 있어요.' USING errcode = '55000';
  END IF;
  -- **경로 위조 차단.** 스토리지 정책이 업로드를 이미 가르지만, 남이 올린 사진의 경로를
  --   내 글에 붙이는 것은 업로드가 아니라 참조다. 그 길을 여기서 닫는다.
  IF p_photo_path IS NOT NULL
     AND p_photo_path NOT LIKE (p_cohort_id::text || '/' || auth.uid()::text || '/%') THEN
    RAISE EXCEPTION 'photo path mismatch' USING errcode = '42501';
  END IF;

  INSERT INTO public.feed_posts (cohort_id, author_id, body, photo_path)
  VALUES (p_cohort_id, auth.uid(), v_body, p_photo_path)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

-- 삭제는 soft. **photo_path 를 비운다** — 바이트는 호출 전에 앱이 Storage API 로 이미 지웠다
--   (ADR-87: storage.protect_delete 가 DB 직접 DELETE 를 막고, 그 트리거가 붙어 있으면
--   차수 삭제 자체가 통째로 막힌다). 경로만 남기면 죽은 참조가 된다.
CREATE FUNCTION public.feed_post_delete(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.feed_posts;
BEGIN
  SELECT * INTO v FROM public.feed_posts WHERE id = p_id;
  IF v.id IS NULL THEN RAISE EXCEPTION 'post not found' USING errcode = 'P0002'; END IF;
  IF NOT (v.author_id = auth.uid()
          OR public.is_cohort_coach(v.cohort_id, auth.uid())
          OR public.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;
  IF v.deleted_at IS NOT NULL THEN RETURN; END IF;   -- 멱등
  UPDATE public.feed_posts
     SET deleted_at = now(), deleted_by = auth.uid(), photo_path = NULL
   WHERE id = p_id;
END; $$;

CREATE FUNCTION public.feed_comment_create(p_post_id uuid, p_body text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id   uuid;
  v_body text := COALESCE(btrim(p_body), '');
  v_del  timestamptz;
BEGIN
  PERFORM public.feed_assert_writable(auth.uid());
  IF NOT public.feed_post_accessible(p_post_id, auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;
  SELECT deleted_at INTO v_del FROM public.feed_posts WHERE id = p_post_id;
  IF v_del IS NOT NULL THEN
    RAISE EXCEPTION '지워진 글에는 댓글을 달 수 없어요.' USING errcode = '55000';
  END IF;
  IF char_length(v_body) < 1 OR char_length(v_body) > 1000 THEN
    RAISE EXCEPTION '댓글은 1자에서 1000자까지예요.' USING errcode = '55000';
  END IF;
  INSERT INTO public.feed_comments (post_id, author_id, body)
  VALUES (p_post_id, auth.uid(), v_body) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

CREATE FUNCTION public.feed_comment_delete(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_author uuid;
  v_cohort uuid;
  v_del    timestamptz;
BEGIN
  SELECT c.author_id, p.cohort_id, c.deleted_at
    INTO v_author, v_cohort, v_del
    FROM public.feed_comments c JOIN public.feed_posts p ON p.id = c.post_id
   WHERE c.id = p_id;
  IF v_cohort IS NULL THEN RAISE EXCEPTION 'comment not found' USING errcode = 'P0002'; END IF;
  IF NOT (v_author = auth.uid()
          OR public.is_cohort_coach(v_cohort, auth.uid())
          OR public.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;
  IF v_del IS NOT NULL THEN RETURN; END IF;
  UPDATE public.feed_comments SET deleted_at = now(), deleted_by = auth.uid() WHERE id = p_id;
END; $$;

-- 반응 — 같은 이모지 재호출은 **취소**, 다른 이모지는 **교체**. 반환은 남은 내 반응(취소면 NULL).
CREATE FUNCTION public.feed_react(p_post_id uuid, p_emoji text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cur text;
  v_del timestamptz;
BEGIN
  PERFORM public.feed_assert_writable(auth.uid());
  IF NOT public.feed_post_accessible(p_post_id, auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;
  IF NOT (p_emoji = ANY (public.feed_emojis())) THEN
    RAISE EXCEPTION 'unknown emoji' USING errcode = '22023';
  END IF;
  SELECT deleted_at INTO v_del FROM public.feed_posts WHERE id = p_post_id;
  IF v_del IS NOT NULL THEN
    RAISE EXCEPTION '지워진 글에는 반응할 수 없어요.' USING errcode = '55000';
  END IF;

  SELECT emoji INTO v_cur FROM public.feed_reactions
   WHERE post_id = p_post_id AND user_id = auth.uid();
  IF v_cur = p_emoji THEN
    DELETE FROM public.feed_reactions WHERE post_id = p_post_id AND user_id = auth.uid();
    RETURN NULL;
  END IF;

  INSERT INTO public.feed_reactions (post_id, user_id, emoji)
  VALUES (p_post_id, auth.uid(), p_emoji)
  ON CONFLICT (post_id, user_id) DO UPDATE SET emoji = EXCLUDED.emoji, created_at = now();
  RETURN p_emoji;
END; $$;

-- 소식 댓글 — 전체 가입자가 쓴다(발주 §5.2). held 는 여기서도 막는다(같은 근거).
CREATE FUNCTION public.news_comment_create(p_post_id uuid, p_body text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id   uuid;
  v_body text := COALESCE(btrim(p_body), '');
BEGIN
  PERFORM public.feed_assert_writable(auth.uid());
  IF NOT public.news_post_published(p_post_id) THEN
    RAISE EXCEPTION 'post not found' USING errcode = 'P0002';
  END IF;
  IF char_length(v_body) < 1 OR char_length(v_body) > 1000 THEN
    RAISE EXCEPTION '댓글은 1자에서 1000자까지예요.' USING errcode = '55000';
  END IF;
  INSERT INTO public.news_comments (post_id, author_id, body)
  VALUES (p_post_id, auth.uid(), v_body) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

-- 삭제 권한: 본인 + 운영자 + **그 소식 본문 작성자**(발주 §9-4 확정).
--   피드에서 인도자가 자기 기수 글을 지우는 것과 대칭이다.
CREATE FUNCTION public.news_comment_delete(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_author      uuid;
  v_post_author uuid;
  v_del         timestamptz;
  v_found       boolean;
BEGIN
  SELECT true, c.author_id, n.author_id, c.deleted_at
    INTO v_found, v_author, v_post_author, v_del
    FROM public.news_comments c JOIN public.news_posts n ON n.id = c.post_id
   WHERE c.id = p_id;
  IF v_found IS NOT TRUE THEN RAISE EXCEPTION 'comment not found' USING errcode = 'P0002'; END IF;
  IF NOT (v_author = auth.uid()
          OR public.is_admin(auth.uid())
          OR (v_post_author IS NOT NULL AND v_post_author = auth.uid())) THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;
  IF v_del IS NOT NULL THEN RETURN; END IF;
  UPDATE public.news_comments SET deleted_at = now(), deleted_by = auth.uid() WHERE id = p_id;
END; $$;

-- ============================================================
-- 5. 읽기 RPC
-- ============================================================

-- 내가 피드를 가진 기수. **기본은 가장 최근 활성 기수**(발주 §5.1) — 활성 우선, 그다음 최신순.
--   운영자는 seminar 전체를 본다(§5.1 운영자 읽기 ○).
CREATE FUNCTION public.feed_my_cohorts()
RETURNS TABLE(cohort_id uuid, name text, status text, is_coach boolean, last_post_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.name, c.status, (c.coach_id = auth.uid()),
         (SELECT max(p.created_at) FROM public.feed_posts p
           WHERE p.cohort_id = c.id AND p.deleted_at IS NULL)
    FROM public.cohorts c
   WHERE c.kind = 'seminar'
     AND public.feed_can_access(c.id, auth.uid())
   ORDER BY (c.status = 'active') DESC, c.created_at DESC;
$$;

-- 목록. 키셋 페이지네이션 — (created_at, id) 조합이라 같은 초에 두 글이 들어와도 건너뛰지 않는다.
--   **무한 스크롤이 아니다**(§7-7). 앱이 '더 보기'로 다음 장을 요청한다.
--
-- **묘비 규칙**: 삭제된 글은 **살아 있는 댓글이 있을 때만** 목록에 남는다. §5.3 이 soft delete 를
--   요구한 이유가 "답글이 고아가 되지 않게"이므로, 답글이 없으면 남길 이유도 없다.
--   본문·사진·작성자를 전부 비워 낸다 — 지워진 것은 지워진 것이다.
CREATE FUNCTION public.feed_list(
  p_cohort_id uuid,
  p_before    timestamptz DEFAULT NULL,
  p_before_id uuid        DEFAULT NULL,
  p_limit     int         DEFAULT 20,
  p_mine      boolean     DEFAULT false
) RETURNS TABLE(
  id uuid, author_id uuid, author_name text, body text, photo_path text,
  created_at timestamptz, deleted boolean, comment_count int,
  reactions jsonb, my_reaction text
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_limit int := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
BEGIN
  IF NOT public.feed_can_access(p_cohort_id, auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;
  RETURN QUERY
  SELECT p.id,
         CASE WHEN p.deleted_at IS NULL THEN p.author_id END,
         CASE WHEN p.deleted_at IS NULL THEN u.name END,
         CASE WHEN p.deleted_at IS NULL THEN p.body END,
         CASE WHEN p.deleted_at IS NULL THEN p.photo_path END,
         p.created_at,
         (p.deleted_at IS NOT NULL),
         COALESCE(cc.n, 0)::int,
         COALESCE(rx.j, '{}'::jsonb),
         mr.emoji
    FROM public.feed_posts p
    LEFT JOIN public.users u ON u.id = p.author_id
    LEFT JOIN LATERAL (
      SELECT count(*)::int AS n FROM public.feed_comments fc
       WHERE fc.post_id = p.id AND fc.deleted_at IS NULL) cc ON true
    LEFT JOIN LATERAL (
      SELECT jsonb_object_agg(t.emoji, t.n) AS j
        FROM (SELECT fr.emoji, count(*)::int AS n FROM public.feed_reactions fr
               WHERE fr.post_id = p.id GROUP BY fr.emoji) t) rx ON true
    LEFT JOIN public.feed_reactions mr ON mr.post_id = p.id AND mr.user_id = auth.uid()
   WHERE p.cohort_id = p_cohort_id
     AND (p.deleted_at IS NULL OR cc.n > 0)
     AND (NOT p_mine OR p.author_id = auth.uid())
     AND (p_before IS NULL OR (p.created_at, p.id) < (p_before, COALESCE(p_before_id, p.id)))
   ORDER BY p.created_at DESC, p.id DESC
   LIMIT v_limit;
END; $$;

CREATE FUNCTION public.feed_comment_list(p_post_id uuid)
RETURNS TABLE(id uuid, author_id uuid, author_name text, body text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.feed_post_accessible(p_post_id, auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;
  RETURN QUERY
  SELECT c.id, c.author_id, u.name, c.body, c.created_at
    FROM public.feed_comments c LEFT JOIN public.users u ON u.id = c.author_id
   WHERE c.post_id = p_post_id AND c.deleted_at IS NULL
   ORDER BY c.created_at;
END; $$;

CREATE FUNCTION public.news_comment_list(p_post_id uuid)
RETURNS TABLE(id uuid, author_id uuid, author_name text, body text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.author_id, u.name, c.body, c.created_at
    FROM public.news_comments c LEFT JOIN public.users u ON u.id = c.author_id
   WHERE c.post_id = p_post_id AND c.deleted_at IS NULL
     AND public.news_post_published(p_post_id)
   ORDER BY c.created_at;
$$;

-- ── 인도자 콘솔 전용 둘 (발주 §6.2) ───────────────────────────────────────────
-- **참여자가 불러도 거부한다.** 화면에서 감추는 것은 안전장치가 아니다(IA §5.8).
--   발주 §6.2 의 "참여자에게 이 정보가 새지 않는지 회귀 테스트로 잠근다"를 가드로 이행한다.

-- 최근 흐름 — 판정 없이 사실만(ADR-114 계열). 날짜는 KST(membership_today 와 같은 관용구).
CREATE FUNCTION public.feed_flow(p_cohort_id uuid, p_days int DEFAULT 7)
RETURNS TABLE(day date, posts int, authors int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_days int := LEAST(GREATEST(COALESCE(p_days, 7), 1), 90);
BEGIN
  IF NOT (public.is_cohort_coach(p_cohort_id, auth.uid()) OR public.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;
  RETURN QUERY
  SELECT (p.created_at AT TIME ZONE 'Asia/Seoul')::date AS d,
         count(*)::int, count(DISTINCT p.author_id)::int
    FROM public.feed_posts p
   WHERE p.cohort_id = p_cohort_id
     AND p.deleted_at IS NULL
     AND p.created_at >= now() - (v_days || ' days')::interval
   GROUP BY 1 ORDER BY 1 DESC;
END; $$;

-- 조용한 분 — 기본 3일(발주 §9-1 확정). **파라미터로 둔다** — 운영 중 조정 가능해야 한다.
--   색·순위·정렬로 판정하지 않는다. 목록과 마지막 게시 시각이라는 사실만 낸다.
--   인도자 자신은 세지 않는다(참여자의 안부가 목적이다).
CREATE FUNCTION public.feed_quiet(p_cohort_id uuid, p_days int DEFAULT 3)
RETURNS TABLE(user_id uuid, name text, last_post_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_days int := LEAST(GREATEST(COALESCE(p_days, 3), 1), 90);
BEGIN
  IF NOT (public.is_cohort_coach(p_cohort_id, auth.uid()) OR public.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;
  RETURN QUERY
  SELECT u.id, u.name, lp.last_at
    FROM public.enrollments e
    JOIN public.users   u ON u.id = e.user_id
    JOIN public.cohorts c ON c.id = e.cohort_id
    LEFT JOIN LATERAL (
      SELECT max(p.created_at) AS last_at FROM public.feed_posts p
       WHERE p.cohort_id = e.cohort_id AND p.author_id = e.user_id AND p.deleted_at IS NULL
    ) lp ON true
   WHERE e.cohort_id = p_cohort_id
     AND u.id <> c.coach_id
     AND (lp.last_at IS NULL OR lp.last_at < now() - (v_days || ' days')::interval)
   ORDER BY lp.last_at NULLS FIRST, u.name;
END; $$;

-- ============================================================
-- 6. 스토리지 — 비공개 버킷 하나 (발주 §4 · §4.1)
-- ============================================================
-- 경로 규약: {cohort_id}/{author_id}/{uuid}.jpg  → foldername[1]=cohort, [2]=author
--   갈무리(3단)와 달리 **회차가 없다**. 상한·형식·리사이즈 값은 갈무리와 동일하다.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('feed-photos', 'feed-photos', false, 3145728, array['image/jpeg'])
ON CONFLICT (id) DO NOTHING;

-- 업로드: 본인 경로 + 그 피드에 쓸 자격
CREATE POLICY feed_photos_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'feed-photos'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND public.feed_can_access(((storage.foldername(name))[1])::uuid, auth.uid())
);

-- 열람: **같은 기수 전원**(갈무리보다 넓다 · §4.1). 함께 보는 방이다.
CREATE POLICY feed_photos_select ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'feed-photos'
  AND public.feed_can_access(((storage.foldername(name))[1])::uuid, auth.uid())
);

-- 삭제: 본인 · **코치** · 운영자(갈무리와 다르다 · §4.1 — §5.3 부적절 게시 대응)
CREATE POLICY feed_photos_delete ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'feed-photos'
  AND (
    (storage.foldername(name))[2] = auth.uid()::text
    OR public.is_cohort_coach(((storage.foldername(name))[1])::uuid, auth.uid())
    OR public.is_admin(auth.uid())
  )
);

-- UPDATE 정책 없음 — 사진은 교체 불가(지우고 다시 올린다). 갈무리와 동일.

-- ============================================================
-- 7. 실행 권한
-- ============================================================
REVOKE ALL ON FUNCTION public.feed_emojis()                              FROM PUBLIC;
REVOKE ALL ON FUNCTION public.feed_can_access(uuid, uuid)                FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.feed_post_accessible(uuid, uuid)           FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.news_post_published(uuid)                  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.feed_assert_writable(uuid)                 FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.feed_post_create(uuid, text, text)         FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.feed_post_delete(uuid)                     FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.feed_comment_create(uuid, text)            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.feed_comment_delete(uuid)                  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.feed_react(uuid, text)                     FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.news_comment_create(uuid, text)            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.news_comment_delete(uuid)                  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.feed_my_cohorts()                          FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.feed_list(uuid, timestamptz, uuid, int, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.feed_comment_list(uuid)                    FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.news_comment_list(uuid)                    FROM PUBLIC;
REVOKE ALL ON FUNCTION public.feed_flow(uuid, int)                       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.feed_quiet(uuid, int)                      FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.feed_emojis()                           TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.feed_can_access(uuid, uuid)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.feed_post_accessible(uuid, uuid)        TO authenticated;
-- 소식 댓글은 비로그인도 읽으므로 그 판정 헬퍼는 anon 도 부른다(정책이 이 함수를 탄다).
GRANT EXECUTE ON FUNCTION public.news_post_published(uuid)               TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.feed_assert_writable(uuid)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.feed_post_create(uuid, text, text)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.feed_post_delete(uuid)                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.feed_comment_create(uuid, text)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.feed_comment_delete(uuid)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.feed_react(uuid, text)                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.news_comment_create(uuid, text)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.news_comment_delete(uuid)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.feed_my_cohorts()                       TO authenticated;
GRANT EXECUTE ON FUNCTION public.feed_list(uuid, timestamptz, uuid, int, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.feed_comment_list(uuid)                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.news_comment_list(uuid)                 TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.feed_flow(uuid, int)                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.feed_quiet(uuid, int)                   TO authenticated;

NOTIFY pgrst, 'reload schema';
