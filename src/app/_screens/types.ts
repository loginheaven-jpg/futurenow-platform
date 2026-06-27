// 진입·콘솔 화면 로컬 타입(앱 레이어). 계약(/contracts) 아님.
// ⚠ CohortPreviewMeta 는 Cohort 도메인 밖(coach_name·member_count 포함). 계약 승격은 지휘부 협의(§7.2, plan).
//    데이터 출처: resolve_cohort_by_code 메타(정의자). 현 CoreContext.resolveCohortByCode 는 Cohort 만 반환하므로
//    이 메타를 받으려면 코어 메서드 추가가 필요(계약 변경) — 보고로 결정. 화면은 props 주입으로 우선 구현.
export interface CohortPreviewMeta {
  id: string;
  name: string;
  coachName: string;
  memberCount: number;
  maxMembers: number;
  instrumentLabel: string; // 진단 종류 표시명(예: '퓨처나우 사전 진단')
  estimatedMinutes: number;
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
