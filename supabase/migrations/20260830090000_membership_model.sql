-- 회원 모델 확정 반영 — 최박사 모델 (5차 T-3·T-4 후속 · 승인 2026-08-30)
--
-- ⚠ **이 파일은 아직 적용되지 않았다.** 파일만 쓰고 멈춘다(지휘부 지시).
--    적용은 파일 이름을 최박사께 올려 **따로 승인**을 받는다. 지난번 `feed_reactions` 때
--    그 멈춤이 가짜 함수 이름을 잡았다. 같은 절차로 간다.
--
-- **지우려는 것이 그 이름으로 실재하는지 먼저 실물로 확인했다**(2026-08-30 라이브 조회):
--    함수 `membership_on_cohort_archived`  ✅ 있음 (반환 trigger)
--    트리거 `cohorts_archive_membership`   ✅ 있음 (on public.cohorts)
--    함수 `membership_default_months`      ✅ 있음 (반환 integer)
--    함수 `member_state`·`member_can_assess`·`feed_can_access`·`feed_assert_writable`·`my_cohorts` ✅ 모두 있음
--    함수 `member_tool_access`             ❌ 없음 (새로 만든다)
--  *초록은 대상이 실재한다는 증거가 아니다*(§11) — 그래서 이름으로 직접 조회했다.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- **최박사 모델**(2026-08-29~30 원문 요지)
--
--   · 포럼회원은 **오직 운영자가 메뉴에서 승급을 지정해야** 된다.
--   · 승급 안 된 사람은 `○○기 참여자` 일 뿐이고, 기수가 끝나면
--     **본인 회기 콘텐츠는 영구 열람**(회원 보류가 아니면), 바깥 도구는 방문회원과 같다.
--   · 회기 **진행 중**에는 포럼회원과 같이 바깥 도구도 쓴다.
--   · 종료 뒤 바깥 도구에서 **본인 검사 데이터는 보되 신규 검사는 안 된다.**
--   · 회원 보류(= `expired`)는 **정회원 승인 메뉴에서 이용자격을 보류**하는 것이고
--     **일종의 탈퇴 처리를 완곡하게 취급**하는 것이다.
--   · `held` 는 차단이 아니다 — **아직 준 적 없는 자격을 붙들어 둔 것**이라 회기 콘텐츠가 열린다.
-- ─────────────────────────────────────────────────────────────────────────────

-- ============================================================
-- 1. 자동 승급 폐지 — 마감 트리거를 지운다
-- ============================================================
--
-- **왜 지우나.** `membership_on_cohort_archived` 는 기수가 `archived` 가 되면 **등록자 전원**에게
--   `individual`(포럼회원)을 만들었다. 최박사 모델에서 포럼회원은 **지정해야만** 되는 것이므로
--   *아무도 지정하지 않았는데 전원이 승급되는* 이 트리거가 모델과 정면으로 어긋난다.
--   원 주석은 그것을 *"수료는 운영자의 결정이 아니라 사실이다"* 라고 적었는데, 모델에서는
--   **정확히 반대**다 — 포럼회원은 사실이 아니라 **결정**이다.
--
-- **아직 한 번도 돌지 않았다**(실측: `archived` 인 seminar 기수 0개 · `decision_note='자동 전이: 기수 마감 수료'` 0행).
--   1기 마감이 첫 실행이 될 뻔했고 그러면 11명이 지정 없이 승급됐다. **되돌릴 데이터가 없다.**
--
-- **트리거를 먼저 지운다** — 함수를 먼저 지우면 의존 때문에 실패한다.
DROP TRIGGER IF EXISTS cohorts_archive_membership ON public.cohorts;
DROP FUNCTION IF EXISTS public.membership_on_cohort_archived();

