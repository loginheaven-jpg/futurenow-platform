-- 20260629025232_my_cohorts.sql
-- 멤버 본인의 차수 목록 + 진행 상태(비민감 메타). cohorts RLS 미개방, DEFINER 격리. (ADR-29)
-- 진행 판정: 해당 wave의 responses row 존재 = 완료(responses 불변·완료컬럼 없음).
-- previewCohortByCode(코드·미가입자)와 목적 분리 — 이쪽은 enrollment 기반 가입자(auth.uid()).
-- 반환은 비민감 메타뿐(차수명·코치명·status·진행·가입일). coach_id·code·max_members 미반환.
CREATE OR REPLACE FUNCTION public.my_cohorts()
RETURNS TABLE(
  cohort_id  uuid,
  name       text,
  coach_name text,
  status     text,
  pre_done   boolean,
  post_done  boolean,
  joined_at  timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.name,
    u.name AS coach_name,
    c.status,
    EXISTS(SELECT 1 FROM responses r
           WHERE r.user_id = auth.uid() AND r.cohort_id = c.id
             AND r.instrument_id = c.instrument_id AND r.wave = 'pre')  AS pre_done,
    EXISTS(SELECT 1 FROM responses r
           WHERE r.user_id = auth.uid() AND r.cohort_id = c.id
             AND r.instrument_id = c.instrument_id AND r.wave = 'post') AS post_done,
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
