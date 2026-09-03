// 갈무리 카드 초기 모드 판정(ADR-86). 서버 컴포넌트 본문에서 떼어내 테스트 가능한 순수 함수로 둔다
//   (loginOutcome·safeReturn·rosterModel 과 같은 관행).
//
// 규칙 넷 — 순서대로:
//   1) ?edit=1 : 작성 의도가 명시됐다(회기 홈 '쓰러/이어 쓰기', 열람 화면의 '고쳐 쓰기').
//   2) 행 없음 : 아직 아무것도 없다 → 바로 쓰기(현장 QR 첫 진입).
//   3) 열린 회차 + 미제출 : 이어 쓰러 온 것이다. 마감 전에는 작성이 기본 동작(ADR-81 주력 경로 보존).
//   4) 그 밖 : 열람. 제출했거나, 마감된 지난 회차다.
//
// 3)의 `closed` 조건이 두 요구를 동시에 만족시킨다 —
//   '쓰다 만 지난 회차'는 읽기로 열리고(지난 회차 목록의 주 용도),
//   '쓰다 만 이번 주 회차'는 쓰기로 열린다(QR·목록 버튼으로 이어 쓰러 온 사람).
export function resolveCheckinMode(input: {
  wantsEdit: boolean;
  closed: boolean;
  existing: { submittedAt: string | null; hasContent: boolean } | null;
}): 'read' | 'edit' {
  if (input.wantsEdit) return 'edit';
  if (input.existing == null) return 'edit';
  if (!input.closed && input.existing.submittedAt == null) return 'edit';
  if (input.existing.submittedAt == null && !input.existing.hasContent) return 'edit';
  return 'read';
}
