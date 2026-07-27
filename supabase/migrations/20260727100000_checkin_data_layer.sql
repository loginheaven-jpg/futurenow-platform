-- 갈무리-1 · 회차 일정과 갈무리 카드 (ADR-80)
-- responses(불변·측정)와 완전 분리. 채점·AI 입력·리포트 어디에도 들어가지 않는다.
-- 일정만 데이터, 문항 편성은 코드 상수(src/instruments/futurenow/checkin/).

-- ============================================================
-- 1. cohort_sessions — 차수별 회차 일정
--    회차↔STEP 매핑은 코드가 갖는다. 이 테이블은 날짜만 갖는다.
-- ============================================================
CREATE TABLE public.cohort_sessions (
  cohort_id  uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  session_no int  NOT NULL CHECK (session_no BETWEEN 1 AND 12),
  held_at    timestamptz NOT NULL,
  opens_at   timestamptz NOT NULL,
  closes_at  timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cohort_id, session_no),
  CONSTRAINT cohort_sessions_window CHECK (opens_at <= closes_at)
);

CREATE TRIGGER cohort_sessions_touch_updated_at
  BEFORE UPDATE ON public.cohort_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.cohort_sessions ENABLE ROW LEVEL SECURITY;

-- SELECT: 차수 멤버 + 담당 인도자 + 운영자
CREATE POLICY cohort_sessions_select ON public.cohort_sessions FOR SELECT USING (
  public.is_cohort_member(cohort_id, auth.uid())
  OR public.is_cohort_coach(cohort_id, auth.uid())
  OR public.is_admin(auth.uid())
);

