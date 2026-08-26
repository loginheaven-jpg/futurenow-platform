-- 회원 상태와 승인 (S-1 · ADR-122 예정)
--   지시: docs/tasks/CC_MEMO_site_v2_S1.md · 설계: docs/reports/2026-08-26-site_v2-S1-설계.md
--
-- **핵심 — 저장과 산출을 상태마다 나눈다.**
--   `cohort`(차수 회원)는 `enrollments ⋈ cohorts` 가 이미 아는 사실이라 **저장하지 않는다.**
--   나머지 넷(pending·individual·expired·held)은 운영자의 결정이라 어디에도 없으므로 **저장한다.**
--   그래서 memberships.status CHECK 에 'cohort' 가 **없다** — 이중 기록을 규칙이 아니라 **문법**이 막는다
--   (ADR-121 이 ValueCard 에서 category 를 뺀 것과 같은 사고).
--
-- **전제 — cohorts.kind 가 선결이다.** enrollments 단독 판정은 틀린다: 실측 5개 차수 중 셋
--   (체험 JOINF · 휴지통 TRASH · test)이 세미나가 아닌데 전부 status='active' 라,
--   `EXISTS(enrollments)` 로 판정하면 **휴지통에 버린 사람이 차수 회원이 된다.**
--   지금 그 셋을 가르는 것은 코드 문자열뿐이고, 그것은 ADR-110 이 경고한 '늙는 이름 목록'이다.
--
-- 권한 규율: 이 프로젝트는 default privileges 로 신규 public 테이블에 authenticated 전권을
--   자동 부여한다 → **GRANT 가 아니라 REVOKE 가 본체다**(20260727110000 · 20260826120000 선례).
--   TRUNCATE 를 반드시 회수한다 — RLS 적용 대상이 아니라 남기면 로그인 사용자가 표를 비운다.

-- ============================================================
-- 1. cohorts.kind — 차수의 '성격'. 차수 소속의 이중 기록이 아니다.
--    차수 소속의 주인은 enrollments 하나이고, 여기 담는 것은 차수 자신의 사실이다.
-- ============================================================
-- **네 값이다(설계 보고 §2.2 의 세 값에서 정정).** 'test' 를 빼고 3값으로 두면 test 차수가
--   DEFAULT 로 'seminar' 가 되고, 거기 등록된 운영자 계정이 `cohort` 로 판정되어
--   메모 §4 가 그 계정을 pending 으로 확정한 것과 정면으로 어긋난다. 백필 예행이 test 를
--   별도 갈래로 분류했기에 수치가 맞았던 것이고, 스키마가 그 분류를 담지 못하고 있었다.
ALTER TABLE public.cohorts
  ADD COLUMN kind text NOT NULL DEFAULT 'seminar'
    CHECK (kind IN ('seminar','general','trash','test'));

-- 기존 5행 시딩. **코드로 거르는 것은 이 한 번뿐이다** — 구조 없는 과거에서 구조를 세우는
--   일회성 이관이라 불가피하다. 런타임 판정은 이 뒤로 kind 만 본다(코드 문자열을 두 번 쓰지 않는다).
UPDATE public.cohorts SET kind = 'general' WHERE code = 'JOINF';  -- 체험 예약 차수(ADR-63)
UPDATE public.cohorts SET kind = 'trash'   WHERE code = 'TRASH';  -- 소프트 삭제 휴지통(ADR-84)
UPDATE public.cohorts SET kind = 'test'    WHERE code = 'QKN2H';  -- 개발용 test 차수
-- 나머지(예봄1기 HMT7Z · 2기 ZR4KB)는 DEFAULT 'seminar'. 5행 전부 명시적으로 정해진다.

CREATE INDEX cohorts_kind_seminar_idx ON public.cohorts (kind) WHERE kind = 'seminar';

