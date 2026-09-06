// 진입·콘솔 화면 로컬 타입(앱 레이어). 계약(/contracts) 아님.
// CohortPreviewMeta 는 계약으로 승격됨(/contracts, 승인 2026-06-28) — 여기서 재정의하지 않는다.

// 인스트루먼트 표시 정보(진단명·예상 시간) — instrumentId → 표시용. 앱 프레젠테이션.
import type { Wave } from '@/contracts';
import { TOOL } from '@/app/_vocab/tool';

export function instrumentDisplay(instrumentId: string): { label: string; minutes: number } {
  if (instrumentId === 'futurenow') return { label: TOOL.productLabel, minutes: 5 };
  return { label: instrumentId, minutes: 5 };
}

// 콘솔 샘플/표시용 명단 행
export interface RosterMember {
  id: string; // 응답자=responseId(리포트 진입)·미응답=userId
  userId: string; // 참여자 식별(휴지통 — 회기에서 제거). id 와 별도(id 는 응답자면 responseId). ADR-73
  name: string;
  status: 'care' | 'done' | 'pending';
  note?: string; // 먼저 챙길 분 사유(인도자 화면)
  trap?: string; // 주 함정 라벨(관성/준비/안주 — 소그룹 편성 참고). 응답자만·인스트루먼트가 계산·주입. ADR-77 Phase 3
  /**
   * 이 행이 여는 응답의 wave(U-11). **마무리가 열린 뒤에는 같은 행이 다른 문서를 연다** —
   * 명단은 그 사람의 «돌봄 표시 응답, 없으면 최신 응답» 을 실으므로 개시 뒤에는 사후가 최신이다.
   * 그 사실이 행에서 읽히지 않으면 인도자는 사전 리포트인 줄 알고 누른다.
   * 미응답 행에는 없다. `'pre'` 일 때는 표시하지 않는다 — 개시 전에는 전부 사전이라 말할 것이 없다.
   */
  wave?: Wave;
}

export interface CohortSummary {
  id: string;
  name: string;
  description?: string | null; // 코치 회기 소개(편집용 — 회기 상세에서만 채움)
  coachName?: string | null; // 소유 인도자 이름(운영자 전체 회기 뷰에서만 채움 — 누구의 회기인지). ADR-74
  instrumentLabel: string;
  responded: number;
  total: number;
  careCount: number;
  code: string;
}
