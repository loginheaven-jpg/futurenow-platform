// DB 행(snake_case) ↔ 계약 도메인 타입(camelCase) 매핑. 순수 함수 — 단위테스트 대상.
// 거점 테이블은 public 스키마(SAIL 승격). 컬럼명은 20260626120000_core_platform_upgrade.sql 기준.
import type { Cohort, CoreUser, Enrollment, ResponseEnvelope, Role, Wave } from '@/contracts';

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
  code: string;
  status: string;
  max_members: number;
  expires_at: string | null;
}
export function rowToCohort(r: CohortRow): Cohort {
  return {
    id: r.id,
    coachId: r.coach_id,
    instrumentId: r.instrument_id,
    name: r.name,
    code: r.code,
    status: r.status as Cohort['status'],
    maxMembers: r.max_members,
    expiresAt: r.expires_at,
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
