-- createCoachApplication 자가신청 — self-scoped DEFINER. coach_apps_update RLS=admin-only 라 upsert 를 RLS INSERT 로 표현 불가
-- → DEFINER RPC(내부 auth.uid 자가스코프, decide_coach_application·set_user_role 선례). 신청 자격 role=user.
-- 재신청/재제출은 ON CONFLICT(user_id) DO UPDATE: status 를 pending 으로 되돌리고 motivation·kpc 만 덮어씀(reviewer 흔적 초기화).
-- status 전이 규칙: 이 RPC 는 "신청" 의미라 항상 pending 으로 전이. 지정제 upsert(S4, status=approved 유지)와는 다른 경로 — 충돌 없음.
CREATE OR REPLACE FUNCTION public.create_coach_application(p_motivation text, p_kpc_number text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF public.user_role(auth.uid()) <> 'user' THEN RAISE EXCEPTION 'only participants can apply'; END IF;
  INSERT INTO public.coach_applications (user_id, status, motivation, kpc_number)
  VALUES (auth.uid(), 'pending', p_motivation, p_kpc_number)
  ON CONFLICT (user_id) DO UPDATE
    SET status      = 'pending',
        motivation  = EXCLUDED.motivation,
        kpc_number  = EXCLUDED.kpc_number,
        reviewed_by = NULL, reviewed_at = NULL, review_note = NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.create_coach_application(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_coach_application(text, text) TO authenticated;

-- 견고화(관찰 둘): 직접 REST INSERT 로 status='approved' 밀어넣기 차단 — 신청 INSERT 는 항상 pending 만.
DROP POLICY IF EXISTS coach_apps_insert ON public.coach_applications;
CREATE POLICY coach_apps_insert ON public.coach_applications FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.user_role(auth.uid()) = 'user' AND status = 'pending');
