// DB 행(snake_case) ↔ 계약 도메인 타입(camelCase) 매핑. 순수 함수 — 단위테스트 대상.
// 거점 테이블은 public 스키마(SAIL 승격). 컬럼명은 20260626120000_core_platform_upgrade.sql 기준.
import type { Alert, CoachApplication, Cohort, CoreUser, Enrollment, ResponseEnvelope, Role, Wave } from '@/contracts';

export interface UserRow {
  id: string;
  email: string | null;
  name: string | null;
  nickname: string | null;
  role: string;
}
export function rowToUser(r: UserRow): CoreUser {
  return {
    id: r.id,
    email: r.email ?? '',
    name: r.name,
    nickname: r.nickname,
    role: r.role as Role,
  };
}

export interface CohortRow {
  id: string;
  coach_id: string;
  instrument_id: string;
  name: string;
  description?: string | null; // getCohort select 만 채움(그 외 select 미포함 → null)
  code: string;
  status: string;
  max_members: number;
  expires_at: string | null;
  post_opened_at?: string | null; // post_opened_at 을 select 한 경로만 채움(그 외 → null). ADR-55
}
export function rowToCohort(r: CohortRow): Cohort {
  return {
    id: r.id,
    coachId: r.coach_id,
    instrumentId: r.instrument_id,
    name: r.name,
    description: r.description ?? null,
    code: r.code,
    status: r.status as Cohort['status'],
    maxMembers: r.max_members,
    expiresAt: r.expires_at,
    postOpenedAt: r.post_opened_at ?? null,
  };
}

export interface EnrollmentRow {
  cohort_id: string;
  user_id: string;
  joined_at: string;
}
export function rowToEnrollment(r: EnrollmentRow): Enrollment {
  return { cohortId: r.cohort_id, userId: r.user_id, joinedAt: r.joined_at };
}

export interface AlertRow {
  id: string;
  response_id: string;
  cohort_id: string | null;
  severity: string;
  reason: string;
  created_at: string;
}
export function rowToAlert(r: AlertRow): Alert {
  return {
    id: r.id,
    responseId: r.response_id,
    cohortId: r.cohort_id,
    severity: r.severity as Alert['severity'],
    reason: r.reason,
    createdAt: r.created_at,
  };
}

// 코치 신청 행. applicant 는 PostgREST 임베드(users!coach_applications_user_id_fkey) — user_id·reviewed_by 두 FK라 명시 disambiguation.
export interface CoachApplicationRow {
  id: string;
  user_id: string;
  status: string;
  motivation: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  applicant?: { name: string | null } | null;
}
export function rowToCoachApplication(r: CoachApplicationRow): CoachApplication {
  return {
    id: r.id,
    userId: r.user_id,
    applicantName: r.applicant?.name ?? null,
    status: r.status as CoachApplication['status'],
    motivation: r.motivation,
    reviewedBy: r.reviewed_by,
    reviewedAt: r.reviewed_at,
    reviewNote: r.review_note,
    createdAt: r.created_at,
  };
}

export interface ResponseRow {
  id: string;
  instrument_id: string;
  cohort_id: string | null;
  user_id: string | null;
  wave: string | null;
  answers: unknown;
  subject_profile: unknown;
  created_at: string;
}
export function rowToEnvelope<A, P>(r: ResponseRow): ResponseEnvelope<A, P> {
  return {
    id: r.id,
    instrumentId: r.instrument_id,
    cohortId: r.cohort_id,
    userId: r.user_id,
    wave: (r.wave ?? null) as Wave,
    answers: r.answers as A,
    subjectProfile: r.subject_profile as P,
    createdAt: r.created_at,
  };
}
