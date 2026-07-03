-- 리포트 해석 저장 RPC(#3 자동 사전생성 지원) — 지휘부 지시 2026-07-03.
-- 자격: 응답 소유자(참여자 — 자기 응답 사전생성) OR 차수 코치 OR 운영자.
--   없을 때만 INSERT(멱등·ON CONFLICT DO NOTHING) — 기존 AI 원문/코치 수정본을 덮어쓰지 않음.
--   저장된(또는 기존) 행을 반환 — DEFINER 라 RLS 를 우회해 반환 → 참여자 경로도 재조회 없이 뷰 구성(참여자는 SELECT RLS 로 못 읽음).
-- 분리 유지(§7·§9.4): 참여자는 '저장'만. 열람(getInterpretation)은 여전히 report_interpretations SELECT RLS(코치·운영자) →
--   참여자는 자기 해석을 볼 수 없다(임상 어휘 미노출). 사전생성은 순수 지연 최적화(코치가 즉시 열람).
-- 트레이드오프(ADR-72): authenticated EXECUTE 부여라 참여자가 자기 응답 해석을 직접 RPC 로 1회 선점 가능(자기범위·코치 '다듬기'로 복구·타인 무영향).
--   서비스롤 클라이언트 도입(앱에 전면 RLS 우회 능력 신설)을 회피한 최소 확대 선택.
CREATE OR REPLACE FUNCTION public.save_report_interpretation(
  p_response_id uuid, p_cohort_id uuid, p_ai_content jsonb, p_ai_model text
) RETURNS public.report_interpretations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_owner uuid; v_row public.report_interpretations;
BEGIN
  SELECT user_id INTO v_owner FROM public.responses WHERE id = p_response_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'response not found'; END IF;
  IF NOT (v_owner = auth.uid()
          OR (p_cohort_id IS NOT NULL AND public.is_cohort_coach(p_cohort_id, auth.uid()))
          OR public.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  INSERT INTO public.report_interpretations(response_id, cohort_id, ai_content, ai_model)
  VALUES (p_response_id, p_cohort_id, p_ai_content, p_ai_model)
  ON CONFLICT (response_id) DO NOTHING; -- 없을 때만(기존 원문/수정본 보존)
  SELECT * INTO v_row FROM public.report_interpretations WHERE response_id = p_response_id;
  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.save_report_interpretation(uuid,uuid,jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_report_interpretation(uuid,uuid,jsonb,text) TO authenticated;
