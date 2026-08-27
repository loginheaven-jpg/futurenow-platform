-- 가치 카드 개인 응시 경로 (S-2 · B′ 확장 · ADR-122)
--   지시: CC_ORDER_site_v2.md §3 · IA v2.1 §4.3 · CC_MEMO_site_v2_S1.md 단계 7+S-2 묶음
--
-- **적용 버전 = `20260826150546`** (파일명 `20260827100000_` 와 다르다 — 다섯 번째 사례).
--   상대 순서 보존: 파일명 200000<20260827100000, 적용 142335<150546. ADR-122 ⑨.
--
-- **지금이 가장 싼 순간이다** — `value_assessments` 행이 **0건**이라 데이터 이관이 없다.
--   2기가 9/20 에 가치 카드를 쓰기 시작하면 그날부터 이관 비용이 붙는다.
--
-- **되돌리지 않고 연다.** 완주된 슬라이스(V-3~V-13)는 한 줄도 버리지 않는다.
--   기존 차수 경로는 그대로 살고, NULL 한 갈래가 옆에 선다.

-- ============================================================
-- 1. cohort_id 를 연다 + UNIQUE 를 부분 유니크 인덱스 둘로 교체
-- ============================================================
ALTER TABLE public.value_assessments ALTER COLUMN cohort_id DROP NOT NULL;

-- 기존 것은 **테이블 제약**이라 DROP CONSTRAINT 로 걷힌다(뒤에 딸린 인덱스도 함께 사라진다).
--   실측 확인: conname='value_assessments_user_id_cohort_id_key', contype='u'.
ALTER TABLE public.value_assessments
  DROP CONSTRAINT value_assessments_user_id_cohort_id_key;

-- 차수분 — 한 사람이 한 차수에 하나.
CREATE UNIQUE INDEX value_assessments_user_cohort_uniq
  ON public.value_assessments (user_id, cohort_id) WHERE cohort_id IS NOT NULL;

-- 개인분 — 한 사람에 하나. **이 인덱스가 없으면 NULL 은 서로 구별되므로 무한히 쌓인다**
--   (SQL 에서 NULL <> NULL 이라 기존 복합 UNIQUE 는 개인 행을 전혀 막지 못한다).
CREATE UNIQUE INDEX value_assessments_user_personal_uniq
  ON public.value_assessments (user_id) WHERE cohort_id IS NULL;

-- ============================================================
-- 2. RLS — 개인 행(NULL)이 정책에 걸려 막히지 않게 한다
--
--    **읽기 정책은 손대지 않는다.** 기존 정책이 `user_id = auth.uid() OR is_cohort_coach(cohort_id,…)
--    OR is_admin(…)` 인데, NULL 행에서는 `is_cohort_coach(NULL, x)` 가 false 라
--    **자동으로 '본인 + 운영자'** 가 된다. 발주서 §3.3 "NULL 행은 인도자에게 보이지 않는다"가
--    정책을 고치지 않고 성립한다 — ADR-121 이 체험 차수에서 쓴 것과 같은 성질이다.
--
--    쓰기 정책만 고친다. 쓰기는 DEFINER RPC 로만 도달하므로 실질 영향은 없으나(방어 심층),
--    `is_cohort_member(NULL, uid)` 가 false 라 정책이 개인 행을 부정하는 상태로 두지 않는다.
-- ============================================================
DROP POLICY IF EXISTS value_assessments_insert_own ON public.value_assessments;
CREATE POLICY value_assessments_insert_own ON public.value_assessments FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (cohort_id IS NULL OR public.is_cohort_member(cohort_id, auth.uid()))
  );

DROP POLICY IF EXISTS value_assessments_update_own ON public.value_assessments;
CREATE POLICY value_assessments_update_own ON public.value_assessments FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND (cohort_id IS NULL OR public.is_cohort_member(cohort_id, auth.uid()))
  )
  WITH CHECK (
    user_id = auth.uid()
    AND (cohort_id IS NULL OR public.is_cohort_member(cohort_id, auth.uid()))
  );

