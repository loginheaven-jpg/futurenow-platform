-- 가치 카드 다시 하기 (ADR-187).
--
-- 지금까지 되돌아갈 길이 없었다. `value_stage_ok` 의 전이표는 앞으로만 가고
--   (exploring→candidates→finalists→final), 초기화 RPC 도 없었다. 확정한 참여자는
--   결과 화면에서 나갈 수 없었고, 탐색 중인 참여자도 처음부터 다시 고를 수 없었다.
--
-- **덮어쓰기다**(지휘 판정 2026-09-03 · (가)안). 이전 결과를 남기지 않는다.
--   대가를 알고 고른 것이다 — 인도자가 이미 본 결과도 함께 사라진다. 화면이 무엇이
--   지워지는지 먼저 말하고 확인을 받는다.
--
-- **전이표는 건드리지 않는다.** 되돌림을 전이로 표현하면 `value_save_progress` 에
--   final→exploring 쌍이 열려 **저장 경로로도 초기화가 가능해진다.** 초기화는 자기
--   이름을 가진 한 곳에서만 일어나야 한다.

CREATE OR REPLACE FUNCTION public.value_restart(p_cohort_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_cur public.value_assessments;
BEGIN
  -- 응시 게이트를 그대로 지난다. 다시 하는 것도 응시다(S-1 단계 5).
  IF NOT public.member_can_assess(auth.uid(), 'standing') THEN
    RAISE EXCEPTION 'not eligible to start this assessment' USING errcode = '42501';
  END IF;

  -- 차수 검증은 차수분에만. NULL 이면 건너뛴다 — 개인 응시는 소속과 무관하다.
  IF p_cohort_id IS NOT NULL AND NOT public.is_cohort_member(p_cohort_id, auth.uid()) THEN
    RAISE EXCEPTION 'not a member of this cohort';
  END IF;

  -- 자기 행만 본다. auth.uid() 로 잠그므로 남의 행에 닿을 통로가 없다.
  SELECT * INTO v_cur FROM public.value_assessments
   WHERE user_id = auth.uid() AND cohort_id IS NOT DISTINCT FROM p_cohort_id;

  -- 없는 것을 지우지 않는다. 화면이 상태를 잘못 읽었다는 뜻이므로 조용히 넘기지 않는다.
  IF v_cur.id IS NULL THEN
    RAISE EXCEPTION 'no assessment to restart';
  END IF;

  -- 행을 지우지 않고 비운다. created_at 과 id 가 남아야 인도자 화면의 참조가 끊기지 않고,
  --   부분 유니크 인덱스와도 다투지 않는다.
  UPDATE public.value_assessments
     SET stage        = 'exploring',
         progress     = '{}'::jsonb,
         candidates   = NULL,
         value1_id    = NULL, value2_id    = NULL, value3_id    = NULL,
         value1_label = NULL, value2_label = NULL, value3_label = NULL,
         wb_peak      = NULL, wb_strength  = NULL, wb_longing   = NULL,
         alignment    = NULL,
         -- 계측도 함께 비운다. 남겨 두면 '1차를 마쳤는데 탐색 중'인 모순된 행이 된다.
         stage1_completed_at = NULL,
         stage2_started_at   = NULL,
         -- 이것을 비우지 않으면 value_save_progress 가 'already finalized' 로 막는다.
         finalized_at = NULL,
         updated_at   = now()
   WHERE id = v_cur.id;
END;
$$;

-- 쓰기는 전량 DEFINER RPC 경유다(ADR-80). 테이블 쓰기 권한은 여전히 회수된 상태다.
REVOKE ALL ON FUNCTION public.value_restart(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.value_restart(uuid) TO authenticated;
