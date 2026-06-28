-- 20260628095527_decide_coach_application.sql
-- 운영자만. 신청 상태 변경 + (승인 시) users.role 'user'->'coach' 를 원자적으로(ADR-05·ADR-24).
-- 가드: ① 내부 is_admin 명시(DEFINER가 RLS 우회) ② decision 화이트리스트 ③ FOR UPDATE 행잠금(이중 결정 차단)
--       ④ status='pending' 가드(멱등) ⑤ 상태변경+승격 한 트랜잭션 ⑥ role='user'에서만 승격(운영자·코치 불변).
CREATE OR REPLACE FUNCTION public.decide_coach_application(
  p_application_id uuid,
  p_decision text,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_status  text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;
  IF p_decision NOT IN ('approved','rejected') THEN
    RAISE EXCEPTION 'invalid decision: %', p_decision USING errcode = '22023';
  END IF;

  SELECT user_id, status INTO v_user_id, v_status
  FROM public.coach_applications
  WHERE id = p_application_id
  FOR UPDATE;                       -- 동시 이중 결정 차단

  IF NOT FOUND THEN
    RAISE EXCEPTION 'application not found' USING errcode = 'P0002';
  END IF;
  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'already decided: %', v_status USING errcode = '55000';  -- 멱등 가드
  END IF;

  UPDATE public.coach_applications
  SET status = p_decision,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = p_note
  WHERE id = p_application_id;

  IF p_decision = 'approved' THEN
    UPDATE public.users
    SET role = 'coach'
    WHERE id = v_user_id AND role = 'user';   -- user에서만 승격(admin 불변)
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.decide_coach_application(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_coach_application(uuid, text, text) TO authenticated;
