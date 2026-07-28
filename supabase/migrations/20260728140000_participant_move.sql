-- 참여자 이동/삭제(ADR-84). 휴지통 특수 차수 + move_cohort_member(운영자) + remove 보강(checkins) + my_cohorts 휴지통 제외.
--   이동 = enrollment.cohort_id 만 옮김(응답·갈무리 불변). 삭제 = 휴지통으로 이동(소프트·복원 가능). 복원 = 휴지통→general(체험).
--   집계 clean 은 rosterModel 등록 기준 필터로 처리(응답 불변). 영구삭제(휴지통 비우기) = remove_cohort_member.

-- 1) 휴지통 차수 시드(멱등). 운영자 소유·참여자 화면 숨김(my_cohorts 제외). 코드 TRASH(5자·허용문자).
INSERT INTO public.cohorts (coach_id, instrument_id, name, code, status, max_members, expires_at)
SELECT u.id, 'futurenow', '휴지통', 'TRASH', 'active', 1000000, NULL
  FROM public.users u WHERE u.role='admin' ORDER BY u.created_at LIMIT 1
ON CONFLICT (code) DO NOTHING;

-- 2) 이동 RPC — 운영자만. enrollment 만 옮긴다. 대상에 이미 등록돼 있으면 원본만 제거(병합).
CREATE OR REPLACE FUNCTION public.move_cohort_member(p_user uuid, p_from uuid, p_to uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'admin only'; END IF;
  IF p_from = p_to THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM enrollments WHERE cohort_id=p_from AND user_id=p_user) THEN
    RAISE EXCEPTION 'not enrolled in source cohort';
  END IF;
  IF EXISTS (SELECT 1 FROM enrollments WHERE cohort_id=p_to AND user_id=p_user) THEN
    DELETE FROM enrollments WHERE cohort_id=p_from AND user_id=p_user;   -- 이미 대상에 있음 → 병합
  ELSE
    UPDATE enrollments SET cohort_id=p_to WHERE cohort_id=p_from AND user_id=p_user;
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.move_cohort_member(uuid,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.move_cohort_member(uuid,uuid,uuid) TO authenticated;

-- 3) remove_cohort_member 보강 — checkins 도 삭제(ADR-80 이후 구멍). 영구삭제(휴지통 비우기)용. 게이트 불변.
CREATE OR REPLACE FUNCTION public.remove_cohort_member(p_cohort_id uuid, p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.is_cohort_coach(p_cohort_id, auth.uid()) OR public.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  DELETE FROM public.checkins        WHERE cohort_id = p_cohort_id AND user_id = p_user_id;
  DELETE FROM public.responses       WHERE cohort_id = p_cohort_id AND user_id = p_user_id;
  DELETE FROM public.response_drafts WHERE cohort_id = p_cohort_id AND user_id = p_user_id;
  DELETE FROM public.enrollments     WHERE cohort_id = p_cohort_id AND user_id = p_user_id;
END; $$;

-- 4) my_cohorts — 휴지통 차수는 참여자 '내 세미나'에서 제외(소프트 삭제된 사람이 휴지통을 보지 않도록). 11필드·시그니처 불변.
CREATE OR REPLACE FUNCTION public.my_cohorts()
RETURNS TABLE(
  cohort_id                 uuid,
  name                      text,
  coach_name                text,
  status                    text,
  pre_done                  boolean,
  post_done                 boolean,
  post_opened               boolean,
  open_session_no           int,
  open_session_submitted    boolean,
  open_session_has_content  boolean,
  joined_at                 timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    c.id, c.name, u.name AS coach_name, c.status,
    EXISTS(SELECT 1 FROM responses r WHERE r.user_id=auth.uid() AND r.cohort_id=c.id AND r.instrument_id=c.instrument_id AND r.wave='pre')  AS pre_done,
    EXISTS(SELECT 1 FROM responses r WHERE r.user_id=auth.uid() AND r.cohort_id=c.id AND r.instrument_id=c.instrument_id AND r.wave='post') AS post_done,
    (c.post_opened_at IS NOT NULL) AS post_opened,
    open_sess.session_no AS open_session_no,
    COALESCE(ck.submitted_at IS NOT NULL, false) AS open_session_submitted,
    COALESCE(ck.has_content, false) AS open_session_has_content,
    e.joined_at
  FROM enrollments e
  JOIN cohorts c ON c.id = e.cohort_id
  LEFT JOIN users u ON u.id = c.coach_id
  LEFT JOIN LATERAL (
    SELECT cs.session_no
    FROM cohort_sessions cs
    WHERE cs.cohort_id = c.id AND now() BETWEEN cs.opens_at AND cs.closes_at
    ORDER BY cs.session_no
    LIMIT 1
  ) open_sess ON true
  LEFT JOIN checkins ck ON ck.cohort_id = c.id AND ck.user_id = auth.uid() AND ck.session_no = open_sess.session_no
  WHERE e.user_id = auth.uid()
    AND c.code <> 'TRASH'   -- 휴지통 숨김
  ORDER BY e.joined_at DESC;
$$;
REVOKE ALL ON FUNCTION public.my_cohorts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_cohorts() TO authenticated;

NOTIFY pgrst, 'reload schema';
