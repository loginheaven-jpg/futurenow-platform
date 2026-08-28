-- **회원자격 보류 = 강퇴다** — 로그인까지 막고, 거는 권한은 슈퍼어드민만 갖는다
--   (최박사 확정 2026-08-30 · **모델 개정**)
--
-- **이 파일은 앞선 판을 대체한다.** 앞 판은 *화면만 막힌다* 모델이었고 적용된 적이 없다.
--   바뀐 것 넷: 로그인이 막힌다 · 빈 화면이 아니라 문구가 뜬다 · 뜻이 강퇴다 ·
--   거는 사람이 운영자 누구나에서 **슈퍼어드민만**으로 좁아진다.
--
-- **최박사 원문**(다듬지 않는다):
--   "보류라 함은 사실은 회원으로서의 모든 지위가 박탈되는 것이다. 강퇴를 완곡하게 말한 것이다.
--    따라서 운영자로서의 지위는 말할 것도 없고 회원기능이 마비되어 로긴도 안되고
--    '회원자격이 보류되었습니다. 운영자에게 문의하십시오.' 라고 뜨는 것이다.
--    그것은 슈퍼어드민 loginheaven@gmail.com 만 갖는 권한이어야 한다."
--
-- -----------------------------------------------------------------------------
-- ** 조건은 「이용 보류만 막는다」이지 「승인된 회원만 통과」가 아니다. **
--
--   반드시 `member_state(uid) <> 'expired'` 형태여야 한다.
--   **실측(2026-08-30)**: 슈퍼어드민 `loginheaven@gmail.com` 의 저장 상태가 **`pending`** 이고
--   활성 세미나에도 없어 판정이 `pending` 이다. *승인된 회원만 통과* 로 쓰면
--   **슈퍼어드민이 첫 희생자가 되고 그를 풀어 줄 사람이 없다.**
--   (그 자리는 이 파일에서 `is_super_admin` 이 유일한 해제 권한을 갖는 자리이기도 하다.)
--   -> 테스트에도 같은 문장을 남겼다(`membership.integration.test.ts`).
-- -----------------------------------------------------------------------------
--
-- **문장 순서가 규칙이다 — 승급이 먼저다.**
--   조건(`is_admin` 이 보류를 봄)을 먼저 걸고 승급을 나중에 두면 **그 사이에 잠기는 창**이 생긴다.
--   그래서 이 파일은 (1) 승급 -> (2) `is_super_admin` -> (3) `is_admin` -> (4) `decide_membership` 순서다.
--   **순서를 바꾸지 말 것.**
--
-- **왜 `is_admin` 한 곳인가 — 실측**: `is_admin` 을 쓰는 **정책 48개**(전체 88개 중)이고
--   부르는 **함수 27개**다(지휘부는 42개라 했으나 세어 보니 48개다). 자리를 골라 고치면 나머지가 남는다.
--
-- **`is_admin` 이 `member_state` 를 부르지 않는 이유 — 상호 재귀다.**
--   `member_state` 는 열람 권한 검사에서 **이미 `is_admin` 을 부른다**(ADR-24 패턴).
--   그래서 **저장값을 직접 읽는다.** 등가인 근거: ADR-147 이 만료 산출을 폐지해
--   `member_state = 'expired'` <=> `memberships.status = 'expired'` 다.
--   **이 등가는 그 폐지에 기대므로** 통합테스트가 두 값이 같은지 단언한다(불변식 23).

-- ============================================================
-- (1) 운영자 둘을 포럼회원으로 — **가장 먼저** (최박사 지시 · 잠금 대비 안전망)
-- ============================================================
--
-- **이메일로 판정하지 않고 id 로 넣는다.** 이메일이 바뀌면 조건이 안 걸린다.
--   `auth.users` 에서 id 를 조회해 `user_id` 로 심고, **잡힌 수가 2가 아니면 멈춘다.**
--   (실측 2026-08-30: `auth.users` 2행 · `public.users` 2행 · 기존 memberships 행 1개
--    — `loginheaven` 은 `pending` 행이 있고 `okaimhigh` 는 행이 없다.)
--
-- **화면으로는 할 수 없는 일이다**: 둘째 계정은 행이 없어 승인 큐에 뜨지 않고,
--   `decide_membership` 이 자기 자신을 막으므로 서로가 서로를 승인해야 한다.
DO $mig$
DECLARE v_n int;
BEGIN
  SELECT count(*) INTO v_n FROM auth.users
   WHERE email IN ('loginheaven@gmail.com','okaimhigh@gmail.com');
  IF v_n <> 2 THEN
    RAISE EXCEPTION '운영자 둘을 찾지 못했다(잡힌 수: %) — 이메일이 바뀌었는지 확인하라', v_n
      USING errcode = 'P0002';
  END IF;

  INSERT INTO public.memberships (user_id, status, valid_until, decided_by, decided_at, decision_note)
  SELECT a.id, 'individual', NULL, NULL, now(), '운영자 상시 자격 — 잠금 대비'
    FROM auth.users a
   WHERE a.email IN ('loginheaven@gmail.com','okaimhigh@gmail.com')
  ON CONFLICT (user_id) DO UPDATE SET
    status        = 'individual',
    valid_until   = NULL,
    decided_at    = now(),
    decision_note = '운영자 상시 자격 — 잠금 대비';
  -- `valid_until` 은 NULL 이다. 상시 자격이고, 기간을 달면 그것이 다음 잠금이 된다.
  -- `decided_by` 도 NULL 이다. **사람이 누른 결정이 아니라 마이그레이션**이고,
  --   아무 운영자의 id 를 적으면 그가 승인한 것처럼 기록이 거짓말을 한다.
