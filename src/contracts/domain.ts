// /src/contracts/domain.ts
//
// 공용 도메인 타입 (Role·Wave·CoreUser·ResponseEnvelope …).
// 출처: architecture.md §7. 타입 형상은 사양 그대로이며, 모듈 공유를 위해 `export` 만
// 부가했다. **형상 변경은 지휘부 승인 후에만**(architecture §0 / CLAUDE §1).

export type Role = 'user' | 'coach' | 'admin';
export type Wave = 'pre' | 'post' | null; // 단발 진단은 null
export type InstrumentId = string; // 'futurenow' | 'sail' | …
export type FieldRequirement = 'required' | 'optional' | 'hidden';

export interface CoreUser {
  id: string; // auth.users.id
  email: string; // 전 역할 필수
  name: string | null; // 공용 필드, 필수성은 정책이 결정
  nickname: string | null;
  role: Role;
  // phone 없음 — 민감 채널로 분리(getPhone 게이트로만 접근)
}

export interface IdentityPolicy {
  byRole: Record<Role, { name: FieldRequirement; phone: FieldRequirement }>;
  // email은 항상 required라 정책 대상 아님
}

export interface Cohort {
  id: string;
  coachId: string;
  instrumentId: InstrumentId;
  name: string;
  code: string;
  status: 'active' | 'archived';
  maxMembers: number;
  expiresAt: string | null;
}

export interface Enrollment {
  cohortId: string;
  userId: string;
  joinedAt: string;
}

// 가입 결정용 차수 **공개 메타** (Cohort 도메인 밖 — coachName·memberCount 포함, 민감정보 미포함).
// 출처: resolve_cohort_by_code 정의자 RPC. 미가입자·비로그인도 코드만 알면 조회 가능.
// resolveCohortByCode(Cohort 본체)와 목적이 다르다: 이쪽은 "들어갈지 결정"을 위한 표시용.
export interface CohortPreviewMeta {
  id: string;
  name: string;
  coachName: string | null;
  instrumentId: InstrumentId;
  memberCount: number;
  status: 'active' | 'archived';
  expiresAt: string | null;
}

export interface ResponseEnvelope<TAnswers = unknown, TProfile = unknown> {
  id: string;
  instrumentId: InstrumentId;
  cohortId: string | null;
  userId: string | null; // 실명제 진단은 NOT NULL을 진단이 강제
  wave: Wave;
  answers: TAnswers; // 진단 소유 — 코어 불가시
  subjectProfile: TProfile; // 진단별 참여 프로필 — 진단 소유
  createdAt: string;
}

export interface SaveResponseInput<TAnswers, TProfile> {
  instrumentId: InstrumentId;
  cohortId: string | null;
  userId: string | null;
  wave: Wave;
  answers: TAnswers;
  subjectProfile: TProfile;
}

export interface AlertInput {
  responseId: string;
  cohortId: string;
  severity: 'info' | 'care' | 'red_flag';
  reason: string; // 진단이 명명 (예: '활력 위기신호')
  // 점수·원문은 싣지 않는다 — 측정/강의 어휘 분리. 맥락은 코치 콘솔에서만.
}
