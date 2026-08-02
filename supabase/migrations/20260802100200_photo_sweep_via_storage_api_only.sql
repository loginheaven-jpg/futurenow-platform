-- ADR-87 보정 2 — 라이브 실증에서 잡힌 결함.
--   Supabase 는 storage.protect_delete() 트리거로 storage.objects 직접 DELETE 를 금지한다:
--     "Direct deletion from storage tables is not allowed. Use the Storage API instead."
--   따라서 DB 레벨 고아 sweep(차수 삭제 트리거 · remove_cohort_member 내 사진 삭제)은 성립하지 않는다.
--   더 나쁘게는, 그 트리거가 붙어 있는 동안 **차수 삭제 자체가 통째로 막힌다**(실측 확인).
--
--   해법: sweep 을 전부 앱(Storage API) 경로로 옮긴다. DB 는 사진에 관여하지 않는다.
--   - 참여자 영구삭제: removeCohortMemberAction 이 RPC 호출 전에 사진을 먼저 지운다(deleteCheckinPhoto).
--   - 차수 하드삭제: deleteCohortAction 이 같은 방식으로 먼저 지운다.
--   DB 행 삭제로는 S3 바이트가 회수되지 않으므로, 애초에 Storage API 만이 올바른 삭제 경로다.

DROP TRIGGER IF EXISTS cohorts_sweep_checkin_photos ON public.cohorts;
DROP FUNCTION IF EXISTS public.sweep_cohort_checkin_photos();

-- remove_cohort_member 를 ADR-84 형태로 되돌린다(사진 삭제 절 제거). 게이트·나머지 삭제는 불변.
CREATE OR REPLACE FUNCTION public.remove_cohort_member(p_cohort_id uuid, p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.is_cohort_coach(p_cohort_id, auth.uid()) OR public.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  -- 사진은 여기서 지우지 않는다(Storage API 전용). 호출 전에 앱이 먼저 지운다.
  DELETE FROM public.checkins        WHERE cohort_id = p_cohort_id AND user_id = p_user_id;
  DELETE FROM public.responses       WHERE cohort_id = p_cohort_id AND user_id = p_user_id;
  DELETE FROM public.response_drafts WHERE cohort_id = p_cohort_id AND user_id = p_user_id;
  DELETE FROM public.enrollments     WHERE cohort_id = p_cohort_id AND user_id = p_user_id;
END; $$;

NOTIFY pgrst, 'reload schema';
