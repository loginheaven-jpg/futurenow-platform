-- 동행 피드 반응 — **복수 선택** (5차 소건 2 · 2차 확정의 개정).
--
-- **왜 개정인가.** 2차(ADR-124)는 한 사람이 한 글에 반응 **하나**를 두도록 확정했고
--   그것을 `PRIMARY KEY (post_id, user_id)` 로 **구조에 박았다.** 규칙이 아니라 구조라서
--   화면만 고쳐서는 열리지 않는다. 최박사 F-5 실기기 회신이 *"박수와 기도를 함께"* 를 냈고
--   지휘부가 **2차 확정의 개정으로 수용**했다(유니크 제약 변경 소건).
--
-- **불변식 15 — 적용된 마이그레이션 파일을 고치지 않는다.** `20260828100000_feed.sql` 은
--   그대로 두고 여기서 바꾼다. 그 파일을 열어 PK 한 줄을 고치는 쪽이 짧지만,
--   이미 적용된 파일을 고치면 **적용된 곳과 저장소가 갈린다.**
--
-- **데이터는 하나도 잃지 않는다.** PK 를 넓히는 방향이라(2열 → 3열) 기존 행이 전부 그대로 유효하다.
--   좁히는 변경이었다면 소실이 생겨 사전 판정이 필요했을 것이다.

-- ============================================================
-- 1. 제약 — 한 사람 한 개 → 한 사람 이모지마다 하나
-- ============================================================

-- `(post_id, user_id)` 가 PK 였으므로 **그 이름의 제약을 지우고** 3열로 다시 만든다.
--   PK 이름은 Postgres 기본 규칙(`<table>_pkey`)을 따른다.
ALTER TABLE public.feed_reactions DROP CONSTRAINT feed_reactions_pkey;
ALTER TABLE public.feed_reactions ADD PRIMARY KEY (post_id, user_id, emoji);

-- 내 반응을 모을 때 `(post_id, user_id)` 로 훑는다. PK 접두사가 그것이라 별도 인덱스는 두지 않는다.

-- ============================================================
-- 2. 쓰기 RPC — 교체가 아니라 **토글**
-- ============================================================

-- 옛 `feed_react` 는 *"같은 이모지면 취소, **다른 이모지면 교체**"* 였다. 교체가 곧 단일 선택의 강제였다.
--   이제 **누른 것만 켜고 끈다.** 반환은 남은 내 반응 **전부**다(빈 배열이 무반응).
--
-- **반환 타입이 바뀌므로 먼저 지운다** — Postgres 는 반환 타입만 다른 같은 이름을 대체하지 못한다.
DROP FUNCTION IF EXISTS public.feed_react(uuid, text);

