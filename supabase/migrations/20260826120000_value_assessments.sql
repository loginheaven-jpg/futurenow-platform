-- 가치 카드 저장 계층 (ADR-121 · 지시서 v3 §3, 3차 검토 N-1~N-5 반영)
--
-- **적용 버전 = `20260826005825`** (파일명 `20260826120000_` 와 다르다 — **첫 번째 사례**).
--   `apply_migration` 이 적용 시각으로 자체 채번한다. 나머지 다섯 건은 머리에 이 주석이 있는데
--   이 파일만 없었다(3차 T-6 발견) — 지휘부가 주석 규율을 정한 것이 두 번째 사례 뒤였기 때문이다.
--   **파일명은 바꾸지 않는다**(ADR-122 ⑨ · 상대 순서는 보존된다).
--
-- 쓰기는 전량 DEFINER RPC 다(D1 · ADR-80). 이 프로젝트는 default privileges 로 신규 public 테이블에
--   authenticated 전권(arwdDxtm)을 자동 부여하므로 **GRANT 가 아니라 REVOKE 가 필요**하다.
--   갈무리가 같은 이유로 20260727110000 에서 쓰기를 회수했고 그 선례를 그대로 따른다.
--
-- 검토 반영:
--   N-1 개수 규칙 — 화면과 서버가 **같은 경계**를 쓴다(후보 8~12 를 서버가 하드로 강제).
--   N-2 stage — '역행 금지'만으로는 exploring→final 도약을 못 막는다. **허용 전이 목록**으로 바꾼다.
--   N-3 이동·삭제 — 함수명은 move_cohort_member(ADR-84)이고 '삭제'는 휴지통 차수로의 이동이다.
--        unique(user_id,cohort_id) 때문에 곧이곧대로 UPDATE 하면 23505 로 함수 전체가 실패하므로
--        갈무리와 동형의 충돌 제거 절을 넣는다(ADR-87 선례).
--   N-4 경계 검증 — 앱이 zod 로 막지만 DB 도 길이 CHECK 를 건다(이중).
--   N-5 검증 — tests/rls.integration.test.ts 가 행동으로 판정한다.

-- ============================================================
-- 1. 테이블
-- ============================================================
CREATE TABLE public.value_assessments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  cohort_id        uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  -- 판본은 기록자(카드 상수)가 정한다. DEFAULT 를 두지 않아 스키마가 버전을 정하지 않게 한다.
  card_set_version text NOT NULL,

  stage      text  NOT NULL DEFAULT 'exploring'
             CHECK (stage IN ('exploring','candidates','finalists','final')),
  -- 진행 버퍼: 화면 이동마다 증분 저장(1차 전체·2차 중반 유실 방지 — 검토 R2-1).
  progress   jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- 1차 산출물: 후보 카드 id 정수 배열.
  candidates jsonb,
  -- 2차 산출물.
  value1_id int, value2_id int, value3_id int,
  value1_label text CHECK (char_length(value1_label) <= 60),
  value2_label text CHECK (char_length(value2_label) <= 60),
  value3_label text CHECK (char_length(value3_label) <= 60),

  wb_peak     text CHECK (char_length(wb_peak) <= 20),
  wb_strength text CHECK (char_length(wb_strength) <= 20),
  wb_longing  text CHECK (char_length(wb_longing) <= 20),
  alignment   text CHECK (alignment IN ('aligned','different','unsure','skipped')),

  -- 계측(§6-3 지표 — 건너뛰기율·단계별 이탈률).
  stage1_completed_at timestamptz,
  stage2_started_at   timestamptz,
  finalized_at        timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, cohort_id)
);

CREATE INDEX value_assessments_cohort_idx ON public.value_assessments (cohort_id);

CREATE TRIGGER value_assessments_touch_updated_at
  BEFORE UPDATE ON public.value_assessments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- 2. 권한 — REVOKE 가 본체다(D1)
-- ============================================================
ALTER TABLE public.value_assessments ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.value_assessments TO authenticated;
-- TRUNCATE 를 반드시 회수한다 — RLS 적용 대상이 아니라 남겨 두면 로그인 사용자가 테이블을 비울 수 있다.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.value_assessments FROM authenticated;
REVOKE ALL ON public.value_assessments FROM anon;

