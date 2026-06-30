-- B③-1 · 코치 리포트 해석 문구 — report_interpretations
-- AI 생성 원문(ai_content·불변·감사) + 코치 수정본(coach_content·null=미수정). 유효 문구 = coach_content ?? ai_content(앱 읽기 coalesce).
-- 코치·운영자만(RLS, is_cohort_coach/is_admin 재사용 — responses_select에서 본인 분기 제외). 참여자 비노출(v1.1 독자=코치 리포트).
-- 생성/프롬프트는 인스트루먼트(B③-2). 이 마이그는 그릇만.
CREATE TABLE public.report_interpretations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id   uuid NOT NULL REFERENCES public.responses(id) ON DELETE CASCADE,
  cohort_id     uuid REFERENCES public.cohorts(id) ON DELETE SET NULL,
  ai_content    jsonb NOT NULL,              -- 게이트웨이 생성 원문(구조화). 앱 규약상 불변
  ai_model      text,                         -- 응답 model 추적
  coach_content jsonb,                        -- 코치 수정본(null = AI문 유효)
  edited_by     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  edited_at     timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (response_id)                        -- 응답당 1개(지연 생성·재생성 시 갱신)
);
CREATE INDEX idx_report_interp_cohort ON public.report_interpretations(cohort_id);

ALTER TABLE public.report_interpretations ENABLE ROW LEVEL SECURITY;

-- 코치(자기 차수)·운영자만. 본인(참여자) 분기 없음 — 코치 리포트 전용.
CREATE POLICY report_interp_select ON public.report_interpretations FOR SELECT
  USING ((cohort_id IS NOT NULL AND public.is_cohort_coach(cohort_id, auth.uid())) OR public.is_admin(auth.uid()));
CREATE POLICY report_interp_insert ON public.report_interpretations FOR INSERT
  WITH CHECK ((cohort_id IS NOT NULL AND public.is_cohort_coach(cohort_id, auth.uid())) OR public.is_admin(auth.uid()));
CREATE POLICY report_interp_update ON public.report_interpretations FOR UPDATE
  USING ((cohort_id IS NOT NULL AND public.is_cohort_coach(cohort_id, auth.uid())) OR public.is_admin(auth.uid()))
  WITH CHECK ((cohort_id IS NOT NULL AND public.is_cohort_coach(cohort_id, auth.uid())) OR public.is_admin(auth.uid()));
CREATE POLICY report_interp_delete ON public.report_interpretations FOR DELETE
  USING ((cohort_id IS NOT NULL AND public.is_cohort_coach(cohort_id, auth.uid())) OR public.is_admin(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_interpretations TO authenticated;