END $mig$;

-- ============================================================
-- (2) 슈퍼어드민 — 상수를 한 곳에 둔다
-- ============================================================
--
-- 한 사람이고 바뀔 일이 드물어 **코드에 박는다**(최박사 확정). 다만 **박는 자리를 하나로** 둔다 —
--   여러 곳이 이 함수를 부르므로 바꿀 자리가 여기 한 줄뿐이다(`is_admin` 과 같은 형식).
--   **이메일 상수는 얼어야 하는 값**이고, 잠금은 통합테스트가 든다.
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
     WHERE id = p_user_id AND email = 'loginheaven@gmail.com'
  );
$fn$;
REVOKE ALL   ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;

-- ============================================================
-- (3) `is_admin` 이 이용 보류를 본다 — 정책 48개가 자동으로 따른다
-- ============================================================
--
-- **라이브 정의를 받아 그 위에 얹었다**(`pg_get_functiondef`). 초판 기준으로 다시 쓰지 않았다.
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_user_id AND role = 'admin'
  )
  -- **신설** — 회원자격 보류는 운영자 지위까지 박탈한다(최박사 확정 2026-08-30).
  --   ** `<> 'expired'` 형태다. *승인된 회원만* 으로 바꾸면 `pending` 인 슈퍼어드민이 잠긴다.
  AND NOT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = p_user_id AND status = 'expired'
  );
$fn$;