-- kind 보호 — **테이블 레벨 UPDATE 앞에서 `REVOKE UPDATE (kind)` 단독은 no-op** 이다.
--   20260629100002 이 users.role 에서 겪은 그대로: 테이블 권한을 회수하고 비-kind 컬럼만 재부여한다.
--   이 보호가 없으면 인도자가 자기 차수의 kind 를 'trash' 로 뒤집어 조원 전원의 응시 자격을
--   조용히 없앨 수 있다(cohorts_update RLS 는 그 차수 코치를 허용한다).
--   재부여 목록 = updateCohort(core/context.ts)가 실제로 쓰는 5컬럼. updated_at 은 BEFORE 트리거가
--   NEW 를 고치는 것이라 컬럼 권한 검사 대상이 아니고, post_opened_at 은 DEFINER(open_post_wave)가 쓴다.
REVOKE UPDATE ON public.cohorts FROM authenticated;
GRANT  UPDATE (name, description, max_members, status, expires_at) ON public.cohorts TO authenticated;
-- anon 은 cohorts UPDATE 정당 경로가 없다(RLS 가 coach/admin 을 요구) → 표면 축소.
REVOKE UPDATE ON public.cohorts FROM anon;
REVOKE UPDATE ON public.cohorts FROM PUBLIC;

-- ============================================================
-- 2. 대조 키 — user_contacts 에 둔다(불변식 13)
--    포럼 이름·연락처는 계정 이름·전화와 **다를 수 있다.** users.name 이나 phone 을 덮어쓰면 안 되고,
--    승인 큐 표에 전화번호를 두면 '전화번호는 user_contacts 격리' 불변식이 깨진다.
--    기존 contacts_self / contacts_admin_read 정책이 그대로 적용된다 — 본인+운영자만, 인도자 전면 차단.
--    ADR-76 이 address·bank_account 를 같은 방식으로 얹은 선례를 따른다.
-- ============================================================
ALTER TABLE public.user_contacts
  ADD COLUMN forum_name  text CHECK (forum_name IS NULL OR char_length(forum_name) <= 40),
  ADD COLUMN forum_phone text CHECK (forum_phone IS NULL OR forum_phone ~ '^[+0-9\-\s]{8,20}$');
  -- forum_phone 정규식은 기존 phone 컬럼과 동일하게 맞춘다(형식이 갈리면 대조가 어긋난다).

