-- 20260628120000_alerts_dedup.sql
-- 알림 멱등성(리뷰 발견 high, 2026-06-28): 한 응답·한 사유당 알림 1건.
-- finalizeResponse(서버 액션) 재호출·재시도·중복 제출 시 care/red_flag 알림이 중복 적재되는 것을 막는다.
-- alerts 는 불변(UPDATE/DELETE 정책 없음)이라 사후 정정 불가 → 삽입 단계에서 차단(유니크 인덱스).
-- raiseAlert 는 INSERT ... ON CONFLICT DO NOTHING(upsert ignoreDuplicates)로 충돌을 조용히 무시한다.

CREATE UNIQUE INDEX IF NOT EXISTS alerts_response_reason_uniq
  ON public.alerts (response_id, reason);
