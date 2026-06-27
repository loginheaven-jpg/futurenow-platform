-- ============================================================
-- 코어 플랫폼 승격 마이그레이션
-- SAIL 프로젝트(zdoytzmvcafcebytttrm)를 공용 플랫폼 거점으로 승격한다.
--
-- 원칙:
--   * 기존 4종 마이그레이션(initial_schema·groups·fix_rls_recursion·phone_profile)을
--     수정하지 않고, 그 위에 코어 표준을 더한다.
--   * SAIL 고유 테이블(results·groups·group_members)은 건드리지 않는다(클로드3 동결 소관).
--   * 기존 RLS 헬퍼(is_admin·is_group_coach·is_group_member·user_role)와 트리거
--     (handle_new_user·touch_updated_at)는 재사용한다. 중복 생성 금지.
--
-- 전제: 전 테이블 0행. SAIL 작업 동결.
-- 참조: architecture.md §5·§6, ADR-02·03·04·06·13·14·15
-- ============================================================


-- ============================================================
-- 1. users 정비 — full_name → name, 전화번호 분리(ADR-04)
-- ============================================================

-- 1.1 name 컬럼 표준화 (CoreUser.name). 0행이라 rename 안전.
ALTER TABLE public.users RENAME COLUMN full_name TO name;

