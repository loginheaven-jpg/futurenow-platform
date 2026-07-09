-- 차수에서 참여자 제거(휴지통) — 지휘부 지시 2026-07-09.
-- 자격: 해당 차수 코치 OR 운영자(is_cohort_coach OR is_admin). 이 차수 한정으로 참여자의 진단·참여를 완전 삭제한다.
--   삭제: responses(이 차수·이 사용자) → alerts·report_interpretations 는 response_id ON DELETE CASCADE 로 자동 정리.
--         response_drafts(중간저장) + enrollments(참여) 제거. 사용자 계정·타 차수 데이터는 불변(이 차수만).
-- 불변식 예외(§10): responses·alerts 는 일반 경로에선 불변이나, 오염·오등록 정리는 관리 작업이라
--   코치(자기 차수)·운영자 게이트 DEFINER 로만 삭제를 허용한다(참여자·직접 테이블 경로의 불변은 그대로).
CREATE OR REPLACE FUNCTION public.remove_cohort_member(p_cohort_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_cohort_coach(p_cohort_id, auth.uid()) OR public.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  DELETE FROM public.responses      WHERE cohort_id = p_cohort_id AND user_id = p_user_id; -- → alerts·report_interpretations CASCADE
  DELETE FROM public.response_drafts WHERE cohort_id = p_cohort_id AND user_id = p_user_id;
  DELETE FROM public.enrollments     WHERE cohort_id = p_cohort_id AND user_id = p_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.remove_cohort_member(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_cohort_member(uuid,uuid) TO authenticated;
