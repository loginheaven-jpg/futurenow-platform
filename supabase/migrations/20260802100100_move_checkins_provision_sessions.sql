-- ADR-87 보정 1 — 라이브 실증에서 잡힌 결함.
--   checkins 는 (cohort_id, session_no) 로 cohort_sessions 를 참조하는 FK 를 갖는다.
--   그래서 일정이 없는 차수(휴지통·미배정·아직 시드 안 한 차수)로 옮기면 FK 위반으로 이동 전체가 실패한다.
--   실측: 휴지통·미배정(JOINF)·2기 모두 cohort_sessions 0행 → 갈무리 보유자의 삭제(=휴지통 이동)가 막힌다.
--
--   해법: 옮길 회차의 일정이 대상에 없으면 원 차수의 일정 행을 복사해 채운다.
--   대상에 이미 그 회차 일정이 있으면 대상 것을 존중한다(ON CONFLICT DO NOTHING).
--   부작용 주의: 미시드 차수로 옮기면 그 차수에 원 차수 날짜가 먼저 박힌다. 이후 seed_cohort_sessions 는
--   ON CONFLICT DO NOTHING 이라 그 행을 건너뛰므로, 인도자는 회차별 날짜 편집기(upsertCohortSessions·ADR-82)로
--   바로잡는다. 운영 권고: 참여자를 옮기기 전에 대상 차수 일정을 먼저 등록한다.
CREATE OR REPLACE FUNCTION public.move_cohort_member(p_user uuid, p_from uuid, p_to uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'admin only'; END IF;
  IF p_from = p_to THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM enrollments WHERE cohort_id=p_from AND user_id=p_user) THEN
    RAISE EXCEPTION 'not enrolled in source cohort';
  END IF;

  -- 회차 충돌분 제거(대상 행이 참여자의 현재 기록 — enrollment 병합 규약과 동일)
  DELETE FROM checkins src
   WHERE src.cohort_id = p_from AND src.user_id = p_user
     AND EXISTS (
       SELECT 1 FROM checkins dst
        WHERE dst.cohort_id = p_to AND dst.user_id = p_user AND dst.session_no = src.session_no
     );

  -- 옮길 회차의 일정이 대상에 없으면 원 차수 일정을 복사(FK 충족)
  INSERT INTO cohort_sessions (cohort_id, session_no, held_at, opens_at, closes_at)
  SELECT p_to, s.session_no, s.held_at, s.opens_at, s.closes_at
    FROM cohort_sessions s
   WHERE s.cohort_id = p_from
     AND s.session_no IN (SELECT session_no FROM checkins WHERE cohort_id = p_from AND user_id = p_user)
  ON CONFLICT (cohort_id, session_no) DO NOTHING;

  UPDATE checkins SET cohort_id = p_to WHERE cohort_id = p_from AND user_id = p_user;

  IF EXISTS (SELECT 1 FROM enrollments WHERE cohort_id=p_to AND user_id=p_user) THEN
    DELETE FROM enrollments WHERE cohort_id=p_from AND user_id=p_user;
  ELSE
    UPDATE enrollments SET cohort_id=p_to WHERE cohort_id=p_from AND user_id=p_user;
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.move_cohort_member(uuid,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.move_cohort_member(uuid,uuid,uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
