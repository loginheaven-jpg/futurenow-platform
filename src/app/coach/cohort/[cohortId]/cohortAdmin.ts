// 차수 관리 순수 헬퍼(서버액션·UI 공용 검증/정제 — 단위테스트 대상). 'use server' 아님(순수 export 허용).

/** 차수 이름 유효성: trim 후 1~40자. 빈값·공백전용·초과 거부. */
export function cohortNameValid(name: string): boolean {
  const t = name.trim();
  return t.length >= 1 && t.length <= 40;
}

/** 액션 실패 메시지 정제(2.4 패턴): NotFound·소유/권한·내부 CoreError 는 통합 친화 메시지로. 친화 폴백 카피는 그대로. */
export function refineActionError(error?: string): string {
  if (!error) return '문제가 생겼어요. 잠시 후 다시 시도해 주세요.';
  // NotFound("차수를 찾을 수 없습니다: …") · Forbidden("…가능합니다") · 내부 CoreError("updateCohort 실패: …") → 통합(원본 비노출)
  if (error.includes('찾을 수 없') || error.includes('가능합니다') || error.includes('updateCohort 실패')) {
    return '차수를 찾을 수 없거나 권한이 없어요.';
  }
  return error; // 친화 폴백 카피(예: "정원 변경에 실패했습니다." / "이름은 1~40자로 입력해 주세요.")
}

/**
 * 낙관적 액션 오케스트레이션(C-4 시범·ADR-62). router.refresh() 전체 재렌더(바닥 ~1.5s) 대신,
 * 성공 시 낙관적 반영을 유지(재조회 불요 — 낙관적 값 == 서버 저장 입력)하고, 실패·예외 시 명시적으로 롤백한다.
 * **조용한 삼킴 금지** — 실패든 예외든 반드시 onRollback(error) 이 불려 사용자에게 롤백/에러가 보인다.
 *   optimistic() : 낙관적 반영(즉시)
 *   action()     : 서버 액션({ ok, error? })
 *   onCommit()   : 성공 확정(예: 성공 토스트)
 *   onRollback() : 실패 롤백(예: 이전 상태 복원 + 에러 토스트). error 는 항상 전달(반환 실패=res.error, 예외=e.message).
 * 반환: 성공 true / 실패 false.
 */
export async function applyOptimistic(input: {
  optimistic: () => void;
  action: () => Promise<{ ok: boolean; error?: string }>;
  onCommit: () => void;
  onRollback: (error?: string) => void;
}): Promise<boolean> {
  input.optimistic();
  try {
    const res = await input.action();
    if (res.ok) {
      input.onCommit();
      return true;
    }
    input.onRollback(res.error);
    return false;
  } catch (e) {
    input.onRollback(e instanceof Error ? e.message : undefined);
    return false;
  }
}
