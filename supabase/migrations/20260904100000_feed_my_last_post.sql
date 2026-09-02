-- 동행 피드 — **내가 마지막으로 쓴 날** (ADR-180 · 지휘부 지시 2026-09-02).
--
-- **왜 필요한가**: 대시보드의 「동행 피드」 버튼에 마지막 쓴 날을 병기한다.
--   날짜는 이미 `feed_posts.created_at` 에 있다 — **없는 것은 집계 경로**뿐이다.
--   앱은 테이블을 직접 보지 않으므로(불변식 4) 함수로 낸다.
--
-- **넓히는 변경이라 스키마가 먼저다**(CLAUDE §5). 이 함수가 없으면 새 코드가 부를 것이 없다.
--   기존 함수를 고치지 않고 **더하기만 한다** — 옛 코드는 이 함수를 모르므로 영향이 0이다.
--
-- **자기 것만 낸다.** `auth.uid()` 로 고정이고 인자로 사용자를 받지 않는다 —
--   받으면 남의 활동 시각을 물어보는 문이 생긴다. 열람 자격은 `feed_can_access` 가 한 번 더 본다
--   (자기 글만 세더라도, **자격 없는 기수에 대해 「0건」과 「없음」을 구별해 주지 않기 위해서**다).
--
-- **삭제한 글은 세지 않는다** — 묘비는 게시가 아니다(원 마이그레이션의 같은 판단).

CREATE FUNCTION public.feed_my_last_post_at(p_cohort_id uuid)
RETURNS timestamptz LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT max(p.created_at)
    FROM public.feed_posts p
   WHERE p.cohort_id = p_cohort_id
     AND p.author_id = auth.uid()
     AND p.deleted_at IS NULL
     AND public.feed_can_access(p_cohort_id);
$$;

-- 실행 권한 — 원 마이그레이션과 같은 모양(먼저 회수하고 필요한 역할에만 준다).
--   `REVOKE ... FROM PUBLIC` 은 `anon` 을 지우지 않으므로 함께 적는다.
REVOKE ALL ON FUNCTION public.feed_my_last_post_at(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.feed_my_last_post_at(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
