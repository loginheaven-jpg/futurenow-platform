-- 코치 레코드화(지휘부 확정 2026-07-01): 한 사람 = 한 행(신청제·지정제 공용). 재신청=행 갱신, 지정제=S4 게이트 upsert.
-- KPC 인증번호(형식 검증만 — v1.0, 실검증은 plan.md). 라이브 0행이라 UNIQUE 추가 안전.
ALTER TABLE public.coach_applications ADD CONSTRAINT coach_applications_user_id_key UNIQUE (user_id);
ALTER TABLE public.coach_applications ADD COLUMN kpc_number text
  CHECK (kpc_number IS NULL OR kpc_number ~ '^KPC[0-9]{5}$');
