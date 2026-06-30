-- 진단-1B · 중간저장 — response_drafts (제출 전 작성본 보존, 본인 한정)
-- responses(불변·정식 제출)와 분리. PK(user,cohort,wave) = 사람·차수·wave당 작성본 1개(최신 덮어쓰기).
-- step/진행 인덱스 미저장(셔플 안전): answers만. 재개 시 "안 푼 첫 필수 문항"으로 위치 재계산(앱).
-- RLS: 본인만(user_id=auth.uid()). INSERT/UPDATE는 responses_insert 선례대로 차수 멤버여야 함(is_cohort_member).
CREATE TABLE public.response_drafts (
  user_id       uuid NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  cohort_id     uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  instrument_id text NOT NULL,
  wave          text NOT NULL CHECK (wave IN ('pre','post')),
  answers       jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, cohort_id, wave)
);

ALTER TABLE public.response_drafts ENABLE ROW LEVEL SECURITY;

-- SELECT/DELETE: 본인 행만.
CREATE POLICY response_drafts_select ON public.response_drafts FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY response_drafts_delete ON public.response_drafts FOR DELETE
  USING (user_id = auth.uid());

-- INSERT/UPDATE: 본인 + 해당 차수 멤버(responses_insert 와 동일 게이트).
CREATE POLICY response_drafts_insert ON public.response_drafts FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.is_cohort_member(cohort_id, auth.uid()));
CREATE POLICY response_drafts_update ON public.response_drafts FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND public.is_cohort_member(cohort_id, auth.uid()));

-- 권한: 로그인 사용자만(anon 불요 — 중간저장은 인증 경로). 실제 행 접근은 위 RLS가 본인으로 제한.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.response_drafts TO authenticated;
