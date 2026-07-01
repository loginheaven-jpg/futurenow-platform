-- 코치 본인 KPC upsert(S4 보완 게이트). 지정제 코치(role=coach·신청 이력 없음)는 createCoachApplication(role=user 게이트) 재사용 불가 → 별도 self-scoped DEFINER.
-- 자격: role=coach 만(참여자는 신청 RPC, 운영자는 KPC 불요). 형식 검증(RPC 방어 + DB CHECK 이중).
-- upsert: 행 없으면(지정제) status='approved' 신규(직접 승격 반영 — pending 큐 미노출). 행 있으면 kpc 만 갱신(status 무변경 — 신청제 이력·지정제 approved 보존).
-- 절대 금지: role 미변경(이 RPC 는 role 안 건드림). status 는 신규 approved·기존 무변경만 — 권한 상승 경로 아님.
CREATE OR REPLACE FUNCTION public.set_my_coach_kpc(p_kpc text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF public.user_role(auth.uid()) <> 'coach' THEN RAISE EXCEPTION 'coach only'; END IF;
  IF p_kpc !~ '^KPC[0-9]{5}$' THEN RAISE EXCEPTION 'invalid kpc format'; END IF;
  INSERT INTO public.coach_applications (user_id, status, kpc_number)
  VALUES (auth.uid(), 'approved', p_kpc)
  ON CONFLICT (user_id) DO UPDATE SET kpc_number = p_kpc; -- status 무변경
END;
$$;
REVOKE ALL ON FUNCTION public.set_my_coach_kpc(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_coach_kpc(text) TO authenticated;