-- ============================================================
-- 2. 12개월 자동 만료 폐지 — `member_state` 가 `valid_until` 을 보지 않는다
-- ============================================================
--
-- **왜 끄나.** 최박사가 지정하신 승급이 **시간으로 저절로 풀리면** 지정의 뜻이 사라진다.
--   확정 6(자격 **무기한**)이 그것이고, 지금은 승인 화면이 기본값 12개월을 넣어
--   실측 **3행**이 `2027-08-28` 만료를 달고 있다. 그날 이후 그 3명은 취소된 적이 없는데
--   `expired`(이용 보류 = 탈퇴에 준함)가 된다.
--
-- **끄는 자리는 판정 한 곳이다.** `valid_until` 컬럼도, 이미 붙은 값도 건드리지 않는다 —
--   **데이터 변경은 별도 승인 사안**이고, 값이 남아 있어도 판정이 보지 않으면 효력이 없다.
--   운영자가 손으로 `expired` 를 정하는 길(`decide_membership`)은 그대로 산다.
--
-- **우선순위는 그대로다**: `held > cohort > 저장 > pending`. 바뀌는 것은 ④ 만료 산출뿐이다.
CREATE OR REPLACE FUNCTION public.member_state(p_uid uuid DEFAULT auth.uid())
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

  -- ①-2 **expired 도 cohort 보다 먼저다**(신설).
  --    `expired` 는 최박사 정의로 **탈퇴에 준하는 처리**다. 그것이 `cohort` 에 지면
  --    기수에 등록돼 있다는 이유로 탈퇴 처리가 무력화된다 — `held` 를 앞에 둔 것과 같은 근거다.
  IF v_row.status = 'expired' THEN
    RETURN 'expired';
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

  -- ④ **만료를 산출하지 않는다**(폐지 2026-08-30).
  --    옛 판정은 `individual` + 지난 `valid_until` 을 `expired` 로 바꿨다. 그것이
  --    최박사가 지정하신 승급을 **시간으로 푸는** 유일한 경로였다.
  --    이제 `expired` 는 **운영자가 저장한 경우에만** 나온다(위 ①-2 가 그것을 읽는다).
  RETURN v_row.status;
END;
$$;