-- ============================================================
-- 3. RLS — 쓰기는 RPC 로만 도달하지만 정책도 함께 건다(방어 심층)
-- ============================================================

-- 본인 + 그 차수 멤버. 멤버 게이트가 없으면 비멤버가 남의 차수에 행을 심고,
--   그 차수 인도자에게 낯선 사람의 서술 원문이 열린다(검토 B-1 ③).
CREATE POLICY value_assessments_insert_own ON public.value_assessments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_cohort_member(cohort_id, auth.uid()));

CREATE POLICY value_assessments_update_own ON public.value_assessments FOR UPDATE TO authenticated
  USING      (user_id = auth.uid() AND public.is_cohort_member(cohort_id, auth.uid()))
  WITH CHECK (user_id = auth.uid() AND public.is_cohort_member(cohort_id, auth.uid()));

-- 본인 · 그 차수 인도자 · 운영자. 다른 차수 인도자는 차단(§6.2 가시성 매트릭스).
--   체험(general) 차수는 coach_id 가 운영자라, 이 정책만으로 '본인+운영자'가 된다(ADR-63 전제).
CREATE POLICY value_assessments_select ON public.value_assessments FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_cohort_coach(cohort_id, auth.uid())
    OR public.is_admin(auth.uid())
  );

-- DELETE 정책 없음 — 참여자는 지울 수 없다. 정리는 아래 4절의 운영자 경로가 맡는다.

-- ============================================================
-- 4. 쓰기 RPC (self-scoped DEFINER)
-- ============================================================

-- 허용 전이만 통과시킨다. '역행 금지'만으로는 exploring→final 도약을 못 막는다(N-2).
CREATE FUNCTION public.value_stage_ok(p_from text, p_to text) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT (p_from, p_to) IN (
    ('exploring','exploring'), ('exploring','candidates'),
    ('candidates','candidates'), ('candidates','finalists'),
    ('finalists','finalists'), ('finalists','final'),
    ('final','final')
  );
$$;

