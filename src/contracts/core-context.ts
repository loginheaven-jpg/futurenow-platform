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
  MemberSummary,
  MyCohortSummary,
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
  setName(name: string): Promise<void>; // 본인 표시 이름 수정(users.name). 본인 전용(id=auth.uid()). role 미포함(2.S2 봉쇄·set_user_role 전용). 승인 2026-06-29

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
  listMyCohorts(): Promise<MyCohortSummary[]>; // 멤버 본인 차수+진행(RPC my_cohorts, DEFINER 비민감 메타). 코치 시점 listEnrollments 와 분리. 승인 2026-06-29
  listCohortsByCoach(coachId: string): Promise<Cohort[]>; // 코치 차수 목록(콘솔 홈). RLS: 본인 차수/운영자 전체. 승인 2026-06-28
  listCohortMembers(cohortId: string): Promise<MemberRef[]>; // 차수 멤버 id+name(코치/운영자, RPC cohort_member_directory). 승인 2026-06-28
  listEnrollments(cohortId: string): Promise<Enrollment[]>;

  // 진행 중 응답 보존(중간저장) — 본인 한정(RLS user_id=auth.uid()). 제출 전 작성본.
  //   step/진행 인덱스 미저장(셔플 안전): answers만. 재개 시 "안 푼 첫 필수 문항"으로 위치 재계산. 승인 2026-06-30
  //   responses 와 분리(별도 테이블 response_drafts) — 제출 시 responses 정식 INSERT, draft 는 정리. PK(user,cohort,wave) 덮어쓰기.
  saveDraft<A>(input: { instrumentId: InstrumentId; cohortId: string; wave: Wave; answers: A }): Promise<void>; // upsert(최신 덮어쓰기)
  getDraft<A>(query: { instrumentId: InstrumentId; cohortId: string; wave: Wave }): Promise<A | null>; // 본인 draft answers(없으면 null)
  clearDraft(query: { cohortId: string; wave: Wave }): Promise<void>; // 제출 완료·취소 시 삭제

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

  // 본부 — 멤버 역할 관리(직접 승격/강등). 운영자 전용. ADR-28
  listUsers(): Promise<MemberSummary[]>; // 운영자 전용(users_select=admin 전체). 비admin은 RLS로 본인 행만.
  setUserRole(userId: string, role: Role): Promise<void>; // 운영자 전용, RPC set_user_role(가드: admin·화이트리스트·자기강등 방지).
}
