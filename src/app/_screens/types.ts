// 진입·콘솔 화면 로컬 타입(앱 레이어). 계약(/contracts) 아님.
// CohortPreviewMeta 는 계약으로 승격됨(/contracts, 승인 2026-06-28) — 여기서 재정의하지 않는다.

// 인스트루먼트 표시 정보(진단명·예상 시간) — instrumentId → 표시용. 앱 프레젠테이션.
export function instrumentDisplay(instrumentId: string): { label: string; minutes: number } {
  if (instrumentId === 'futurenow') return { label: '퓨처나우 진단', minutes: 5 };
  return { label: instrumentId, minutes: 5 };
}

// 콘솔 샘플/표시용 명단 행
export interface RosterMember {
  id: string; // 응답자=responseId(리포트 진입)·미응답=userId
  userId: string; // 참여자 식별(휴지통 — 차수에서 제거). id 와 별도(id 는 응답자면 responseId). ADR-73
  name: string;
  status: 'care' | 'done' | 'pending';
  note?: string; // 먼저 챙길 분 사유(인도자 화면)
  trap?: string; // 주 함정 라벨(관성/준비/안주 — 소그룹 편성 참고). 응답자만·인스트루먼트가 계산·주입. ADR-77 Phase 3
}

export interface CohortSummary {
  id: string;
  name: string;
  description?: string | null; // 코치 차수 소개(편집용 — 차수 상세에서만 채움)
  coachName?: string | null; // 소유 인도자 이름(운영자 전체 차수 뷰에서만 채움 — 누구의 차수인지). ADR-74
  instrumentLabel: string;
  responded: number;
  total: number;
  careCount: number;
  code: string;
}