-- ============================================================
-- 3. 도구 접근 창구 — `member_tool_access`
-- ============================================================
--
-- **왜 새로 만드나.** `member_can_assess` 는 `boolean` 하나라 *아무것도 하지 마라* 와
--   *읽기는 되고 쓰기는 안 된다* 를 구별할 수 없다. 최박사 모델이 그 구별을 요구한다.
--
-- **최박사 지시**: *"진입하는 사람이 어떤 자격자인지만 패러미터가 넘어가면 된다."*
--   그래서 이 함수의 반환이 곧 **각 도구에 넘길 파라미터**다.
--
-- **가이드는 「이렇게 판단하라」가 아니라 「이 함수를 불러라」여야 한다** — 글로 규칙을 주면
--   도구마다 다시 구현해 **사본이 도구 수만큼** 생긴다.
--
--   | 반환 | 누구 | 뜻 |
--   |---|---|---|
--   | `full`      | 포럼회원(`individual`) · 진행 중 회기 참여자(`cohort`) | 무제한 |
--   | `read_only` | 종료된 회기 참여자(`pending`) · 확인 대기(`held`)        | 본인 데이터 열람만, 신규 ✕ |
--   | `none`      | 이용 보류(`expired`)                                   | 차단(탈퇴에 준함) |
--
-- **`held` 가 `read_only` 인 이유**: 최박사가 *"held 는 아직 준 적 없는 자격을 붙들어 둔 것"*
--   이라 하셨고 회기 콘텐츠가 열려 있는 것이 맞다고 확정하셨다. 차단은 `expired` 뿐이다.
--
-- **`pending` 이 `read_only` 인 이유**: 방문회원(가입만 한 사람)은 볼 데이터가 애초에 없다.
--   `read_only` 를 줘도 **보여 줄 것이 없을 뿐** 새로 할 수 있는 것은 없다.
--   종료된 회기 참여자와 방문회원을 자격 축에서 가르지 않는 것이 모델과 맞는다
--   (*권한은 방문회원과 같다*). 가르는 것은 **명칭과 소속**이고 그것은 표시 층의 일이다.
CREATE OR REPLACE FUNCTION public.member_tool_access(p_uid uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_state text;
BEGIN
  v_state := public.member_state(p_uid);   -- 열람 권한 검사는 그 안에서 한 번만
  RETURN CASE
    WHEN v_state IN ('cohort','individual') THEN 'full'
    WHEN v_state = 'expired'                THEN 'none'
    ELSE 'read_only'                        -- pending · held
  END;
END;
$$;

-- **기존 함수는 지우지 않는다.** 얇은 래퍼로 남겨 `full` 이면 참을 낸다 —
--   기존 호출부가 **한 줄도 바뀌지 않는다**(T-5 의 `roleTarget` 래퍼 선례).
--   `p_kind` 는 그대로 받는다: 여정(`journey`)은 진행 중 회기에만 뜻이 있으므로
--   `cohort` 일 때만 참이던 옛 규칙을 유지한다.
CREATE OR REPLACE FUNCTION public.member_can_assess(p_uid uuid DEFAULT auth.uid(), p_kind text DEFAULT 'standing')
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_access text; v_state text;
BEGIN
  IF p_kind NOT IN ('journey','standing') THEN
    RAISE EXCEPTION 'invalid kind: %', p_kind USING errcode = '22023';
  END IF;
  v_access := public.member_tool_access(p_uid);
  IF v_access <> 'full' THEN
    RETURN false;
  END IF;
  -- `full` 안에서 여정과 상시가 갈린다 — 여정은 **진행 중 회기**에만 붙는다.
  IF p_kind = 'journey' THEN
    v_state := public.member_state(p_uid);
    RETURN v_state = 'cohort';
  END IF;
  RETURN true;
END;
$$;

-- ============================================================
-- 4. `expired` 를 실제로 막는다 — 탈퇴에 준하는 처리
-- ============================================================
--
-- **지금 `expired` 는 아무것도 막히지 않는다**(실측): 회기 콘텐츠를 보고 피드에 글도 쓴다.
--   *이용 보류* 된 사람이 *확인 대기* 인 사람보다 넓었다 — **이름의 뜻과 반대**였다.
--
-- **주의 둘(지휘부)**:
--   ⑴ `is_admin` 이 첫 OR 이라 **운영자는 무조건 통과**한다. 아래에서도 그 순서를 유지한다 —
--      운영자가 자기 손으로 자기를 막는 일이 없어야 감독이 끊기지 않는다.
--
--      ⚠ **이 자리는 미확정이다**(최박사 결정 대기 · 2026-08-30 명시).
--      **의도가 아니라 보류다.** 즉 *운영자는 `expired` 여도 통과한다* 는 것이
--      결정된 규칙이 아니라 **기존 순서를 그대로 둔 결과**다.
--      운영자에게 `expired` 를 걸 수 있는지(`decide_membership` 은 **자기 자신**만 막는다),
--      걸었다면 그 사람이 콘솔에서 무엇을 잃어야 하는지가 정해지지 않았다.
--      **다음 사람이 이 통과를 확정된 설계로 오해하지 않게 여기에 적어 둔다.**
--      결정이 오면 고칠 자리는 아래 네 곳의 첫 `OR` 이다.
--
--   ⑵ **목록을 감추는 것은 방어가 아니다.** `my_cohorts` 만 막으면 목록은 비고 직접 URL 이 남는다.
--      그래서 **판정 함수와 정책**을 막고, 목록은 그 결과로 비게 둔다.

-- 4.1 피드 읽기 — `expired` 차단
CREATE OR REPLACE FUNCTION public.feed_can_access(p_cohort_id uuid, p_uid uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_uid IS NOT NULL AND (
    public.is_admin(p_uid)                       -- 운영자는 무조건 통과(감독이 끊기지 않게)
    OR (
      public.member_state(p_uid) <> 'expired'    -- **신설** — 탈퇴에 준하는 처리
      AND EXISTS (
        SELECT 1 FROM public.cohorts c
         WHERE c.id = p_cohort_id
           AND c.kind = 'seminar'
           AND (c.coach_id = p_uid OR public.is_cohort_member(c.id, p_uid))
      )
    ));
$$;

-- 4.2 피드 쓰기 — `expired` 도 막는다(지금은 `held` 만 막았다)
CREATE OR REPLACE FUNCTION public.feed_assert_writable(p_uid uuid DEFAULT auth.uid())
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_state text;
BEGIN
  IF p_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING errcode = '42501';
  END IF;
  v_state := public.member_state(p_uid);
  IF v_state = 'held' THEN
    RAISE EXCEPTION '계정 확인이 필요해 지금은 글을 올릴 수 없어요. 아래 문의로 알려 주시면 확인해 드릴게요.'
      USING errcode = '55000';
  END IF;
  -- **신설.** 문안을 새로 만들지 않고 `held` 와 가른다 — 두 상태는 뜻이 달라 같은 문장을 쓰면
  --   *확인 중* 과 *보류됨* 이 한 문장으로 뭉개진다.
  IF v_state = 'expired' THEN
    RAISE EXCEPTION '계정 이용이 보류되었습니다. 문의해 주세요.'
      USING errcode = '55000';
  END IF;
END; $$;

-- 4.3 기수 읽기 정책 — `expired` 차단
--   **개별 조회를 여기서 막는다.** `cohorts_select` 가 단건 조회의 문이고,
--   `my_cohorts` 는 이 정책을 타지 않는 DEFINER 라 따로 막는다(4.4).
--
--   ⚠ **RLS 정책에 함수 호출을 넣는 것은 원칙적으로 위험하다**(지휘부 지적 2026-08-30) —
--   정책은 **행 단위 평가**라 기수가 늘면 행마다 도는 모양이 될 수 있다.
--
--   ⚠ **〔정정 2026-08-30 — 아래 주장은 틀렸다〕**
--   원문: *지금은 안전하다 — member_state 가 행에 의존하지 않으므로 InitPlan 으로 승격해
--   쿼리당 한 번만 평가한다.* **적용 뒤 실측에서 승격되지 않았다.**
--   PostgreSQL 은 `STABLE` 함수 호출을 그 이유만으로 승격하지 않는다 — InitPlan 은
--   **서브쿼리**에 적용되고 맨 함수 호출은 Filter 에 남아 **행마다 돈다.**
--   **원리로 추정하고 계획을 보지 않은 것이 원인이다.**
--   고침은 후속 마이그레이션 `20260830100000_cohorts_select_initplan.sql` 에 있다
--   (호출을 스칼라 서브쿼리로 감싼다 · 실증 완료). 판정 결과는 바뀌지 않는다.
--
--   **적용 뒤 실측으로 확인한다** — 아래 §6 검증 항목 ①.
--   행마다 도는 것으로 바뀌면 그때는 정책이 아니라 **DEFINER 함수 쪽으로 옮겨야** 한다.
DROP POLICY IF EXISTS cohorts_select ON public.cohorts;
CREATE POLICY cohorts_select ON public.cohorts FOR SELECT
  USING (
    public.is_admin(auth.uid())
    OR (
      public.member_state(auth.uid()) <> 'expired'
      AND (coach_id = auth.uid() OR public.is_cohort_member(id, auth.uid()))
    )
  );

-- 4.4 내 기수 목록 — `expired` 면 빈 목록
--   **이것만으로는 방어가 아니다**(위 4.3 이 실제 문이다). 목록이 비는 것은 그 결과일 뿐이고,
--   직접 URL 은 `cohorts_select` 와 각 화면의 소속 확인이 막는다.
--
--   **본문은 라이브 정의를 그대로 가져와 `WHERE` 한 줄만 더했다**(2026-08-30 `pg_get_functiondef` 조회).
--   추측으로 다시 쓰지 않았다 — 공용 함수를 초판 기준으로 재작성하면 그 뒤에 얹힌 변경이
--   `CREATE OR REPLACE` 로 조용히 사라진다(ADR-122 ⑰ 이 `handle_new_user` 에서 겪은 그대로).
CREATE OR REPLACE FUNCTION public.my_cohorts()
RETURNS TABLE(
  cohort_id uuid, name text, coach_name text, status text,
  pre_done boolean, post_done boolean, post_opened boolean,
  open_session_no integer, open_session_submitted boolean, open_session_has_content boolean,
  joined_at timestamptz
) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    c.id, c.name, u.name AS coach_name, c.status,
    EXISTS(SELECT 1 FROM responses r WHERE r.user_id=auth.uid() AND r.cohort_id=c.id AND r.instrument_id=c.instrument_id AND r.wave='pre')  AS pre_done,
    EXISTS(SELECT 1 FROM responses r WHERE r.user_id=auth.uid() AND r.cohort_id=c.id AND r.instrument_id=c.instrument_id AND r.wave='post') AS post_done,
    (c.post_opened_at IS NOT NULL) AS post_opened,
    open_sess.session_no AS open_session_no,
    COALESCE(ck.submitted_at IS NOT NULL, false) AS open_session_submitted,
    COALESCE(ck.has_content, false) AS open_session_has_content,
    e.joined_at
  FROM enrollments e
  JOIN cohorts c ON c.id = e.cohort_id
  LEFT JOIN users u ON u.id = c.coach_id
  LEFT JOIN LATERAL (
    SELECT cs.session_no FROM cohort_sessions cs
    WHERE cs.cohort_id = c.id AND now() BETWEEN cs.opens_at AND cs.closes_at
    ORDER BY cs.session_no LIMIT 1
  ) open_sess ON true
  LEFT JOIN checkins ck ON ck.cohort_id = c.id AND ck.user_id = auth.uid() AND ck.session_no = open_sess.session_no
  WHERE e.user_id = auth.uid() AND c.code <> 'TRASH'
    AND public.member_state(auth.uid()) <> 'expired'   -- **신설** — 이 줄 하나만 더했다
  ORDER BY e.joined_at DESC;
$$;

-- ============================================================
-- 5. 권한 — 새 함수에 기존과 같은 모양으로 부여
-- ============================================================
REVOKE ALL ON FUNCTION public.member_tool_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.member_tool_access(uuid) TO authenticated;
-- `member_state`·`member_can_assess`·`feed_can_access`·`feed_assert_writable`·`my_cohorts` 는
--   `CREATE OR REPLACE` 라 기존 권한이 유지된다(DROP 하지 않았다).

-- ============================================================
-- 6. 적용 뒤 검증 항목 — **이 파일이 스스로 들고 있는다**
-- ============================================================
--
-- 보고서에만 적으면 다음 사람이 이 파일만 보고 적용한다. 그래서 여기 둔다.
-- **클코1 다섯 + 지휘부 여섯을 합쳐 중복을 정리했다**(2026-08-30). 겹친 것은 ①(InitPlan)이다.
-- `[계정]` 표시가 붙은 항목은 **테스트 계정이 필요하다** — 해당자가 0명이라 실계정으로는 잴 수 없다.
-- **실기수와 실계정은 건드리지 않는다.** 전 과정 `BEGIN … ROLLBACK`.
--
--   ① **`cohorts_select` 정책이 쿼리당 한 번 평가되는지**(양쪽 공통 · 지휘부 1번).
--        EXPLAIN (ANALYZE, VERBOSE) SELECT id FROM public.cohorts;
--      `member_state` 가 **InitPlan** 으로 나오는지 본다 — `Filter` 안 매 행 호출이면 위험 신호다.
--      기수가 6개라 **시간 차이는 안 보인다. 보는 것은 시간이 아니라 계획이다.**
--      행마다 도는 것으로 바뀌면 정책이 아니라 **DEFINER 함수 쪽으로 옮겨야** 한다.
--
--   ② **진실표 재검증** — `PRIORITY_CASES` 전수. 이번에 두 행이 바뀌었고 지금은
--      `needsMigration` 으로 **건너뛰는 중**이다(적용 전 레드를 만들지 않으려고).
--      적용 뒤 그 둘이 **자동으로 다시 켜진다** — 그것이 이 항목의 실체다:
--        · `미등록 · individual(기간 지남)` → **`individual`**(자동 만료 폐지)
--        · `세미나 등록 · expired(저장)` → **`expired`**(순서 변경 · 신설 행)
--      스킵 메시지가 사라지는 것으로 적용을 눈으로 확인할 수 있다.
--
--   ③ **만료일 실동작**(지휘부 2번). 남겨 둔 3행(`2027-08-28`)이 **더 이상 자격을 꺾지 않는지.**
--      `valid_until` 이 지난 상태를 만들어 `member_state` 가 여전히 `individual` 인지 본다.
--      **`[계정]`** — 실계정의 날짜를 앞당길 수 없으므로 픽스처로 잰다(②가 이것을 포함한다).
--      **데이터는 한 행도 건드리지 않는다**(이 마이그레이션이 지우지 않는 이유가 그것이다).
--
--   ④ **`expired` 차단 실동작**(지휘부 3번). 네 자리(`feed_can_access`·`feed_assert_writable`·
--      `cohorts_select`·`my_cohorts`)가 실제로 막는지. **`[계정]`** — `expired` 해당자가
--      **0명**이라 테스트 계정이 필요하다. `member_tool_access` 세 값도 함께 잰다.
--
--   ⑤ **기존 화면 회귀**(지휘부 4번) — 정책 변경의 파장. **피드 · 내 기수 · 콘솔** 셋이다.
--      `cohorts_select` 를 바꿨으므로 **`expired` 가 아닌 사람도 영향을 받을 수 있다** —
--      그것이 이 항목의 이유다(막으려던 사람 말고 **나머지 전원**을 본다).
--      실브라우저로 본다: 피드가 열리는가 · 내 기수 목록이 그대로인가 · 콘솔에서 차수가 보이는가.
--
--   ⑥ **양방향 실재** — `member_tool_access` 가 생겼고 `membership_on_cohort_archived` 와
--      트리거가 사라졌는지, 오버로드가 각각 1·0 인지. **이름으로 직접 조회한다.**
--
--   ⑦ **오염 0** — `memberships` 행 수(7)와 `valid_until` 이 붙은 3행이 그대로인지.
--      이 마이그레이션은 **데이터를 한 행도 건드리지 않는다.**
--
--   ⑧ **롤백 문** — 적용 전에 `BEGIN … ROLLBACK` 으로 되돌아오는지 먼저 확인한다.
--      `DROP TRIGGER`·`DROP FUNCTION`·`CREATE OR REPLACE` 가 전부 트랜잭션 안이다.
--      **되돌아간 뒤 트랜잭션 밖에서 다시 읽는다** — 되돌아갔는지는 밖에서 봐야 안다.