-- 4.1 진행 저장(1차·2차 공통, 증분). 넘기지 않은 인자는 **보존**한다(갈무리 COALESCE 선례).
CREATE FUNCTION public.value_save_progress(
  p_cohort_id  uuid,
  p_stage      text,
  p_progress   jsonb DEFAULT NULL,
  p_candidates jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_cur   public.value_assessments;
  v_count int;
BEGIN
  IF NOT public.is_cohort_member(p_cohort_id, auth.uid()) THEN
    RAISE EXCEPTION 'not a member of this cohort';
  END IF;
  IF p_stage NOT IN ('exploring','candidates','finalists') THEN
    RAISE EXCEPTION 'stage % not writable here', p_stage;
  END IF;

  SELECT * INTO v_cur FROM public.value_assessments
   WHERE user_id = auth.uid() AND cohort_id = p_cohort_id;

  -- 확정 후 잠금 — 최종 3개가 정해진 뒤에는 앞 단계로 되돌아 쓰지 않는다.
  IF v_cur.finalized_at IS NOT NULL THEN
    RAISE EXCEPTION 'already finalized';
  END IF;

  IF v_cur.id IS NULL THEN
    IF p_stage <> 'exploring' THEN RAISE EXCEPTION 'first write must be exploring'; END IF;
  ELSIF NOT public.value_stage_ok(v_cur.stage, p_stage) THEN
    RAISE EXCEPTION 'illegal stage transition % -> %', v_cur.stage, p_stage;
  END IF;

  -- 후보 개수는 서버가 강제한다. 화면 규칙과 같은 경계여야 한다(N-1).
  IF p_candidates IS NOT NULL THEN
    IF jsonb_typeof(p_candidates) <> 'array' THEN RAISE EXCEPTION 'candidates must be an array'; END IF;
    v_count := jsonb_array_length(p_candidates);
    IF p_stage IN ('candidates','finalists') AND (v_count < 8 OR v_count > 12) THEN
      RAISE EXCEPTION 'candidates out of range: %', v_count;
    END IF;
  ELSIF p_stage = 'candidates' AND (v_cur.candidates IS NULL) THEN
    RAISE EXCEPTION 'candidates required to enter this stage';
  END IF;

  INSERT INTO public.value_assessments
    (user_id, cohort_id, card_set_version, stage, progress, candidates, stage1_completed_at, stage2_started_at)
  VALUES
    (auth.uid(), p_cohort_id, 'v1', p_stage,
     COALESCE(p_progress, '{}'::jsonb), p_candidates,
     CASE WHEN p_stage = 'candidates' THEN now() END,
     CASE WHEN p_stage = 'finalists'  THEN now() END)
  ON CONFLICT (user_id, cohort_id) DO UPDATE SET
    stage               = p_stage,
    progress            = COALESCE(p_progress,   value_assessments.progress),
    candidates          = COALESCE(p_candidates, value_assessments.candidates),
    stage1_completed_at = COALESCE(value_assessments.stage1_completed_at,
                                   CASE WHEN p_stage = 'candidates' THEN now() END),
    stage2_started_at   = COALESCE(value_assessments.stage2_started_at,
                                   CASE WHEN p_stage = 'finalists'  THEN now() END);
END;
$$;

-- 4.2 최종 3개 확정(선저장). 이 시점에 stage='final' 과 finalized_at 이 함께 선다.
CREATE FUNCTION public.value_finalize(p_cohort_id uuid, p_v1 int, p_v2 int, p_v3 int)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_cur public.value_assessments;
BEGIN
  IF NOT public.is_cohort_member(p_cohort_id, auth.uid()) THEN
    RAISE EXCEPTION 'not a member of this cohort';
  END IF;

  SELECT * INTO v_cur FROM public.value_assessments
   WHERE user_id = auth.uid() AND cohort_id = p_cohort_id;

  IF v_cur.id IS NULL THEN RAISE EXCEPTION 'no assessment to finalize'; END IF;
  IF v_cur.finalized_at IS NOT NULL THEN RAISE EXCEPTION 'already finalized'; END IF;
  -- 도약 차단 — 후보·5개를 거치지 않고 곧바로 확정할 수 없다(N-2).
  IF v_cur.stage <> 'finalists' THEN RAISE EXCEPTION 'must pass finalists stage'; END IF;

  IF p_v1 IS NULL OR p_v2 IS NULL OR p_v3 IS NULL THEN RAISE EXCEPTION 'three values required'; END IF;
  IF p_v1 = p_v2 OR p_v2 = p_v3 OR p_v1 = p_v3 THEN RAISE EXCEPTION 'values must be distinct'; END IF;
  IF NOT (v_cur.candidates @> to_jsonb(ARRAY[p_v1, p_v2, p_v3])) THEN
    RAISE EXCEPTION 'final values must come from candidates';
  END IF;

  UPDATE public.value_assessments
     SET stage = 'final', value1_id = p_v1, value2_id = p_v2, value3_id = p_v3, finalized_at = now()
   WHERE id = v_cur.id;
END;
$$;

-- 4.3 라벨·대조 증분 갱신. 확정 이후에도 쓸 수 있는 유일한 경로이며 value*_id 는 손대지 않는다.
CREATE FUNCTION public.value_patch(
  p_cohort_id uuid,
  p_labels    jsonb DEFAULT NULL,
  p_wb        jsonb DEFAULT NULL,
  p_alignment text  DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_cohort_member(p_cohort_id, auth.uid()) THEN
    RAISE EXCEPTION 'not a member of this cohort';
  END IF;
  IF p_alignment IS NOT NULL AND p_alignment NOT IN ('aligned','different','unsure','skipped') THEN
    RAISE EXCEPTION 'bad alignment';
  END IF;

  UPDATE public.value_assessments SET
    value1_label = COALESCE(NULLIF(p_labels->>'v1', ''), value1_label),
    value2_label = COALESCE(NULLIF(p_labels->>'v2', ''), value2_label),
    value3_label = COALESCE(NULLIF(p_labels->>'v3', ''), value3_label),
    wb_peak      = COALESCE(NULLIF(p_wb->>'peak', ''),     wb_peak),
    wb_strength  = COALESCE(NULLIF(p_wb->>'strength', ''), wb_strength),
    wb_longing   = COALESCE(NULLIF(p_wb->>'longing', ''),  wb_longing),
    alignment    = COALESCE(p_alignment, alignment)
  WHERE user_id = auth.uid() AND cohort_id = p_cohort_id AND finalized_at IS NOT NULL;

  IF NOT FOUND THEN RAISE EXCEPTION 'finalize first'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.value_stage_ok(text,text)                      FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.value_save_progress(uuid,text,jsonb,jsonb)     FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.value_finalize(uuid,int,int,int)               FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.value_patch(uuid,jsonb,jsonb,text)             FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.value_stage_ok(text,text)                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.value_save_progress(uuid,text,jsonb,jsonb)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.value_finalize(uuid,int,int,int)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.value_patch(uuid,jsonb,jsonb,text)          TO authenticated;

-- ============================================================
-- 5. 참여자 이동·삭제 경로 편입 (N-3)
--    이름은 move_cohort_member 다(participant_move 는 파일명이지 함수명이 아니다).
--    '삭제' = 휴지통 차수로 이동(소프트). remove_cohort_member 는 휴지통 비우기(영구).
-- ============================================================

-- 이동 — 대상 차수에 이미 행이 있으면 원본을 버린다(unique 충돌 제거. 갈무리 ADR-87 과 동형).
--        이 절이 없으면 이중 등록자를 옮길 때 23505 로 **함수 전체가 실패**한다.
CREATE OR REPLACE FUNCTION public.move_cohort_member(p_user uuid, p_from uuid, p_to uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'admin only'; END IF;
  IF p_from = p_to THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM enrollments WHERE cohort_id=p_from AND user_id=p_user) THEN
    RAISE EXCEPTION 'not enrolled in source cohort';
  END IF;

  DELETE FROM checkins src
   WHERE src.cohort_id=p_from AND src.user_id=p_user
     AND EXISTS (SELECT 1 FROM checkins dst
                  WHERE dst.cohort_id=p_to AND dst.user_id=p_user AND dst.session_no=src.session_no);
  UPDATE checkins SET cohort_id=p_to WHERE cohort_id=p_from AND user_id=p_user;

  DELETE FROM value_assessments src
   WHERE src.cohort_id=p_from AND src.user_id=p_user
     AND EXISTS (SELECT 1 FROM value_assessments dst WHERE dst.cohort_id=p_to AND dst.user_id=p_user);
  UPDATE value_assessments SET cohort_id=p_to WHERE cohort_id=p_from AND user_id=p_user;

  IF EXISTS (SELECT 1 FROM enrollments WHERE cohort_id=p_to AND user_id=p_user) THEN
    DELETE FROM enrollments WHERE cohort_id=p_from AND user_id=p_user;
  ELSE
    UPDATE enrollments SET cohort_id=p_to WHERE cohort_id=p_from AND user_id=p_user;
  END IF;
END; $$;

-- 영구 삭제 — 가치 결과도 함께 지운다. 빠뜨리면 명단에서 사라진 사람의 서술 원문이 남는다.
CREATE OR REPLACE FUNCTION public.remove_cohort_member(p_cohort_id uuid, p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.is_cohort_coach(p_cohort_id, auth.uid()) OR public.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  DELETE FROM public.value_assessments WHERE cohort_id = p_cohort_id AND user_id = p_user_id;
  DELETE FROM public.checkins          WHERE cohort_id = p_cohort_id AND user_id = p_user_id;
  DELETE FROM public.responses         WHERE cohort_id = p_cohort_id AND user_id = p_user_id;
  DELETE FROM public.response_drafts   WHERE cohort_id = p_cohort_id AND user_id = p_user_id;
  DELETE FROM public.enrollments       WHERE cohort_id = p_cohort_id AND user_id = p_user_id;
END; $$;

-- CREATE OR REPLACE 는 기존 ACL 을 보존하지만, 저장소 관례대로 명시해 둔다.
REVOKE ALL ON FUNCTION public.move_cohort_member(uuid,uuid,uuid)   FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.move_cohort_member(uuid,uuid,uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.remove_cohort_member(uuid,uuid)      FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_cohort_member(uuid,uuid)    TO authenticated;
