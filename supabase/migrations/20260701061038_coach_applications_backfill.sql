-- coach_applications backfill — 라이브 DB에만 있고 repo 마이그레이션에 CREATE 부재였던 드리프트 해소(CLAUDE §5).
-- 라이브 실측(2026-07-01) 정확 복원. 멱등(IF NOT EXISTS / DROP-CREATE) — 라이브엔 no-op, 클린 재적용 시 생성.
CREATE TABLE IF NOT EXISTS public.coach_applications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  motivation   text,
  reviewed_by  uuid REFERENCES public.users(id),
  reviewed_at  timestamptz,
  review_note  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.coach_applications ENABLE ROW LEVEL SECURITY;
-- 신청: 본인(role=user)만. 조회: 본인+운영자. 결정: 운영자.
DROP POLICY IF EXISTS coach_apps_insert ON public.coach_applications;
CREATE POLICY coach_apps_insert ON public.coach_applications FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.user_role(auth.uid()) = 'user');
DROP POLICY IF EXISTS coach_apps_select ON public.coach_applications;
CREATE POLICY coach_apps_select ON public.coach_applications FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS coach_apps_update ON public.coach_applications;
CREATE POLICY coach_apps_update ON public.coach_applications FOR UPDATE
  USING (public.is_admin(auth.uid()));
