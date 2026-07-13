// /src/contracts/domain.ts
//
// 공용 도메인 타입 (Role·Wave·CoreUser·ResponseEnvelope …).
// 출처: architecture.md §7. 타입 형상은 사양 그대로이며, 모듈 공유를 위해 `export` 만
// 부가했다. **형상 변경은 지휘부 승인 후에만**(architecture §0 / CLAUDE §1).

export type Role = 'user' | 'coach' | 'admin';

// 개인정보 동의 유형(ADR-76). privacy_use=멤버 필수 수집·이용 · sensitive_use=민감정보(종교·신앙) 선택 · coach_pledge=인도자 보호 서약.
export type ConsentType = 'privacy_use' | 'sensitive_use' | 'coach_pledge';
export interface ConsentRecord { type: ConsentType; version: string; agreedAt: string; }

// 연락처 상세(운영자·본인만 — user_contacts 격리). 주소·계좌는 운영 목적(장학금)·인도자 비노출. ADR-76
export interface ContactDetail { phone: string | null; address: string | null; bankAccount: string | null; }

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
  description: string | null; // 코치 작성 차수 소개(컬럼 기존). getCohort 가 채움 — 그 외 select 는 null. 승인 2026-06-30
  code: string;
  status: 'active' | 'archived';
  maxMembers: number;
  expiresAt: string | null;
  postOpenedAt: string | null; // 사후 진단 개시 시점(NULL=미개시). 코치 수동 개시(open_post_wave). ADR-55
}

export interface Enrollment {
  cohortId: string;
  userId: string;
  joinedAt: string;
}

// 차수 멤버 최소 참조(id+name만) — 코치/운영자가 명단·돌봄에 이름을 붙일 때. ADR-24
// 출처: cohort_member_directory(SECURITY DEFINER) RPC. users RLS 를 넓히지 않고 id+name만 노출(ADR-04).
export interface MemberRef {
  userId: string;
  name: string | null;
}

// 멤버 본인 차수 요약(비민감 메타). my_cohorts(DEFINER) RPC — cohorts RLS 멤버 미개방. ADR-29
// 진행: 해당 wave의 responses row 존재 = 완료(responses 불변). 코치 시점 listEnrollments 와 목적 분리.
export interface MyCohortSummary {
  cohortId: string;
  name: string;
  coachName: string | null;
  status: 'active' | 'archived';
  preDone: boolean;
  postDone: boolean;
  postOpened: boolean; // 사후 진단 개시 여부(참여자 홈이 '사후 진단하기' 노출 판정). ADR-55
  joinedAt: string;
}

// 본부 멤버 관리(운영자 화면)용 사용자 요약. 운영자만 전체 조회(users_select=admin). ADR-28
export interface MemberSummary {
  id: string;
  email: string;
  name: string | null;
  role: Role;
}

// 차수 멤버 신상정보(코치 조원 열람 — §10 완화, 자기 차수 한정). cohort_member_detail(DEFINER) RPC. ADR-75
//   전화·이메일 포함. 코치는 자기 차수 조원만·참여 이력은 호출자 가시 범위로 스코프(운영자=전체·코치=자기 차수).
export interface CohortMemberDetail {
  name: string | null;
  email: string;
  phone: string | null;
  gender: string | null;
  birthYear: number | null;
  religion: string | null;
  faithYears: number | null;
  responseCount: number;
  cohortNames: string[];
}

// 본부 멤버 세부(활동) — 운영자 화면. admin_member_activity(DEFINER) RPC 집계. ADR-71
//   신원(전화=getPhone·프로필=getProfile)은 별도 게터로 조회하고, 여기선 참여 '활동'만 담는다.
export interface MemberActivity {
  ownedCohorts: string[]; // 소유(인도) 차수 이름 — 삭제 시 함께 사라지는 대상(영향 표시)
  enrolledCohorts: string[]; // 참여(가입) 차수 이름
  responseCount: number; // 응답 수
}

// 코치 신청(USER→COACH 승격 대기). 본부 §8.6 [승인 대기]의 데이터. ADR-24
// 읽기는 운영자 전용(coach_apps_select=admin). 결정(승인/거절)은 decide_coach_application RPC(원자 승격).
export interface CoachApplication {
  id: string;
  userId: string;
  applicantName: string | null; // users.name 조인(운영자만)
  status: 'pending' | 'approved' | 'rejected';
  motivation: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
}

// 가입 결정용 차수 **공개 메타** (Cohort 도메인 밖 — coachName·memberCount 포함, 민감정보 미포함).
// 출처: resolve_cohort_by_code 정의자 RPC. 미가입자·비로그인도 코드만 알면 조회 가능.
// resolveCohortByCode(Cohort 본체)와 목적이 다르다: 이쪽은 "들어갈지 결정"을 위한 표시용.
export interface CohortPreviewMeta {
  id: string;
  name: string;
  description: string | null; // 코치 작성 차수 소개(비민감 공개 메타 — resolve_cohort_by_code). 진입-2
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

// 읽기용 알림(인도자 콘솔). AlertInput(쓰기)에 id·createdAt 부가. ADR-23
// cohortId 는 읽기에선 null 가능(차수 삭제 시 set null). 돌봄 신호의 **저장된 출처**(재채점 금지).
export interface Alert {
  id: string;
  responseId: string;
  cohortId: string | null;
  severity: 'info' | 'care' | 'red_flag';
  reason: string;
  createdAt: string;
}

// 참여 프로필(신원 부가 — 성별·생년·종교·신앙연수). 코어 별도 테이블 user_profiles 소유(users 본체 미오염, ADR-04 격리 선례).
//   CoreUser 무변경 — getProfile 게터로만 조회(getPhone 패턴 정합). 전부 nullable(DB 불변식 아님 — 필수성은 폼/IdentityPolicy).
//   KPC 는 코치 도메인(coach_applications) 소유라 여기 두지 않는다(S4 완비 판정이 별도로 읽음).
export interface UserProfile {
  gender: string | null;
  birthYear: number | null;
  religion: string | null;
  faithYears: number | null;
}

// 코치 리포트 해석 문구 읽기 뷰(B③·ADR-36). 코치·운영자만(RLS). 참여자 비노출.
//   aiContent = 게이트웨이 생성 원문(불변·감사). coachContent = 코치 수정본(null=미수정).
//   effective = coachContent ?? aiContent (유효 문구 — 읽기에서 coalesce).
//   구조화 형상(headline·axes…)은 진단 소유 → 계약은 unknown, 경계 검증은 인스트루먼트(B③-2 zod).
export interface InterpretationView {
  responseId: string;
  aiContent: unknown;
  aiModel: string | null;
  coachContent: unknown | null;
  editedBy: string | null;
  editedAt: string | null;
  effective: unknown;
}
