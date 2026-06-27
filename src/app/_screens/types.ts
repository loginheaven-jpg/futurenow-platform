// 진입·콘솔 화면 로컬 타입(앱 레이어). 계약(/contracts) 아님.
// CohortPreviewMeta 는 계약으로 승격됨(/contracts, 승인 2026-06-28) — 여기서 재정의하지 않는다.

// 인스트루먼트 표시 정보(진단명·예상 시간) — instrumentId → 표시용. 앱 프레젠테이션.
export function instrumentDisplay(instrumentId: string): { label: string; minutes: number } {
  if (instrumentId === 'futurenow') return { label: '퓨처나우 진단', minutes: 5 };
  return { label: instrumentId, minutes: 5 };
}

// 콘솔 샘플/표시용 명단 행
export interface RosterMember {
  id: string;
  name: string;
  status: 'care' | 'done' | 'pending';
  note?: string; // 먼저 챙길 분 사유(인도자 화면)
}

export interface CohortSummary {
  id: string;
  name: string;
  instrumentLabel: string;
  responded: number;
  total: number;
  careCount: number;
  code: string;
}