-- 1.2 전화번호 민감 채널 분리 — user_contacts 신설.
--     전화번호는 운영자(admin)와 본인만 열람한다. 코치·타인 전면 차단.
CREATE TABLE IF NOT EXISTS public.user_contacts (
  user_id    UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  phone      TEXT CHECK (phone IS NULL OR phone ~ '^[+0-9\-\s]{8,20}$'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 기존 users.phone 값 이관 (0행이라 사실상 무효, 안전장치)
INSERT INTO public.user_contacts (user_id, phone)
SELECT id, phone FROM public.users WHERE phone IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.user_contacts ENABLE ROW LEVEL SECURITY;

-- 본인은 자기 전화번호 열람·수정 (전 명령)
CREATE POLICY contacts_self ON public.user_contacts
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 운영자만 타인 전화번호 열람 (코치 정책 부재 = 코치·타인 전면 차단)
CREATE POLICY contacts_admin_read ON public.user_contacts
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE TRIGGER user_contacts_touch_updated_at
  BEFORE UPDATE ON public.user_contacts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 1.3 전화 헬퍼를 user_contacts로 재지정.
--     SAIL의 전화번호 로그인을 보존하되, 전화번호를 users에서 분리한 설계와 일치시킨다.
--     [통합 시 재설계 — plan.md] 퓨처나우는 전화번호 로그인을 쓰지 않는다.
CREATE OR REPLACE FUNCTION public.email_by_phone(p_phone TEXT)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT u.email
  FROM public.user_contacts c
  JOIN public.users u ON u.id = c.user_id
  WHERE c.phone = p_phone
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.phone_exists(p_phone TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_contacts WHERE phone = p_phone);
$$;

-- 1.4 신규 가입 트리거 재작성 — name은 users에, phone은 user_contacts에.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_phone TEXT;
BEGIN
  INSERT INTO public.users (id, email, nickname, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'full_name',
    CASE WHEN NEW.email = 'loginheaven@gmail.com' THEN 'admin' ELSE 'user' END
  )
  ON CONFLICT (id) DO UPDATE
    SET role = CASE
        WHEN EXCLUDED.email = 'loginheaven@gmail.com' THEN 'admin'
        ELSE public.users.role
      END,
      name = COALESCE(public.users.name, EXCLUDED.name);

  v_phone := COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone');
  IF v_phone IS NOT NULL THEN
    INSERT INTO public.user_contacts (user_id, phone)
    VALUES (NEW.id, v_phone)
    ON CONFLICT (user_id) DO UPDATE
      SET phone = COALESCE(public.user_contacts.phone, EXCLUDED.phone);
  END IF;

  RETURN NEW;
END;
$$;

-- 1.5 users.phone 제거 (의존 함수가 이제 user_contacts를 본다)
ALTER TABLE public.users DROP COLUMN phone;


-- ============================================================
-- 2. cohorts — 차수 (groups 일반화 + instrument_id)
--    groups 는 SAIL results 가 참조하므로 드롭하지 않고 유지. cohorts 는 신규 병행.
-- ============================================================
CREATE TABLE public.cohorts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  instrument_id TEXT NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  code          TEXT UNIQUE NOT NULL
                  CHECK (code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$'),
  max_members   INT  NOT NULL DEFAULT 100 CHECK (max_members > 0),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cohorts_coach      ON public.cohorts(coach_id);
CREATE INDEX idx_cohorts_instrument ON public.cohorts(instrument_id);
CREATE INDEX idx_cohorts_status     ON public.cohorts(status) WHERE status = 'active';

CREATE TRIGGER cohorts_touch_updated_at
  BEFORE UPDATE ON public.cohorts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- ============================================================
-- 3. enrollments — 차수 참여 (group_members 일반화)
-- ============================================================
CREATE TABLE public.enrollments (
  cohort_id UUID NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cohort_id, user_id)
);
CREATE INDEX idx_enrollments_user ON public.enrollments(user_id);


-- ============================================================
-- 4. 코어 RLS 헬퍼 (SECURITY DEFINER — 재귀 회피, 기존 패턴 계승)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_cohort_coach(p_cohort_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.cohorts WHERE id = p_cohort_id AND coach_id = p_user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_cohort_member(p_cohort_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.enrollments WHERE cohort_id = p_cohort_id AND user_id = p_user_id);
$$;

CREATE OR REPLACE FUNCTION public.resolve_cohort_by_code(p_code TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  SELECT id INTO v_id FROM public.cohorts
   WHERE code = UPPER(p_code)
     AND status = 'active'
     AND (expires_at IS NULL OR expires_at > now())
   LIMIT 1;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.is_cohort_coach(UUID,UUID)   FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_cohort_member(UUID,UUID)  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_cohort_by_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_cohort_coach(UUID,UUID)   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_cohort_member(UUID,UUID)  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_cohort_by_code(TEXT) TO anon, authenticated;

-- 4b. RLS — cohorts
ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;
CREATE POLICY cohorts_select ON public.cohorts FOR SELECT USING (
  coach_id = auth.uid()
  OR public.is_cohort_member(id, auth.uid())
  OR public.is_admin(auth.uid())
);
CREATE POLICY cohorts_insert ON public.cohorts FOR INSERT WITH CHECK (
  coach_id = auth.uid() AND public.user_role(auth.uid()) IN ('coach','admin')
);
CREATE POLICY cohorts_update ON public.cohorts FOR UPDATE USING (
  coach_id = auth.uid() OR public.is_admin(auth.uid())
);
CREATE POLICY cohorts_delete ON public.cohorts FOR DELETE USING (
  coach_id = auth.uid() OR public.is_admin(auth.uid())
);

-- 4c. RLS — enrollments
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY enroll_select ON public.enrollments FOR SELECT USING (
  user_id = auth.uid()
  OR public.is_cohort_coach(cohort_id, auth.uid())
  OR public.is_admin(auth.uid())
);
CREATE POLICY enroll_insert ON public.enrollments FOR INSERT WITH CHECK (
  user_id = auth.uid()
  OR public.is_cohort_coach(cohort_id, auth.uid())
  OR public.is_admin(auth.uid())
);
CREATE POLICY enroll_delete ON public.enrollments FOR DELETE USING (
  user_id = auth.uid()
  OR public.is_cohort_coach(cohort_id, auth.uid())
  OR public.is_admin(auth.uid())
);


-- ============================================================
-- 5. responses — 응답 봉투 (instrument_id 격리 · wave · immutable)
--    answers·subject_profile 는 진단 소유(코어 불가시). 실명제 — 익명 불가(ADR-06).
-- ============================================================
CREATE TABLE public.responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id   TEXT NOT NULL,
  cohort_id       UUID REFERENCES public.cohorts(id) ON DELETE SET NULL,
  user_id         UUID REFERENCES public.users(id) ON DELETE SET NULL,
  wave            TEXT CHECK (wave IN ('pre','post')),
  answers         JSONB NOT NULL,
  subject_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_responses_instrument ON public.responses(instrument_id);
CREATE INDEX idx_responses_cohort     ON public.responses(cohort_id);
CREATE INDEX idx_responses_user       ON public.responses(user_id);
CREATE INDEX idx_responses_pairing    ON public.responses(instrument_id, cohort_id, user_id, wave);

ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

-- INSERT: 로그인 사용자가 본인 응답을 생성. 차수에 속한 경우 멤버여야 함.
CREATE POLICY responses_insert ON public.responses FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND (cohort_id IS NULL OR public.is_cohort_member(cohort_id, auth.uid()))
);

-- SELECT: 본인 + 같은 차수 코치 + 운영자. 익명 SELECT 절 없음(ADR-06).
--   진단 간 격리: 코치는 자기 차수(단일 instrument)의 응답만 보므로 instrument 격리 성립.
CREATE POLICY responses_select ON public.responses FOR SELECT USING (
  user_id = auth.uid()
  OR (cohort_id IS NOT NULL AND public.is_cohort_coach(cohort_id, auth.uid()))
  OR public.is_admin(auth.uid())
);
-- UPDATE/DELETE 정책 없음 = 불변


-- ============================================================
-- 6. alerts — Red Flag·돌봄 (점수·원문 미적재 · immutable)
-- ============================================================
CREATE TABLE public.alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES public.responses(id) ON DELETE CASCADE,
  cohort_id   UUID REFERENCES public.cohorts(id) ON DELETE SET NULL,
  severity    TEXT NOT NULL CHECK (severity IN ('info','care','red_flag')),
  reason      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_alerts_cohort ON public.alerts(cohort_id);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- INSERT: 본인 응답에 대한 알림 생성 (제출 시 채점 결과). 서버(service_role)는 RLS 우회.
CREATE POLICY alerts_insert ON public.alerts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.responses r WHERE r.id = response_id AND r.user_id = auth.uid())
);

-- SELECT: 같은 차수 코치 + 운영자. 참여자 본인은 자기 알림을 보지 않는다(돌봄은 인도자 몫).
CREATE POLICY alerts_select ON public.alerts FOR SELECT USING (
  (cohort_id IS NOT NULL AND public.is_cohort_coach(cohort_id, auth.uid()))
  OR public.is_admin(auth.uid())
);
-- UPDATE/DELETE 정책 없음 = 불변


-- ============================================================
-- 7. PostgREST 스키마 캐시 리로드
-- ============================================================
NOTIFY pgrst, 'reload schema';
