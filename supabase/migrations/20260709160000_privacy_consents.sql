-- 개인정보 동의 이력 + 연락처 확장(주소·계좌). 지휘부 지시 2026-07-09. ADR-76.
-- user_consents: 정보주체/취급자 동의 기록(감사·재동의 대응). type: privacy_use(멤버 필수)·sensitive_use(민감 선택)·coach_pledge(인도자 서약).
--   본인 기록/조회 + 운영자 전체 조회(RLS). version 으로 약관 개정 시 재동의 판정.
CREATE TABLE IF NOT EXISTS public.user_consents (
  user_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type      text NOT NULL CHECK (type IN ('privacy_use', 'sensitive_use', 'coach_pledge')),
  version   text NOT NULL,
  agreed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, type)
);
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_consents_select ON public.user_consents FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY user_consents_insert ON public.user_consents FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY user_consents_update ON public.user_consents FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
GRANT SELECT, INSERT, UPDATE ON public.user_consents TO authenticated;

-- 연락처 확장(주소·계좌[개근장학금 입금]) — 운영자·본인 격리(기존 user_contacts contacts_self/contacts_admin_read 정책 그대로 적용).
--   인도자에겐 비노출(cohort_member_detail 은 phone 만 반환) — 운영 목적 정보라 운영자 전용. 금융정보 앱단 암호화는 후속 강화.
ALTER TABLE public.user_contacts ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.user_contacts ADD COLUMN IF NOT EXISTS bank_account text;
