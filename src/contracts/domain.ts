// /src/contracts/domain.ts
//
// 공용 도메인 타입 (Role·Wave·CoreUser·ResponseEnvelope …).
// 출처: architecture.md §7. 타입 형상은 사양 그대로이며, 모듈 공유를 위해 `export` 만
// 부가했다. **형상 변경은 지휘부 승인 후에만**(architecture §0 / CLAUDE §1).

export type Role = 'user' | 'coach' | 'admin';

// 개인정보 동의 유형(ADR-76). privacy_use=멤버 필수 수집·이용 · sensitive_use=민감정보(종교·신앙) 선택 · coach_pledge=인도자 보호 서약.
// 'forum_match' = 포럼 대조 키(이름·연락처) 수집·이용 동의. **`/signup` 경로에서만** 받는다(S-1 단계 6).
//   기존 셋의 문안도 버전도 건드리지 않는다 — 올리면 해당 없는 기존 회원이 재동의 화면을 만난다.
export type ConsentType = 'privacy_use' | 'sensitive_use' | 'coach_pledge' | 'forum_match';
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
  openSessionNo: number | null; // 지금 열린 회차(now∈[opens_at,closes_at], 없으면 null). ADR-80
  openSessionSubmitted: boolean; // 그 회차 갈무리 제출 완료 여부
  openSessionHasContent: boolean; // 그 회차에 한 글자라도 썼는가(배너 문구 분기)
  joinedAt: string;
}

// 회차 갈무리 — responses 와 완전 분리(별도 테이블 checkins·cohort_sessions). 채점·AI 입력·리포트 미배선. ADR-80
export interface CohortSession {
  cohortId: string;
  sessionNo: number;
  heldAt: string;
  opensAt: string;
  closesAt: string;
}

// 편지 사진 첨부(ADR-83). 비공개 버킷 checkin-photos · signed URL(만료). 열람 본인/코치/운영자.
export interface CheckinPhoto {
  path: string; // {cohort}/{user}/{session}/{uuid}.jpg
  url: string; // 만료 signed URL
}

