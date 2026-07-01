-- 참여 프로필(성별·생년·종교·신앙연수) — 코어 소유 별도 테이블. users 본체 미오염(SAIL 형제 인스트루먼트 영향 0), user_contacts 격리 선례(ADR-04).
-- CoreUser 타입 무변경 → 신원/부가프로필 분리. 도메인 값(종교·신앙연수)도 표준 인구통계라 계정 저장(재사용) — 강의 어휘 아님.
CREATE TABLE public.user_profiles (
  user_id     uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  gender      text CHECK (gender IS NULL OR gender IN ('남성','여성','기타')),
  birth_year  int  CHECK (birth_year IS NULL OR birth_year BETWEEN 1900 AND 2100),
  religion    text,
  faith_years int  CHECK (faith_years IS NULL OR faith_years >= 0),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
-- 본인 전체 + 운영자 SELECT. 코치 직접 열람 정책 없음 — 차수 조원은 DEFINER RPC(cohort_member_profiles)로만(RLS 확대 회피).
CREATE POLICY user_profiles_select ON public.user_profiles FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY user_profiles_insert ON public.user_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY user_profiles_update ON public.user_profiles FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
-- updated_at 자동 갱신(기존 touch_updated_at 재사용)
CREATE TRIGGER trg_user_profiles_touch BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
-- 권한: 로그인 사용자 self CRUD(보호 컬럼 없음 — role 같은 민감 컬럼 부재). anon 불요. 행 제한은 RLS.
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;