CREATE FUNCTION public.feed_react(p_post_id uuid, p_emoji text)
RETURNS text[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_del timestamptz;
  v_had boolean;
  v_mine text[];
BEGIN
  -- 게이트 순서를 옛 함수와 **똑같이** 둔다(쓰기 자격 → 열람 자격 → 이모지 → 묘비).
  --   순서가 바뀌면 거부 사유 문장이 달라지고, 그 문장은 곧 사용자에게 보이는 사실이다.
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

  SELECT EXISTS (
    SELECT 1 FROM public.feed_reactions
     WHERE post_id = p_post_id AND user_id = auth.uid() AND emoji = p_emoji
  ) INTO v_had;

  IF v_had THEN
    DELETE FROM public.feed_reactions
     WHERE post_id = p_post_id AND user_id = auth.uid() AND emoji = p_emoji;
  ELSE
    INSERT INTO public.feed_reactions (post_id, user_id, emoji)
    VALUES (p_post_id, auth.uid(), p_emoji)
    ON CONFLICT (post_id, user_id, emoji) DO NOTHING; -- 두 번 눌린 경우(경합) — 조용히 넘긴다
  END IF;

  -- **순서를 고정한다** — `feed_emojis()` 의 선언 순서. 정렬 기준이 없으면 같은 상태가
  --   호출마다 다른 배열로 와서 화면이 깜빡이고 테스트가 흔들린다.
  SELECT COALESCE(array_agg(e.emoji ORDER BY e.ord), ARRAY[]::text[])
    INTO v_mine
    FROM (SELECT emoji, ord FROM unnest(public.feed_emojis()) WITH ORDINALITY AS t(emoji, ord)) e
    JOIN public.feed_reactions fr
      ON fr.emoji = e.emoji AND fr.post_id = p_post_id AND fr.user_id = auth.uid();

  RETURN v_mine;
END; $$;

-- ============================================================
-- 3. 목록 RPC — my_reaction text → my_reactions text[]
-- ============================================================

-- 반환 테이블의 열 이름·타입이 바뀌므로 이것도 먼저 지운다.
DROP FUNCTION IF EXISTS public.feed_post_list(uuid, boolean, timestamptz, uuid, int);

CREATE FUNCTION public.feed_post_list(
  p_cohort_id uuid,
  p_mine      boolean DEFAULT false,
  p_before    timestamptz DEFAULT NULL,
  p_before_id uuid DEFAULT NULL,
  p_limit     int DEFAULT 20
) RETURNS TABLE(
  id uuid, author_id uuid, author_name text, body text, photo_path text,
  created_at timestamptz, deleted boolean, comment_count int,
  reactions jsonb, my_reactions text[]
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
         COALESCE(mr.arr, ARRAY[]::text[])
    FROM public.feed_posts p
    LEFT JOIN public.users u ON u.id = p.author_id
    LEFT JOIN LATERAL (
      SELECT count(*)::int AS n FROM public.feed_comments fc
       WHERE fc.post_id = p.id AND fc.deleted_at IS NULL) cc ON true
    LEFT JOIN LATERAL (
      SELECT jsonb_object_agg(t.emoji, t.n) AS j
        FROM (SELECT fr.emoji, count(*)::int AS n FROM public.feed_reactions fr
               WHERE fr.post_id = p.id GROUP BY fr.emoji) t) rx ON true
    -- 내 반응이 **여럿**이 됐으므로 조인이 아니라 집계다. 조인으로 두면 글이 반응 수만큼 복제된다.
    --   순서는 쓰기 RPC 와 **같은 기준**(`feed_emojis()` 선언 순서)이다 — 두 곳이 갈리면
    --   목록과 낙관적 갱신의 배열 순서가 달라 화면이 흔들린다.
    LEFT JOIN LATERAL (
      SELECT array_agg(e.emoji ORDER BY e.ord) AS arr
        FROM (SELECT emoji, ord FROM unnest(public.feed_emojis()) WITH ORDINALITY AS t(emoji, ord)) e
        JOIN public.feed_reactions fr2
          ON fr2.emoji = e.emoji AND fr2.post_id = p.id AND fr2.user_id = auth.uid()) mr ON true
   WHERE p.cohort_id = p_cohort_id
     AND (p.deleted_at IS NULL OR cc.n > 0)
     AND (NOT p_mine OR p.author_id = auth.uid())
     AND (p_before IS NULL OR (p.created_at, p.id) < (p_before, COALESCE(p_before_id, p.id)))
   ORDER BY p.created_at DESC, p.id DESC
   LIMIT v_limit;
END; $$;

-- ============================================================
-- 4. 권한 — 새로 만든 함수는 기본 권한이 다시 붙으므로 원복한다
-- ============================================================
-- DROP 하면 옛 GRANT/REVOKE 도 함께 사라진다. `20260828100000_feed.sql` 과 **같은 모양**으로 되돌린다.
REVOKE ALL ON FUNCTION public.feed_react(uuid, text)                              FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.feed_post_list(uuid, boolean, timestamptz, uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.feed_react(uuid, text)                            TO authenticated;
GRANT EXECUTE ON FUNCTION public.feed_post_list(uuid, boolean, timestamptz, uuid, int) TO authenticated;