export interface CheckinRecord {
  id: string;
  cohortId: string;
  userId: string;
  sessionNo: number;
  answers: Record<string, unknown>;
  stepPrivate: boolean;
  shareConsent: boolean;
  suggestionAnon: boolean;
  contactRequest: boolean;
  promptedAt: string | null;
  promptCount: number;
  hasContent: boolean; // 실제 컬럼. checkin_save 가 쓰기 시점에 계산(행 존재≠작성 중)
  firstOpenedAt: string | null;
  deepOpened: boolean;
  submittedAt: string | null;
  editCount: number;
  updatedAt: string;
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
  address: string | null; // 주소(코치+운영자 — 목양 방문용, ADR-78). 계좌는 미포함(운영 전용).
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

// 가치 카드 결과(ADR-121). 별도 테이블 value_assessments 소유 — responses 와 성격이 다르다
//   (responses 는 불변 제출이고 이것은 두 세션에 걸쳐 갱신되는 진행 상태다).
//   카드 어휘(72장·카테고리·문안)는 전부 인스트루먼트 소유라 계약에는 **id 와 상태만** 싣는다.
export type ValueStageKey = 'exploring' | 'candidates' | 'finalists' | 'final';

export interface ValueAssessment {
  cohortId: string;
  cardSetVersion: string;
  stage: ValueStageKey;
  progress: Record<string, unknown>;
  candidates: number[] | null;
  finalIds: [number, number, number] | null;
  labels: { v1: string | null; v2: string | null; v3: string | null };
  workbook: { peak: string | null; strength: string | null; longing: string | null };
  alignment: 'aligned' | 'different' | 'unsure' | 'skipped' | null;
  finalizedAt: string | null;
  updatedAt: string;
}

// 인도자·운영자 열람용 — 본인 것에 사람 이름이 붙는다(같은 차수 코치·운영자만, RLS).
export interface ValueAssessmentRow extends ValueAssessment {
  userId: string;
  userName: string | null;
}

// ── 회원 상태(S-1 · ADR-122) ────────────────────────────────────────────────
// **Role 과 별도 축이다.** role(user·coach·admin)은 권한, state 는 자격이다. 한 컬럼에 섞지 않는다.
//   기존 자가승격 방지(20260629100002)의 보호 범위를 흔들지 않으려는 분리다(발주서 §4.2).
//
// **'cohort' 는 저장되지 않는다.** enrollments ⋈ cohorts(kind='seminar' AND status='active')가
//   이미 아는 사실이라 `member_state()` 가 산출한다. DB 의 memberships.status CHECK 에는
//   'cohort' 가 없어 문법이 이중 기록을 막는다. 이 유니온이 그것보다 넓은 것은,
//   **판정 결과**를 담는 타입이지 저장 값을 담는 타입이 아니기 때문이다.
export type MemberState = 'pending' | 'individual' | 'cohort' | 'expired' | 'held';

// 응시 계열. 여정 = 사전·사후 체크, 상시 = 가치 카드·그림자·사랑의 언어.
export type AssessmentKind = 'journey' | 'standing';

// 운영자가 내릴 수 있는 결정. **'pending' 과 'cohort' 는 없다** —
//   앞은 초기 상태라 되돌릴 일이 아니고, 뒤는 산출이라 결정할 수 있는 것이 아니다.
export type MembershipDecision = 'individual' | 'held' | 'expired';

// 승인 큐 한 행(대기 + 만료 임박). `list_membership_queue` 가 두 갈래를 함께 돌려준다.
export interface MembershipQueueRow {
  bucket: 'pending' | 'expiring';
  userId: string;
  name: string | null;
  email: string | null;
  // 포럼 대조 키 — user_contacts 에 산다(불변식 13). 인도자에게는 어떤 경로로도 가지 않는다.
  forumName: string | null;
  forumPhone: string | null; // **원값.** 마스킹은 서버 컴포넌트의 순수 함수가 한다(브라우저 번들에 싣지 않는다)
  signupNote: string | null;
  state: MemberState; // 저장값이 아니라 **판정**. 화면은 이것을 다시 계산하지 않는다
  validUntil: string | null; // ISO date
  createdAt: string;
  // 승인 화면 유효기간 기본값. **TS 가 기본 개월수를 모르게 하려고 DB 가 계산해 보낸다** —
  //   상수는 `membership_default_months()` 한 곳에만 있다(IA §12-2 확정 시 그것만 고친다).
  defaultValidUntil: string;
}

// ── 공개 영역(S-4) ─────────────────────────────────────────────────────────
// 소식. `publishedAt === null` 이면 초안이고 **운영자에게만 보인다**(RLS 가 가른다) —
//   상태 컬럼을 따로 두지 않았다. 발행 시각이 곧 공개 여부라 진실이 둘이 되지 않는다.
export interface NewsPost {
  id: string;
  title: string;
  body: string;
  publishedAt: string | null;
  createdAt: string;
}

// 자료실 3단. 'public' 은 **비로그인 열람 허용**이라는 뜻이지 공개 버킷이라는 뜻이 아니다 —
//   버킷은 비공개 하나뿐이고 파일은 만료형 서명 URL 로만 나간다.
export type LibraryTier = 'public' | 'member' | 'coach';

export interface LibraryItem {
  id: string;
  title: string;
  description: string | null;
  tier: LibraryTier;
  storagePath: string;
  createdAt: string;
}

// 문의. **메일이 아니라 저장으로 간다**(발송 수단 실측 0 · S-4). 운영자가 콘솔에서 읽는다.
export interface ContactMessage {
  id: string;
  name: string | null;
  email: string | null;
  body: string;
  userId: string | null;
  handledAt: string | null;
  createdAt: string;
}
