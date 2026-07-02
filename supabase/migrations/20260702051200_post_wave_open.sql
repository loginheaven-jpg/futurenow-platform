-- B-1(사후 진단 인프라·코치 개시 · ADR-55): cohorts.post_opened_at + open_post_wave RPC + my_cohorts 반환 확장.
-- 재진단 허용(ADR-33) 유지 — responses UNIQUE 미추가(의도된 다중 행 + latestPerUser dedup). responses 무변경.

-- (1) 사후 개시 상태(단일 nullable). NULL=미개시, 값=개시 시점(사전은 개설=개방이라 컬럼 불요).
ALTER TABLE public.cohorts ADD COLUMN IF NOT EXISTS post_opened_at TIMESTAMPTZ;

-- (2) 코치 사후 개시 RPC — self-scoped DEFINER. 코치 자기 차수(또는 운영자)만, NULL→now() 단방향 멱등.
--     post_opened_at 만 세팅 — role/status/기타 필드 불건드림(권한 상승 경로 아님).
CREATE OR REPLACE FUNCTION public.open_post_wave(p_cohort_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_cohort_coach(p_cohort_id, auth.uid()) OR public.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'not authorized to open post wave for this cohort';
  END IF;
  UPDATE public.cohorts
    SET post_opened_at = now()
    WHERE id = p_cohort_id AND post_opened_at IS NULL; -- 멱등: 이미 열렸으면 no-op
END;
$$;
REVOKE ALL ON FUNCTION public.open_post_wave(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.open_post_wave(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.open_post_wave(UUID) TO authenticated;

-- (3) my_cohorts 반환에 post_opened(bool) 추가(참여자 홈 B-2 소비). RETURNS TABLE 변경이라 DROP 후 재생성.
DROP FUNCTION IF EXISTS public.my_cohorts();
CREATE FUNCTION public.my_cohorts()
RETURNS TABLE(
  cohort_id   uuid,
  name        text,
  coach_name  text,
  status      text,
  pre_done    boolean,
  post_done   boolean,
  post_opened boolean,
  joined_at   timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    c.id, c.name, u.name AS coach_name, c.status,
    EXISTS(SELECT 1 FROM responses r WHERE r.user_id=auth.uid() AND r.cohort_id=c.id AND r.instrument_id=c.instrument_id AND r.wave='pre')  AS pre_done,
    EXISTS(SELECT 1 FROM responses r WHERE r.user_id=auth.uid() AND r.cohort_id=c.id AND r.instrument_id=c.instrument_id AND r.wave='post') AS post_done,
    (c.post_opened_at IS NOT NULL) AS post_opened,
    e.joined_at
  FROM enrollments e
  JOIN cohorts c ON c.id = e.cohort_id
  LEFT JOIN users u ON u.id = c.coach_id
  WHERE e.user_id = auth.uid()
  ORDER BY e.joined_at DESC;
$$;
REVOKE ALL ON FUNCTION public.my_cohorts() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.my_cohorts() FROM anon;
GRANT EXECUTE ON FUNCTION public.my_cohorts() TO authenticated;