-- INSERT/UPDATE/DELETE: 담당 인도자 + 운영자만
CREATE POLICY cohort_sessions_insert ON public.cohort_sessions FOR INSERT WITH CHECK (
  public.is_cohort_coach(cohort_id, auth.uid()) OR public.is_admin(auth.uid())
);
CREATE POLICY cohort_sessions_update ON public.cohort_sessions FOR UPDATE
  USING (public.is_cohort_coach(cohort_id, auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_cohort_coach(cohort_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY cohort_sessions_delete ON public.cohort_sessions FOR DELETE USING (
  public.is_cohort_coach(cohort_id, auth.uid()) OR public.is_admin(auth.uid())
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cohort_sessions TO authenticated;


-- ============================================================
-- 2. checkins — 갈무리 카드 (수정 가능 · 채점 없음)
--    UNIQUE(cohort,user,session) + upsert. responses 의 append 규약(ADR-33)과 의도적으로 다르다.
--    갈무리는 측정 스냅샷이 아니라 참여자가 되돌아와 고쳐 쓰는 문서이기 때문이다.
-- ============================================================
CREATE TABLE public.checkins (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id       uuid NOT NULL,
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_no      int  NOT NULL,

  -- 본문. 필드 명세는 코드 상수가 소유(코어 불가시).
  answers         jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- 공개·동의·요청 플래그 (질의 대상이라 컬럼으로 승격)
  step_private    boolean NOT NULL DEFAULT false,
  share_consent   boolean NOT NULL DEFAULT false,
  suggestion_anon boolean NOT NULL DEFAULT false,
  contact_request boolean NOT NULL DEFAULT false,

  -- 상태 판정용 파생 컬럼 — checkin_save 가 쓰기 시점에 계산한다(R3).
  --   앱·배너·인도자 화면이 같은 값을 보게 하기 위해 컬럼으로 승격했다.
  --   markCheckinPrompted/Opened 가 내용 없는 행을 먼저 만들기 때문에,
  --   '행 존재'로 작성 중을 판정하면 안내만 받은 사람이 '작성 중'으로 보인다.
  has_content     boolean NOT NULL DEFAULT false,

  -- 1기 보정용 계측
  prompted_at     timestamptz,
  prompt_count    int NOT NULL DEFAULT 0 CHECK (prompt_count >= 0 AND prompt_count <= 2),
  first_opened_at timestamptz,
  deep_opened     boolean NOT NULL DEFAULT false,
  submitted_at    timestamptz,
  edit_count      int NOT NULL DEFAULT 0 CHECK (edit_count >= 0),

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (cohort_id, user_id, session_no),
  FOREIGN KEY (cohort_id, session_no)
    REFERENCES public.cohort_sessions(cohort_id, session_no) ON DELETE CASCADE
);

CREATE INDEX idx_checkins_cohort_session ON public.checkins(cohort_id, session_no);
CREATE INDEX idx_checkins_user           ON public.checkins(user_id);
CREATE INDEX idx_checkins_contact        ON public.checkins(cohort_id) WHERE contact_request;

CREATE TRIGGER checkins_touch_updated_at
  BEFORE UPDATE ON public.checkins
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

-- SELECT: 본인 + 담당 인도자 + 운영자
CREATE POLICY checkins_select ON public.checkins FOR SELECT USING (
  user_id = auth.uid()
  OR public.is_cohort_coach(cohort_id, auth.uid())
  OR public.is_admin(auth.uid())
);

-- INSERT/UPDATE 정책 — 현재 도달 불가(authenticated 에 write GRANT 가 없고 쓰기는 DEFINER RPC 전용).
--   방어 심층으로 존치한다. 나중에 누가 GRANT 를 되살릴 때의 안전망이다.
CREATE POLICY checkins_insert ON public.checkins FOR INSERT WITH CHECK (
  user_id = auth.uid() AND public.is_cohort_member(cohort_id, auth.uid())
);
CREATE POLICY checkins_update ON public.checkins FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND public.is_cohort_member(cohort_id, auth.uid()));

-- DELETE 정책 없음 — 참여자도 인도자도 삭제하지 않는다.

-- D1(지휘부 추가) — 쓰기 권한을 주지 않는다. SELECT 만 GRANT.
--   테이블 단위 UPDATE 를 주면 참여자가 PostgREST 로 submitted_at 을 과거로 써서 지각 판정을 무력화하고
--   edit_count·prompt_count 도 직접 조작할 수 있다. 이 값들이 1기 보정의 근거 데이터다.
--   컬럼 단위 REVOKE 는 테이블 단위 GRANT 를 되돌리지 못하므로(S-1 확인) 애초에 주지 않는다.
GRANT SELECT ON public.checkins TO authenticated;


-- ============================================================
-- 3. 쓰기 RPC (전부 SECURITY DEFINER · self-scoped)
--    공통 게이트: 호출자가 해당 차수 멤버여야 한다. 타인 행은 어떤 RPC 로도 만질 수 없다.
-- ============================================================

-- 3.1 자동 저장 — 본문·플래그만 쓴다. 시각·카운터는 건드리지 않는다.
CREATE FUNCTION public.checkin_save(
  p_cohort_id  uuid,
  p_session_no int,
  p_answers    jsonb,
  p_flags      jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_has_content boolean;
BEGIN
  IF NOT public.is_cohort_member(p_cohort_id, auth.uid()) THEN
    RAISE EXCEPTION 'not a member of this cohort';
  END IF;

  -- 유의미한 입력이 하나라도 있는가. 공백만 있는 문자열·빈 배열은 내용으로 치지 않는다.
  v_has_content := EXISTS (
    SELECT 1 FROM jsonb_each(p_answers) AS kv(k, v)
     WHERE (jsonb_typeof(v) = 'string' AND btrim(v #>> '{}') <> '')
        OR (jsonb_typeof(v) = 'array'  AND jsonb_array_length(v) > 0)
        OR (jsonb_typeof(v) = 'number')
  );

  INSERT INTO public.checkins (cohort_id, user_id, session_no, answers, has_content,
                               step_private, share_consent, suggestion_anon, contact_request, deep_opened)
  VALUES (p_cohort_id, auth.uid(), p_session_no, p_answers, v_has_content,
          COALESCE((p_flags->>'stepPrivate')::boolean,    false),
          COALESCE((p_flags->>'shareConsent')::boolean,   false),
          COALESCE((p_flags->>'suggestionAnon')::boolean, false),
          COALESCE((p_flags->>'contactRequest')::boolean, false),
          COALESCE((p_flags->>'deepOpened')::boolean,     false))
  ON CONFLICT (cohort_id, user_id, session_no) DO UPDATE SET
    answers         = EXCLUDED.answers,
    has_content     = v_has_content,
    step_private    = COALESCE((p_flags->>'stepPrivate')::boolean,    checkins.step_private),
    share_consent   = COALESCE((p_flags->>'shareConsent')::boolean,   checkins.share_consent),
    suggestion_anon = COALESCE((p_flags->>'suggestionAnon')::boolean, checkins.suggestion_anon),
    contact_request = COALESCE((p_flags->>'contactRequest')::boolean, checkins.contact_request),
    -- deep_opened 는 단방향: 한 번 true 면 false 로 되돌리지 않는다(계측 보존)
    deep_opened     = checkins.deep_opened OR COALESCE((p_flags->>'deepOpened')::boolean, false);
END;
$$;

-- 3.2 제출 — 행이 반드시 먼저 있어야 한다. 앱은 save -> submit 순서를 보장할 것(R2).
--     최초 submitted_at 고정, 재제출은 edit_count+1 만. submitted_at 을 갱신하지 않는다.
CREATE FUNCTION public.checkin_submit(p_cohort_id uuid, p_session_no int)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_cohort_member(p_cohort_id, auth.uid()) THEN
    RAISE EXCEPTION 'not a member of this cohort';
  END IF;

  UPDATE public.checkins
     SET submitted_at = COALESCE(submitted_at, now()),
         edit_count   = CASE WHEN submitted_at IS NULL THEN edit_count ELSE edit_count + 1 END
   WHERE cohort_id = p_cohort_id AND user_id = auth.uid() AND session_no = p_session_no;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'checkin not found - call checkin_save first';
  END IF;
END;
$$;

-- 3.3 계측 표식 — p_kind: 'prompt'(전면 안내 노출) | 'open'(카드 최초 진입)
CREATE FUNCTION public.checkin_mark(p_cohort_id uuid, p_session_no int, p_kind text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_cohort_member(p_cohort_id, auth.uid()) THEN
    RAISE EXCEPTION 'not a member of this cohort';
  END IF;
  IF p_kind NOT IN ('prompt', 'open') THEN
    RAISE EXCEPTION 'unknown mark kind: %', p_kind;
  END IF;

  INSERT INTO public.checkins (cohort_id, user_id, session_no, prompted_at, prompt_count, first_opened_at)
  VALUES (p_cohort_id, auth.uid(), p_session_no,
          CASE WHEN p_kind = 'prompt' THEN now() ELSE NULL END,
          CASE WHEN p_kind = 'prompt' THEN 1     ELSE 0    END,
          CASE WHEN p_kind = 'open'   THEN now() ELSE NULL END)
  ON CONFLICT (cohort_id, user_id, session_no) DO UPDATE SET
    -- prompt: 상한 2 를 넘으면 아무것도 하지 않는다(회차당 전면 안내 두 번이 상한)
    prompted_at     = CASE WHEN p_kind = 'prompt' AND checkins.prompt_count < 2 THEN now()
                           ELSE checkins.prompted_at END,
    prompt_count    = CASE WHEN p_kind = 'prompt' AND checkins.prompt_count < 2 THEN checkins.prompt_count + 1
                           ELSE checkins.prompt_count END,
    -- open: 최초 1회만 기록
    first_opened_at = CASE WHEN p_kind = 'open' THEN COALESCE(checkins.first_opened_at, now())
                           ELSE checkins.first_opened_at END;
END;
$$;

REVOKE ALL ON FUNCTION public.checkin_save(uuid, int, jsonb, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.checkin_submit(uuid, int)              FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.checkin_mark(uuid, int, text)          FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.checkin_save(uuid, int, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_submit(uuid, int)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_mark(uuid, int, text)          TO authenticated;


-- ============================================================
-- 4. 회차 일정 자동 생성 (클코1 S1 — 해법 교체)
--    호출 시점: 차수 개설이 아니라 인도자가 일정을 아는 시점(콘솔의 회차 일정 UI)이다.
--    개설 시 자동 호출하지 않는다 — 일정의 단일 진실은 cohort_sessions 다.
--    '일정 미등록'은 정상 상태이며, 참여자 화면은 담담히 안내하고
--    인도자 콘솔이 '회차 일정 미등록'을 조치 항목으로 띄운다(화면 지시서 Phase 7).
--    마감은 다음 회차 24시간 전, 마지막 회차는 개최 +7일.
-- ============================================================
CREATE FUNCTION public.seed_cohort_sessions(
  p_cohort_id  uuid,
  p_first_held timestamptz,
  p_count      int DEFAULT 7,
  p_interval   interval DEFAULT '7 days'
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_cohort_coach(p_cohort_id, auth.uid()) OR public.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'not authorized to seed sessions for this cohort';
  END IF;

  INSERT INTO public.cohort_sessions (cohort_id, session_no, held_at, opens_at, closes_at)
  SELECT p_cohort_id,
         n,
         p_first_held + (n - 1) * p_interval,
         p_first_held + (n - 1) * p_interval,
         CASE WHEN n < p_count
              THEN p_first_held + n * p_interval - interval '24 hours'
              ELSE p_first_held + (n - 1) * p_interval + interval '7 days'
         END
    FROM generate_series(1, p_count) AS n
  ON CONFLICT (cohort_id, session_no) DO NOTHING;  -- 이미 있는 회차는 손대지 않는다
END;
$$;

REVOKE ALL ON FUNCTION public.seed_cohort_sessions(uuid, timestamptz, int, interval) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seed_cohort_sessions(uuid, timestamptz, int, interval) TO authenticated;


-- ============================================================
-- 5. my_cohorts 확장 — 기존 8필드 전량 보존 + 갈무리 3필드 = 11필드 (Nit1)
--    RETURNS TABLE 변경이라 DROP + CREATE. post_opened·joined_at 보존(ADR-55 회귀 금지).
--    open_session_*: now() 가 [opens_at, closes_at] 안에 드는 회차(최소 번호) 기준.
--    행 없으면 COALESCE(..., false)/NULL (Nit2).
-- ============================================================
DROP FUNCTION IF EXISTS public.my_cohorts();
CREATE FUNCTION public.my_cohorts()
RETURNS TABLE(
  cohort_id                 uuid,
  name                      text,
  coach_name                text,
  status                    text,
  pre_done                  boolean,
  post_done                 boolean,
  post_opened               boolean,
  open_session_no           int,
  open_session_submitted    boolean,
  open_session_has_content  boolean,
  joined_at                 timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
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
    SELECT cs.session_no
    FROM cohort_sessions cs
    WHERE cs.cohort_id = c.id AND now() BETWEEN cs.opens_at AND cs.closes_at
    ORDER BY cs.session_no
    LIMIT 1
  ) open_sess ON true
  LEFT JOIN checkins ck ON ck.cohort_id = c.id AND ck.user_id = auth.uid() AND ck.session_no = open_sess.session_no
  WHERE e.user_id = auth.uid()
  ORDER BY e.joined_at DESC;
$$;
REVOKE ALL ON FUNCTION public.my_cohorts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_cohorts() TO authenticated;


-- ============================================================
-- 6. PostgREST 스키마 캐시 리로드
-- ============================================================
NOTIFY pgrst, 'reload schema';