-- ============================================================
-- (4) `decide_membership` — 가드 둘 + 계정 잠금
-- ============================================================
--
-- **라이브 정의 위에 얹었다.** 기존 가드(비운영자 · 자기 자신 · 허용값 · 기간 오용 · 대상 부재)를
--   한 줄도 지우지 않았다.
--
-- **새 가드 둘**:
--   (가) **대상이 슈퍼어드민이면 언제나 거부.** 남이 걸려 해도 막힌다(최박사 확정).
--        슈퍼어드민이 잠기면 **푸는 사람이 없기 때문**이다 — 자기 자신도 못 푼다(로그인이 막힌다).
--   (나) **운영자를 보류하는 것은 슈퍼어드민만.** 일반 회원 보류는 지금처럼 운영자 누구나 한다.
--        *보류* 에만 건다 — 운영자를 `individual` 로 되돌리는 것까지 막으면 복구가 좁아진다.
--
-- **계정 잠금** — `auth.users.banned_until`. **셋 다 조회로 확인했고 추측하지 않았다**:
--   컬럼이 실재하고(`timestamptz`) · `auth.users` 는 `supabase_auth_admin` 소유이며 RLS 가 켜졌는데
--   정책이 0개이고 · 이 함수의 소유자 `postgres` 가 **`rolbypassrls`** 라 DEFINER 로 쓸 수 있다.
--
--   보류가 아닌 결정으로 바꾸면 **잠금을 함께 푼다.** 풀지 않으면 상태만 돌아오고
--   로그인은 계속 막혀 *되돌렸는데 안 된다* 가 된다.
CREATE OR REPLACE FUNCTION public.decide_membership(
  p_user_id uuid, p_decision text, p_valid_until date DEFAULT NULL, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE v_cur public.memberships;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION '자기 자신의 회원 상태는 바꿀 수 없습니다' USING errcode = '42501';
  END IF;

  -- **신설 (가)** — 슈퍼어드민은 대상이 될 수 없다.
  IF public.is_super_admin(p_user_id) THEN
    RAISE EXCEPTION '슈퍼어드민의 회원 상태는 바꿀 수 없습니다' USING errcode = '42501';
  END IF;
  -- **신설 (나)** — 운영자에게 보류를 거는 것은 슈퍼어드민만.
  IF p_decision = 'expired' AND public.is_admin(p_user_id)
     AND NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION '운영자의 이용 보류는 슈퍼어드민만 처리할 수 있습니다' USING errcode = '42501';
  END IF;

  IF p_decision NOT IN ('individual','held','expired') THEN
    RAISE EXCEPTION 'invalid decision: %', p_decision USING errcode = '22023';
  END IF;
  IF p_decision <> 'individual' AND p_valid_until IS NOT NULL THEN
    RAISE EXCEPTION 'valid_until 은 개인 회원 승인에만 붙습니다' USING errcode = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'target user not found' USING errcode = 'P0002';
  END IF;

  SELECT * INTO v_cur FROM public.memberships WHERE user_id = p_user_id FOR UPDATE;
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

  -- **신설 (다) — 계정 잠금.** 회원기능이 마비되어 로그인도 안 된다(최박사 원문).
  --   기한을 두지 않는다: 보류는 기간이 아니라 상태다. 푸는 것은 사람의 결정이다.
  IF p_decision = 'expired' THEN
    UPDATE auth.users SET banned_until = 'infinity'::timestamptz WHERE id = p_user_id;
    -- **신설 (라) — 이미 열린 세션도 끊는다.**
    --   `banned_until` 은 **새 로그인과 토큰 갱신만** 막는다. 이미 발급된 세션을 그대로 두면
    --   그 사람은 갱신 시점까지 살아 있는 채로 남는다. 그 창을 0으로 만드는 것이 이 두 줄이다.
    --   **이것이 근본 처리다**(지휘부 판정 2026-08-30) — 이것이 없으면 창 안에서
    --   앱의 역할 검사 21곳이 화면 껍데기를 그리고, 더 중요하게는 **보류를 보지 않는
    --   비운영자 쓰기 경로**(자기 자신·코치 소유)가 살아 있다. 아래 주를 함께 볼 것.
    DELETE FROM auth.sessions WHERE user_id = p_user_id;
    -- `refresh_tokens.session_id` 는 `ON DELETE CASCADE` 라 위 한 줄로 대부분 사라진다(실측).
    --   그래도 **`session_id` 가 NULL 인 옛 행이 남을 수 있어** 사용자 기준으로 한 번 더 지운다.
    --   지우는 것이 더 안전한 쪽이고, 없으면 아무것도 지우지 않는다.
    DELETE FROM auth.refresh_tokens WHERE user_id::text = p_user_id::text;
  ELSE
    UPDATE auth.users SET banned_until = NULL WHERE id = p_user_id;
    -- 세션은 **되살리지 않는다.** 지운 것을 되돌릴 수 없고, 되돌릴 필요도 없다 —
    --   풀린 사람은 다시 로그인하면 된다. 그것이 가장 단순하고 틀릴 자리가 없다.
  END IF;
END; $fn$;

-- ============================================================
-- 되돌리는 문
-- ============================================================
-- **적용 여부는 이 파일이 말하지 않는다** — 정본은 원장(`supabase_migrations.schema_migrations`)이고
--   파일이 복사하면 반드시 낡는다(지휘부 판정 2026-08-30). 조회로 얻는다:
--     select version from supabase_migrations.schema_migrations where version = '20260831110000';
--
--   되돌리려면 (3)(4) 를 **적용 직전 라이브 정의**로 되돌리고(`pg_get_functiondef` 를 미리 받아 둔다),
--   (2) 를 `DROP FUNCTION public.is_super_admin(uuid)` 로 지운다.
--   (1) 승급은 **되돌리지 않는다** — 운영자 상시 자격은 이 변경과 독립인 안전망이고,
--   되돌리면 그 순간 잠금 대비가 사라진다. 굳이 지우려면 `memberships` 두 행을 손으로 다룬다.
--   잠긴 계정이 있으면 `UPDATE auth.users SET banned_until = NULL WHERE ...` 로 함께 푼다.

-- ============================================================
-- 적용 뒤 검증 — 여덟 (한 번 일어난 사실이므로 결과는 이 파일에 남긴다)
-- ============================================================
--
--   (1) **승급이 먼저 들었다** — 운영자 둘의 저장 상태가 `individual` 인지.
--        ** `member_state` 는 둘이 다르게 나온다** — 활성 세미나에 있는 쪽은 `cohort` 가 이긴다
--          (판정 우선순위 `held > expired > cohort > 저장`). 실측: 한 명은 세미나에 있고 한 명은 없다.
--          **그러므로 「둘 다 `individual`」로 단언하면 실패한다.** 재는 것은
--          *저장값이 `individual` 이고 판정이 `expired`·`pending` 이 아니다* 다.
--
--   (2) **조건을 「승인된 회원만」으로 바꿔도 둘이 통과하는가** — **변이로 확인한다.**
--        트랜잭션 안에서 조건을 뒤집어 보고 둘이 여전히 `is_admin` 인지 본다. 그것이 안전망의 뜻이다.
--
--   (3) **대조 쌍 셋** — 값 하나로는 못 가른다. [계정]
--        보류된 운영자 대 보류 안 된 운영자 · 슈퍼어드민 대 일반 운영자 ·
--        **`pending` 운영자가 통과하는가**(** 조건 검증 — 이것이 슈퍼어드민을 지킨다).
--
--   (4) **진실표 재검증** — 다섯 상태 x 역할 전수. `member_state` 판정이 한 칸도 바뀌지 않아야 한다.
--
--   (5) **재귀가 없다** — 보류된 운영자로 `member_state` 를 불러 값이 돌아오는지.
--
--   (6) **가드 둘** — 슈퍼어드민 대상 -> 42501 · 일반 운영자가 운영자를 보류 -> 42501 ·
--        슈퍼어드민이 운영자를 보류 -> 통과 · **일반 회원 보류는 운영자 누구나** -> 통과.
--
--   (7) **계정 잠금과 해제** — `expired` 로 `banned_until` 이 서고, 다른 결정으로 **풀리는지.**
--        푸는 것까지 재지 않으면 *되돌렸는데 로그인이 안 된다* 가 남는다.
--
--   (7-2) **세션이 실제로 끊기는지** — 보류 대상의 `auth.sessions` 행이 0이 되는지.
--        **이것이 창을 0으로 만드는 줄이다.** 아래 주가 왜 그것이 근본 처리인지 말한다.
--
--   (8) **기존 `expired` 계정 백필이 필요한가** — 실측 시점 `expired` 저장 행은 **0개**라 불필요하다.
--        적용 시점에 다시 세고, 0이 아니면 그 계정들을 함께 잠근다.
--
--   **실기수와 실계정은 건드리지 않는다** — [계정] 항목은 테스트 픽스처로 잰다.
--
-- ============================================================
-- 왜 세션 무효화가 근본 처리인가 — **실측으로 확인한 것**
-- ============================================================
--
-- 지휘부가 앱의 역할 검사 21곳을 물었다. 실측 결과는 그보다 넓다.
--
--   **앱 21곳**: 전부 DB 뒷받침이 있다(게이트·표시·`coach||admin` 쓰기 가드).
--     *역할만 보고 쓰기를 허용하는데 DB 가 안 막는 자리* 는 **0개**다.
--
--   **그러나 DB 쪽에 다른 층의 구멍이 있다**: `auth.uid()` 로 통과하는 쓰기 정책 중
--     `member_state` 를 보지 않는 것이 **51개**다(실측 2026-08-31 · 산출 명령은 아래).
--     `is_admin` 을 고쳐도 **자기 자신 경로**(`user_id = auth.uid()`)와
--     **코치 소유 경로**(`coach_id = auth.uid()` · `is_cohort_coach(...)`)는 닫히지 않는다.
--     예: `cohorts_update`·`cohorts_delete` 는 `(coach_id = auth.uid()) OR is_admin(...)` 이라
--     **보류된 코치가 자기 차수를 그대로 고칠 수 있다.**
--
--     산출:
--       select count(*) from pg_policy
--        where polcmd in ('w','a','d','*')
--          and coalesce(pg_get_expr(polqual,polrelid),'')||coalesce(pg_get_expr(polwithcheck,polrelid),'')
--              not like '%member_state%'
--          and coalesce(pg_get_expr(polqual,polrelid),'')||coalesce(pg_get_expr(polwithcheck,polrelid),'')
--              like '%auth.uid()%';
--
--   **그러므로 보류의 완결성은 RLS 가 아니라 로그인·세션 차단에 달려 있다.**
--     51곳에 조건을 하나씩 붙이는 길도 있으나 그것은 **규칙을 51곳에 두는 일**이고,
--     세션을 끊으면 **호출 자체가 성립하지 않아** 51곳이 한 번에 닫힌다.
--     `currentUser()` 와 미들웨어가 둘 다 `auth.getUser()` 를 부르므로(로컬 디코드가 아니라
--     GoTrue 왕복이다) 세션이 사라진 뒤에는 신원 자체가 서지 않는다.
--
--   ⚠ **남는 것 하나** — 이미 발급된 액세스 토큰의 잔여 수명.
--     세션 행을 지우면 갱신이 막히지만, JWT 는 서명으로 검증되므로 **만료 전 한 번은
--     통과할 수 있다.** `getUser()` 가 GoTrue 를 거치므로 실제로는 거기서 막힐 가능성이 높으나
--     **그것을 실측하지 못했다**(살아 있는 계정을 잠가야 잴 수 있다).
--     **확인하지 않은 것을 안전하다고 적지 않는다** — 적용 시점에 테스트 계정으로 잰다. [계정]
