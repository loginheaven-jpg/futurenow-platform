-- 갈무리-2 · 시드 결과를 호출부에 알린다(F1) + 공유동의 컬럼 미사용 주석(C2-e)
-- seed_cohort_sessions 는 ON CONFLICT DO NOTHING 이라, 재시드 시 0건이어도 호출부가 알 수 없었다.
-- 반환형을 void→integer(삽입 행 수)로 바꿔 '조용한 무효'를 막는다. RETURNS 변경이라 DROP 후 재생성.

DROP FUNCTION IF EXISTS public.seed_cohort_sessions(uuid, timestamptz, int, interval);

CREATE FUNCTION public.seed_cohort_sessions(
  p_cohort_id  uuid,
  p_first_held timestamptz,
  p_count      int DEFAULT 7,
  p_interval   interval DEFAULT '7 days'
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_inserted integer;
BEGIN
  IF NOT (public.is_cohort_coach(p_cohort_id, auth.uid()) OR public.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'not authorized to seed sessions for this cohort';
  END IF;

  INSERT INTO public.cohort_sessions (cohort_id, session_no, held_at, opens_at, closes_at)
  SELECT p_cohort_id,
         n,
         p_first_held + (n - 1) * p_interval,
         p_first_held + (n - 1) * p_interval,
         CASE WHEN n < p_count
              THEN p_first_held + n * p_interval - interval '24 hours'
              ELSE p_first_held + (n - 1) * p_interval + interval '7 days'
         END
    FROM generate_series(1, p_count) AS n
  ON CONFLICT (cohort_id, session_no) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;   -- 0 이면 이미 일정이 있어 아무것도 바뀌지 않았다는 뜻(호출부가 편집기로 안내)
END;
$$;

REVOKE ALL ON FUNCTION public.seed_cohort_sessions(uuid, timestamptz, int, interval) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seed_cohort_sessions(uuid, timestamptz, int, interval) TO authenticated;

-- 공유동의(C2-d): 화면 입력 경로 제거. 나눔 동의는 인도자 개별 대면 요청으로 대체. 컬럼은 v1.2 여지로 남김.
COMMENT ON COLUMN public.checkins.share_consent IS
  '미사용(2026-07-28~). 나눔 동의는 인도자의 개별 대면 요청으로 대체. 화면 입력 경로 없음.';

NOTIFY pgrst, 'reload schema';
