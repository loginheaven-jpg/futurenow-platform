// /src/contracts/core-context.ts
//
// 작업 A — 코어 경계 (CoreContext). 방향: **코어 → 진단**.
// 코어가 제공하는 서비스 표면. 진단 엔진은 이걸 호출만 한다.
// 출처: architecture.md §7. 형상은 사양 그대로(모듈 공유 위해 import/export 만 부가).
// **형상 변경은 지휘부 승인 후에만**(CLAUDE §1).

import type {
  Alert,
  AlertInput,
  CoachApplication,
  Cohort,
  CohortPreviewMeta,
  CoreUser,
  Enrollment,
  InstrumentId,
  MemberRef,
  ResponseEnvelope,
  Role,
  SaveResponseInput,
  Wave,
} from './domain';

export interface CoreContext {
  // 인증·신원
  currentUser(): Promise<CoreUser | null>;
  requireRole(role: Role): Promise<void>; // 비동기 — 현재 사용자 해석 후 역할 검사(견고화, 승인 2026-06-26)

  // 민감 채널 — 운영자 또는 본인만 성공. 그 외 호출 시 코어가 차단
  getPhone(userId: string): Promise<string | null>;
  setPhone(userId: string, phone: string): Promise<void>;

  // 차수·참여
  previewCohortByCode(code: string): Promise<CohortPreviewMeta | null>; // 가입 결정용 공개 메타(coachName·memberCount). 승인 2026-06-28
  resolveCohortByCode(code: string): Promise<Cohort | null>; // 차수 도메인 본체(가입-후/코치·운영자 경로)
  enrollByCode(code: string): Promise<Enrollment>; // 코드로 현재 사용자를 차수에 가입(코어 소유 — 승인 2026-06-26)
  createCohort(input: {
    name: string;
    instrumentId: InstrumentId;
    maxMembers?: number; // 미지정 시 생략 → DB 기본 100
    description?: string;
    expiresAt?: string | null;
  }): Promise<Cohort>; // 차수 개설(코치/운영자). 앱측 코드 생성+충돌 재시도, DDL 0. 승인 2026-06-28
  updateCohort(
    cohortId: string,
    patch: {
      name?: string;
      description?: string | null;
      maxMembers?: number; // > 0 (DB CHECK)
      status?: 'active' | 'archived'; // 마감 = 'archived'
      expiresAt?: string | null;
    },
  ): Promise<Cohort>; // 차수 부분수정(코치/운영자). coach_id·instrument_id·code·id 는 불변(patch 제외). 승인 2026-06-28
  getCohort(cohortId: string): Promise<Cohort>;
  listCohortsByCoach(coachId: string): Promise<Cohort[]>; // 코치 차수 목록(콘솔 홈). RLS: 본인 차수/운영자 전체. 승인 2026-06-28
  listCohortMembers(cohortId: string): Promise<MemberRef[]>; // 차수 멤버 id+name(코치/운영자, RPC cohort_member_directory). 승인 2026-06-28
  listEnrollments(cohortId: string): Promise<Enrollment[]>;

  // 응답 봉투 (answers·profile 타입은 진단이 지정)
  saveResponse<A, P>(input: SaveResponseInput<A, P>): Promise<string>;
  getResponse<A, P>(responseId: string): Promise<ResponseEnvelope<A, P>>;
  listResponses<A, P>(query: {
    instrumentId: InstrumentId;
    cohortId?: string;
    userId?: string;
    wave?: Wave;
  }): Promise<ResponseEnvelope<A, P>[]>;

  // 알림 (진단이 트리거, 코어가 전달)
  raiseAlert(input: AlertInput): Promise<void>;
  listAlerts(cohortId: string): Promise<Alert[]>; // 차수 알림 읽기(콘솔 '먼저 챙길 분'의 저장된 출처). RLS: 차수 코치/운영자. 승인 2026-06-28

  // 본부 — 코치 신청 승인/거절(USER→COACH 승격). 운영자 전용.
  listCoachApplications(status?: 'pending' | 'approved' | 'rejected'): Promise<CoachApplication[]>; // 운영자 전용(coach_apps_select=admin) + users 조인. 승인 2026-06-28
  decideCoachApplication(input: { applicationId: string; decision: 'approved' | 'rejected'; note?: string }): Promise<void>; // 운영자 전용, RPC decide_coach_application(원자 승격). 승인 2026-06-28
}