-- ============================================================
-- 3. 쓰기 RPC — cohort_id nullable 수용
--
--    **`ON CONFLICT (user_id, cohort_id)` 를 더 쓸 수 없다.** 그 추론은 **비부분** 유니크
--    인덱스에만 맞는다. 부분 인덱스로 바뀌었으므로 `ON CONFLICT (…) WHERE …` 로 술어까지
--    맞추거나 갈래마다 따로 써야 하는데, 그러면 15줄짜리 INSERT 가 두 벌이 된다(사본이 둘).
--
--    → **UPDATE 먼저, 없으면 INSERT** 로 바꾼다. `IS NOT DISTINCT FROM` 이 NULL 을 정상 비교한다.
--      원자성은 ON CONFLICT 보다 약하다 — 같은 사람이 동시에 두 번 시작하면 둘째가 23505 를 받는다.
--      **그래도 데이터는 안전하다**: 부분 유니크 인덱스가 진짜 보증이고, 실패는 예외로 드러난다
--      (조용한 중복이 아니다). 한 행의 주인이 한 사람이고 화면이 순차라 실측 위험은 낮다.
-- ============================================================
CREATE OR REPLACE FUNCTION public.value_save_progress(
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
  -- 응시 게이트는 갈래와 무관하게 **그대로 지난다**(S-1 단계 5).
  IF NOT public.member_can_assess(auth.uid(), 'standing') THEN
    RAISE EXCEPTION 'not eligible to start this assessment' USING errcode = '42501';
  END IF;

  -- 차수 검증은 차수분에만. NULL 이면 건너뛴다 — 개인 응시는 소속과 무관하다.
  IF p_cohort_id IS NOT NULL AND NOT public.is_cohort_member(p_cohort_id, auth.uid()) THEN
    RAISE EXCEPTION 'not a member of this cohort';
  END IF;
  IF p_stage NOT IN ('exploring','candidates','finalists') THEN
    RAISE EXCEPTION 'stage % not writable here', p_stage;
  END IF;

  SELECT * INTO v_cur FROM public.value_assessments
   WHERE user_id = auth.uid() AND cohort_id IS NOT DISTINCT FROM p_cohort_id;

  IF v_cur.finalized_at IS NOT NULL THEN
    RAISE EXCEPTION 'already finalized';
  END IF;

  IF v_cur.id IS NULL THEN
    IF p_stage <> 'exploring' THEN RAISE EXCEPTION 'first write must be exploring'; END IF;
  ELSIF NOT public.value_stage_ok(v_cur.stage, p_stage) THEN
    RAISE EXCEPTION 'illegal stage transition % -> %', v_cur.stage, p_stage;
  END IF;

  IF p_candidates IS NOT NULL THEN
    IF jsonb_typeof(p_candidates) <> 'array' THEN RAISE EXCEPTION 'candidates must be an array'; END IF;
    v_count := jsonb_array_length(p_candidates);
    IF p_stage IN ('candidates','finalists') AND (v_count < 8 OR v_count > 12) THEN
      RAISE EXCEPTION 'candidates out of range: %', v_count;
    END IF;
  ELSIF p_stage = 'candidates' AND (v_cur.candidates IS NULL) THEN
    RAISE EXCEPTION 'candidates required to enter this stage';
  END IF;

  IF v_cur.id IS NOT NULL THEN
    UPDATE public.value_assessments SET
      stage               = p_stage,
      progress            = COALESCE(p_progress,   progress),
      candidates          = COALESCE(p_candidates, candidates),
      stage1_completed_at = COALESCE(stage1_completed_at, CASE WHEN p_stage = 'candidates' THEN now() END),
      stage2_started_at   = COALESCE(stage2_started_at,   CASE WHEN p_stage = 'finalists'  THEN now() END)
    WHERE id = v_cur.id;
  ELSE
    INSERT INTO public.value_assessments
      (user_id, cohort_id, card_set_version, stage, progress, candidates, stage1_completed_at, stage2_started_at)
    VALUES
      (auth.uid(), p_cohort_id, 'v1', p_stage,
       COALESCE(p_progress, '{}'::jsonb), p_candidates,
       CASE WHEN p_stage = 'candidates' THEN now() END,
       CASE WHEN p_stage = 'finalists'  THEN now() END);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.value_finalize(p_cohort_id uuid, p_v1 int, p_v2 int, p_v3 int)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_cur public.value_assessments;
BEGIN
  IF NOT public.member_can_assess(auth.uid(), 'standing') THEN
    RAISE EXCEPTION 'not eligible to start this assessment' USING errcode = '42501';
  END IF;
  IF p_cohort_id IS NOT NULL AND NOT public.is_cohort_member(p_cohort_id, auth.uid()) THEN
    RAISE EXCEPTION 'not a member of this cohort';
  END IF;

  SELECT * INTO v_cur FROM public.value_assessments
   WHERE user_id = auth.uid() AND cohort_id IS NOT DISTINCT FROM p_cohort_id;

  IF v_cur.id IS NULL THEN RAISE EXCEPTION 'no assessment to finalize'; END IF;
  IF v_cur.finalized_at IS NOT NULL THEN RAISE EXCEPTION 'already finalized'; END IF;
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

CREATE OR REPLACE FUNCTION public.value_patch(
  p_cohort_id uuid,
  p_labels    jsonb DEFAULT NULL,
  p_wb        jsonb DEFAULT NULL,
  p_alignment text  DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- 응시 게이트를 두지 않는다(S-1 단계 5 판단 유지) — 확정 후 자기 기록에 이름을 붙이는 일이라
  --   '새 응시'가 아니고, 열람이 상태와 무관하다는 확정에 더 가깝다.
  IF p_cohort_id IS NOT NULL AND NOT public.is_cohort_member(p_cohort_id, auth.uid()) THEN
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
  WHERE user_id = auth.uid()
    AND cohort_id IS NOT DISTINCT FROM p_cohort_id
    AND finalized_at IS NOT NULL;

  IF NOT FOUND THEN RAISE EXCEPTION 'finalize first'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.value_save_progress(uuid,text,jsonb,jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.value_finalize(uuid,int,int,int)           FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.value_patch(uuid,jsonb,jsonb,text)         FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.value_save_progress(uuid,text,jsonb,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.value_finalize(uuid,int,int,int)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.value_patch(uuid,jsonb,jsonb,text)         TO authenticated;

-- ============================================================
-- 4. 이동·삭제는 손대지 않는다 — 확인만
--    `move_cohort_member` 의 충돌 제거 절과 UPDATE 는 둘 다 `cohort_id = p_from` 으로 거른다.
--    NULL 은 `= p_from` 에 걸리지 않으므로 **개인 행을 건드리지 않는다**(지시 1의 확인 항목).
--    `remove_cohort_member` 도 `cohort_id = p_cohort_id` 라 같다 — 개인 응시는 차수와 무관하니
--    차수에서 빠져도 남는 것이 옳다. 롤백 검증에서 행동으로 확인한다.
-- ============================================================