-- ============================================================
-- 3. memberships — 저장하는 넷
-- ============================================================
CREATE TABLE public.memberships (
  user_id       uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  -- 'cohort' 가 없다. 위 머리말 참조 — 문법이 이중 기록을 막는다.
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','individual','expired','held')),
  -- 개인 회원 자격 기간. NULL = 무기한(체험 백필분). 만료 '판정'은 member_state 가 한다(§5 ③).
  valid_until   date,
  decided_by    uuid REFERENCES public.users(id) ON DELETE SET NULL,  -- 백필·자동전이분은 NULL(결정한 사람이 없다)
  decided_at    timestamptz,
  decision_note text CHECK (decision_note IS NULL OR char_length(decision_note) <= 500),
  signup_note   text CHECK (signup_note IS NULL OR char_length(signup_note) <= 300),  -- 가입 경위(선택)
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX memberships_status_idx      ON public.memberships (status);
CREATE INDEX memberships_valid_until_idx ON public.memberships (valid_until) WHERE valid_until IS NOT NULL;

CREATE TRIGGER memberships_touch_updated_at
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.memberships TO authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.memberships FROM authenticated;
REVOKE ALL ON public.memberships FROM anon;

-- 읽기: 본인 + 운영자. 인도자는 조원의 회원 상태를 보지 않는다(코칭 관계와 무관한 자격 정보다).
CREATE POLICY memberships_select ON public.memberships FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
-- 쓰기 정책 없음 — DEFINER RPC 로만 도달한다.

-- ============================================================
-- 4. 상수와 시계 — 각각 한 곳
-- ============================================================

-- 개인 회원 기본 유효기간. IA §12-2 가 확정되면 **이 함수만** 고친다.
--   승인 화면 기본값도 이 값을 본다(list_membership_queue 가 default_valid_until 로 돌려준다)
--   → TS 에 12 를 박지 않는다. 사본을 만들지 않는 것이 이 저장소의 규칙이다.
CREATE FUNCTION public.membership_default_months() RETURNS int
LANGUAGE sql IMMUTABLE AS $$ SELECT 12 $$;

-- 만료 판정의 '오늘'. **DB TimeZone 이 UTC 이고 참여자는 KST 다**(실측 확인).
--   current_date 를 그냥 쓰면 자격이 한국 시각 오전 9시에 꺾인다.
CREATE FUNCTION public.membership_today() RETURNS date
LANGUAGE sql STABLE AS $$ SELECT (now() AT TIME ZONE 'Asia/Seoul')::date $$;

-- ============================================================
-- 5. 판정 — **유일한 구현**. 화면은 다시 계산하지 않고 이것을 읽는다.
--    우선순위: held > cohort > 저장된 상태 > pending
-- ============================================================
CREATE FUNCTION public.member_state(p_uid uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_row     public.memberships;
  v_seminar boolean;
BEGIN
  IF p_uid IS NULL THEN
    RAISE EXCEPTION 'no subject' USING errcode = '22023';
  END IF;
  -- DEFINER 가 RLS 를 우회하므로 열람 권한을 함수 안에서 명시한다(ADR-24 패턴).
  IF p_uid <> auth.uid() AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;

  SELECT * INTO v_row FROM public.memberships WHERE user_id = p_uid;

  -- ① held 가 무엇보다 먼저다. cohort 가 이기면 차수에 등록되는 순간 보류가 무력화되고,
  --    운영자가 막은 사람을 코드 한 줄로 뚫는 길이 생긴다.
  IF v_row.status = 'held' THEN
    RETURN 'held';
  END IF;

  -- ② cohort — 산출. 저장하지 않는다. kind='seminar' AND status='active' 여야 한다.
  SELECT EXISTS (
    SELECT 1
      FROM public.enrollments e
      JOIN public.cohorts     c ON c.id = e.cohort_id
     WHERE e.user_id = p_uid AND c.kind = 'seminar' AND c.status = 'active'
  ) INTO v_seminar;
  IF v_seminar THEN
    RETURN 'cohort';
  END IF;

  -- ③ 저장된 상태. 행이 없으면 pending.
  IF v_row.user_id IS NULL THEN
    RETURN 'pending';
  END IF;

  -- 만료는 **산출한다** — 저장된 'individual' + 지난 valid_until 이면 expired 다.
  --   이 저장소에는 크론이 없다. 상태를 넘겨 줄 것이 아무것도 없으므로, 저장값에만 기대면
  --   자격이 영원히 살아 있게 된다. 저장된 'expired' 는 운영자가 손으로 끊은 경우다.
  IF v_row.status = 'individual' THEN
    IF v_row.valid_until IS NULL OR v_row.valid_until >= public.membership_today() THEN
      RETURN 'individual';
    END IF;
    RETURN 'expired';
  END IF;

  RETURN v_row.status;   -- 'pending' | 'expired'
END;
$$;

-- 응시 가부. **열람은 여기에 없다** — 자기가 응시한 결과는 상태와 무관하게 언제나 본인에게 열린다
--   (메모 §2-가 · IA v2.1 §5.4). 상태가 가르는 것은 새 응시 하나다.
CREATE FUNCTION public.member_can_assess(p_uid uuid DEFAULT auth.uid(), p_kind text DEFAULT 'standing')
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_state text;
BEGIN
  IF p_kind NOT IN ('journey','standing') THEN
    RAISE EXCEPTION 'invalid kind: %', p_kind USING errcode = '22023';
  END IF;
  v_state := public.member_state(p_uid);   -- 열람 권한 검사는 그 안에서 한 번만
  RETURN CASE
    WHEN v_state = 'cohort'     THEN true                 -- 여정 + 상시
    WHEN v_state = 'individual' THEN p_kind = 'standing'  -- 상시만
    ELSE false                                            -- pending · expired · held
  END;
END;
$$;

-- ============================================================
-- 6. 운영자 결정
-- ============================================================
CREATE FUNCTION public.decide_membership(
  p_user_id    uuid,
  p_decision   text,
  p_valid_until date DEFAULT NULL,
  p_note       text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_cur public.memberships;
BEGIN
  -- 가드는 decide_coach_application(ADR-24)의 여섯을 계승하고 '자기 자신'을 더한다.
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;
  -- 운영자가 자기 상태를 바꾸지 못한다(메모 §1 · 발주서 §4.2). set_user_role 의 자기강등 금지와 같은 계열.
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION '자기 자신의 회원 상태는 바꿀 수 없습니다' USING errcode = '42501';
  END IF;
  IF p_decision NOT IN ('individual','held','expired') THEN
    RAISE EXCEPTION 'invalid decision: %', p_decision USING errcode = '22023';
  END IF;
  -- 유효기간은 개인 회원에만 붙는다. 보류·만료에 기간을 다는 것은 뜻이 없다.
  IF p_decision <> 'individual' AND p_valid_until IS NOT NULL THEN
    RAISE EXCEPTION 'valid_until 은 개인 회원 승인에만 붙습니다' USING errcode = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'target user not found' USING errcode = 'P0002';
  END IF;

  SELECT * INTO v_cur FROM public.memberships WHERE user_id = p_user_id FOR UPDATE;  -- 동시 이중 결정 차단

  INSERT INTO public.memberships (user_id, status, valid_until, decided_by, decided_at, decision_note)
  VALUES (p_user_id, p_decision,
          CASE WHEN p_decision = 'individual' THEN p_valid_until END,
          auth.uid(), now(), p_note)
  ON CONFLICT (user_id) DO UPDATE SET
    status        = EXCLUDED.status,
    valid_until   = EXCLUDED.valid_until,
    decided_by    = EXCLUDED.decided_by,
    decided_at    = EXCLUDED.decided_at,
    decision_note = EXCLUDED.decision_note;
END;
$$;

-- 승인 큐 화면 한 벌 — 대기 목록 + 만료 임박(§4.5 가 둘을 같은 화면에 두라 했다).
--   전화번호는 **원값으로** 돌려주고 마스킹은 서버 컴포넌트의 순수 함수가 한다
--   (전체 값이 브라우저 번들에 실리지 않고, 자릿수·국제번호 경계를 단위테스트로 못 박을 수 있다).
CREATE FUNCTION public.list_membership_queue(p_expiring_days int DEFAULT 30)
RETURNS TABLE (
  bucket             text,     -- 'pending' | 'expiring'
  user_id            uuid,
  name               text,
  email              text,
  forum_name         text,
  forum_phone        text,
  signup_note        text,
  status             text,
  valid_until        date,
  created_at         timestamptz,
  default_valid_until date     -- 승인 화면 기본값. TS 가 12 를 몰라도 되게 한다.
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;
  IF p_expiring_days < 0 OR p_expiring_days > 365 THEN
    RAISE EXCEPTION 'invalid window: %', p_expiring_days USING errcode = '22023';
  END IF;

  RETURN QUERY
  SELECT b.bucket, u.id, u.name, u.email, c.forum_name, c.forum_phone, m.signup_note,
         b.state,                                    -- 저장값이 아니라 **판정**을 돌려준다(사본을 만들지 않는다)
         m.valid_until, COALESCE(m.created_at, u.created_at),
         (public.membership_today()
           + (public.membership_default_months() || ' months')::interval)::date
    FROM public.users u
    LEFT JOIN public.memberships   m ON m.user_id = u.id
    LEFT JOIN public.user_contacts c ON c.user_id = u.id
    CROSS JOIN LATERAL (SELECT public.member_state(u.id) AS state) s
    JOIN LATERAL (
      SELECT s.state, CASE
        -- 대기: 판정이 pending 인 사람만. 차수 회원은 산출로 cohort 라 큐에 뜨지 않는다.
        WHEN s.state = 'pending' THEN 'pending'
        -- 만료 임박: 아직 유효한 individual 중 창 안에 드는 사람.
        WHEN s.state = 'individual' AND m.valid_until IS NOT NULL
             AND m.valid_until <= public.membership_today() + p_expiring_days THEN 'expiring'
        ELSE NULL END AS bucket
    ) b ON b.bucket IS NOT NULL
   ORDER BY b.bucket, COALESCE(m.created_at, u.created_at);
END;
$$;

REVOKE ALL ON FUNCTION public.membership_default_months()                     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.membership_today()                              FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.member_state(uuid)                              FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.member_can_assess(uuid, text)                   FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decide_membership(uuid, text, date, text)       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_membership_queue(int)                      FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.member_state(uuid)                           TO authenticated;
GRANT EXECUTE ON FUNCTION public.member_can_assess(uuid, text)                TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_membership(uuid, text, date, text)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_membership_queue(int)                   TO authenticated;
-- 상수·시계는 호출자 권한이 필요 없다 — DEFINER 함수가 소유자 권한으로 부른다.

-- ============================================================
-- 7. 자동 전이 — 기수 마감 시 individual 생성. 원자적 · 멱등.
--    updateCohort 는 앱측 평범한 UPDATE 다(ADR-26). DEFINER RPC 를 지나지 않으므로
--    **원자성을 얻는 유일한 자리가 트리거**다 — 같은 트랜잭션에서 돈다.
-- ============================================================
CREATE FUNCTION public.membership_on_cohort_archived() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.memberships (user_id, status, valid_until, decided_by, decided_at, decision_note)
  SELECT e.user_id, 'individual',
         (public.membership_today()
           + (public.membership_default_months() || ' months')::interval)::date,
         NULL,          -- 결정한 사람이 없다. 수료는 운영자의 결정이 아니라 사실이다.
         now(),
         '자동 전이: 기수 마감 수료'
    FROM public.enrollments e
   WHERE e.cohort_id = NEW.id
  ON CONFLICT (user_id) DO UPDATE SET
    status        = 'individual',
    valid_until   = EXCLUDED.valid_until,
    decided_at    = EXCLUDED.decided_at,
    decision_note = EXCLUDED.decision_note
  -- 멱등의 본체: individual 은 기간을 늘리지 않고(연장은 운영자 결정),
  --   held 는 건드리지 않는다(트리거가 운영자 판단을 뒤집으면 안 된다).
  -- 대상 행은 **스키마 없이** 테이블 이름으로만 가리킨다(`public.memberships.status` 로 쓰면
  --   ON CONFLICT 절에서 missing FROM-clause entry 가 난다).
  --
  -- **알려진 한계(ADR-122 에 기재) — 복수 차수 수료자의 기간이 두 번째 마감에서 갱신되지 않는다.**
  --   1기·2기를 모두 수료한 사람은 첫 마감에 individual 이 되고, 두 번째 마감 때 이 WHERE 가
  --   'pending'·'expired' 만 통과시키므로 valid_until 이 그대로 남는다. 대상 3명.
  --   **로직은 그대로 둔다**(지휘부 확정) — '연장은 운영자 결정'이라는 멱등 규칙이 본체이고,
  --   만료 임박 목록(list_membership_queue 의 'expiring' 갈래)이 안전망으로 그들을 띄운다.
  WHERE memberships.status IN ('pending','expired');
  RETURN NULL;
END;
$$;

CREATE TRIGGER cohorts_archive_membership
  AFTER UPDATE OF status ON public.cohorts
  FOR EACH ROW
  WHEN (OLD.status <> 'archived' AND NEW.status = 'archived' AND NEW.kind = 'seminar')
  EXECUTE FUNCTION public.membership_on_cohort_archived();

-- ============================================================
-- 8. 백필 — 실계정 5개. 분류는 이름이 아니라 등록 사실로 한다(ADR-110).
--
--    **규칙은 두 층이다. 첫 층이 최우선이다.**
--      ① **세미나 등록자 전면 제외** — `WHERE has_seminar = false`. 18명은 행을 만들지 않는다
--         (산출로 cohort 이므로 저장할 것이 없다).
--      ② 남은 5명 안에서 `trash > test > general > 미등록`.
--
--    이 순서를 ②만 적어 두었다가 지휘부 감사를 오도했다 — 문서대로 재현하니 **7행**이 나왔다
--    (세미나 등록자 중 체험·test 를 겸한 사람이 함께 잡혔다). 첫 층을 생략하면 규칙이 달라진다.
--
--    적용 전 읽기 전용 예행으로 결과를 확인했다: held 1 · individual 2 · pending 2 = 5행.
-- ============================================================
INSERT INTO public.memberships (user_id, status, valid_until, decided_by, decided_at, decision_note)
SELECT b.id,
       CASE WHEN b.has_trash   THEN 'held'
            WHEN b.has_test    THEN 'pending'
            WHEN b.has_general THEN 'individual'
            ELSE 'pending' END,
       NULL,     -- 체험분 individual 은 무기한(메모 §4). 기간은 운영자가 승인할 때 붙인다.
       NULL,     -- 결정한 사람이 없다
       now(),    -- 마이그레이션 실행 시각
       CASE WHEN b.has_trash   THEN '백필: 휴지통 이관'
            WHEN b.has_test    THEN '백필: test 차수 등록만'
            WHEN b.has_general THEN '백필: 체험 진단 완료'
            ELSE '백필: 차수 미등록' END
  FROM (
    SELECT u.id,
           bool_or(c.kind = 'seminar') AS has_seminar,
           bool_or(c.kind = 'trash')   AS has_trash,
           bool_or(c.kind = 'test')    AS has_test,
           bool_or(c.kind = 'general') AS has_general
      FROM public.users u
      LEFT JOIN public.enrollments e ON e.user_id = u.id
      LEFT JOIN public.cohorts     c ON c.id = e.cohort_id
     GROUP BY u.id
  ) b
 WHERE COALESCE(b.has_seminar, false) = false
ON CONFLICT (user_id) DO NOTHING;   -- 재실행 안전
