-- 응시 게이트 — 회원 상태가 **새 응시**를 가른다 (S-1 단계 5 · ADR-122)
--   지시: CC_MEMO_site_v2_S1.md 단계 5 지시 3 — "응시 게이트는 RPC 에서 막는다.
--   화면이 버튼을 감추는 것은 표시일 뿐이다."
--
-- **적용 버전 = `20260826141012`** (파일명 `20260826190000_` 와 다르다).
--   apply_migration 이 적용 시각으로 자체 채번한다 — 세 번째 사례다
--   (value_assessments 20260826120000→20260826005825 · membership 20260826160000→20260826092730).
--   상대 순서는 보존된다(파일명 160000<190000, 적용 092730<141012). ADR-122 ⑨.
--
-- **무엇을 막고 무엇을 막지 않는가.**
--   막는다: `value_save_progress`(응시 시작·진행) · `value_finalize`(응시 완료)
--   막지 않는다: `value_patch`(확정 후 라벨·대조 기입)
--     → 이미 확정된 **자기 기록**에 이름을 붙이는 일이라 '새 응시'가 아니다. 열람이 상태와
--        무관하다는 확정(메모 §2-가)에 더 가깝다. 만료된 사람이 자기 결과를 열어 라벨을
--        마저 적는 것을 막을 이유가 없다.
--
-- **열람은 어디에도 걸지 않는다.** `getMyValueAssessment`·`listCohortValueAssessments` 는
--   손대지 않았다. 자기가 응시한 결과는 상태와 무관하게 언제나 본인에게 열린다.
--
-- 사전 체크(journey)는 별도 게이트를 두지 않는다 — 차수 등록이 곧 게이트이고,
--   등록된 사람은 member_state 가 'cohort' 라 여정이 열린다. 게이트를 두 겹 두면
--   한 겹만 고쳐질 때 뚫린다.

-- ============================================================
-- 1. 진행 저장 — 첫 쓰기가 곧 응시 시작이다
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
  -- **회원 상태 게이트(S-1 신설).** 차수 멤버십보다 먼저 본다 — 보류·만료된 사람이
  --   차수에 남아 있다는 이유로 새 응시를 시작하면 상태가 뜻을 잃는다.
  IF NOT public.member_can_assess(auth.uid(), 'standing') THEN
    RAISE EXCEPTION 'not eligible to start this assessment' USING errcode = '42501';
  END IF;

  IF NOT public.is_cohort_member(p_cohort_id, auth.uid()) THEN
    RAISE EXCEPTION 'not a member of this cohort';
  END IF;
  IF p_stage NOT IN ('exploring','candidates','finalists') THEN
    RAISE EXCEPTION 'stage % not writable here', p_stage;
  END IF;

  SELECT * INTO v_cur FROM public.value_assessments
   WHERE user_id = auth.uid() AND cohort_id = p_cohort_id;

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

-- ============================================================
-- 2. 확정 — 응시의 마지막 걸음이라 함께 막는다
-- ============================================================
CREATE OR REPLACE FUNCTION public.value_finalize(p_cohort_id uuid, p_v1 int, p_v2 int, p_v3 int)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_cur public.value_assessments;
BEGIN
  IF NOT public.member_can_assess(auth.uid(), 'standing') THEN
    RAISE EXCEPTION 'not eligible to start this assessment' USING errcode = '42501';
  END IF;

  IF NOT public.is_cohort_member(p_cohort_id, auth.uid()) THEN
    RAISE EXCEPTION 'not a member of this cohort';
  END IF;

  SELECT * INTO v_cur FROM public.value_assessments
   WHERE user_id = auth.uid() AND cohort_id = p_cohort_id;

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

-- ACL 은 CREATE OR REPLACE 가 보존하지만 저장소 관례대로 명시한다(20260826120000 과 동일).
REVOKE ALL ON FUNCTION public.value_save_progress(uuid,text,jsonb,jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.value_finalize(uuid,int,int,int)           FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.value_save_progress(uuid,text,jsonb,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.value_finalize(uuid,int,int,int)           TO authenticated;
