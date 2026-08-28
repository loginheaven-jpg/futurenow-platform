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

// ── 회원 표시(5차 T-3·T-4 · 최박사 승인 2026-08-29 · 불변식 3) ──────────────
//
// **`MemberState` 를 대체하지 않는다.** 저 다섯은 **판정**(DB `member_state()` 가 유일 구현)이고,
//   아래 셋은 그 판정을 **표시 축으로 편 것**이다. 산출·`member_can_assess`·RLS·진실표는
//   **한 줄도 바뀌지 않았고 마이그레이션은 0** 이다.
//
// **왜 축을 나눴나 — `participant` 를 tier 값으로 두지 않는다.**
//   참여는 **기수마다 하나씩 여럿**이라 택일 필드에 들어갈 수 없다. 실측이 그렇다(2026-08-29):
//   기수를 이끌면서 참여도 하는 사람 **2명**(`cohorts.coach_id` 기준), 포럼회원이면서 참여자 **3명**.
//   최박사 지시가 그것을 문장으로 못 박았다 — *"포럼회원, 00기참여자, 00기인도자는
//   택일이 아니라 병행표현되어야 한다."*

/**
 * `memberships.status` **저장값**. DB CHECK 를 그대로 비춘다
 * (`status IN ('pending','individual','expired','held')` · `20260826160000_membership.sql:79`).
 *
 * **`MemberState` 와 다른 것이다.** 저 다섯은 **판정**(`held > cohort > 저장 > pending`)이고
 * 이것은 **저장된 자격**이다. `cohort` 가 여기 없는 이유가 그 차이다 — `cohort` 는
 * *지금 세미나에 등록돼 있다* 는 **권한**의 사실이지 누가 준 **자격**이 아니다.
 * 행이 아예 없을 수 있으므로 `null` 과 함께 쓴다.
 */
export type MembershipStatus = 'pending' | 'individual' | 'expired' | 'held';

/** 자격 — **늘 하나**. 택일 축이다. */
export type MemberTier = 'visitor' | 'forum' | 'suspended';

/** 소속에서의 역할 — 기수마다 붙는다. */
export type CohortRoleKind = 'participant' | 'coach';

/**
 * 소속 한 칸. **기수와 역할을 한 항목으로 묶는다** — 화면 표기가 늘 붙어 다니기 때문이다
 * (`2기 참여자` · `1기 인도자`). 따로 두면 조립할 때 다시 짝지어야 한다(최박사 지시).
 */
export interface CohortRole {
  cohortId: string;
  cohortName: string;
  kind: CohortRoleKind;
}

/**
 * 내 정보·현관 칩·운영자 화면이 함께 읽는 **표시용 회원 상태**.
 *
 * **문자열을 담지 않는다** — 값만 내리고 조립은 화면이 한다(최박사 지시).
 * 문언이 서버에 박히면 단일 출처가 둘이 된다.
 */
export interface MembershipView {
  tier: MemberTier;
  /**
   * `held` 의 **진행 표시**. `tier` 를 덮지 않는다 — 보류 중인 사람도 tier 는 `visitor` 다.
   * 이것이 별도 불리언인 이유: 덮으면 *보류* 라는 말이 자격 이름 자리에 앉아
   * `suspended`(이용 보류)와 한 화면에서 겹친다.
   */
  underReview: boolean;
  /** 소속 — **여럿**. 없으면 빈 배열이고, 화면은 그 줄을 그리지 않는다. */
  cohortRoles: CohortRole[];
  /**
   * 운영자 — **넷째 축**(최박사가 표시 대상에 넣으셨다 · 2026-08-29).
   *
   * `cohortRoles` 에 넣을 수 없다 — 운영자는 **기수에 매이지 않아** `cohortId` 가 없다.
   * 값은 `users.role` 에서 온다(권한 축). 자격(`tier`)·소속(`cohortRoles`)과 **또 다른 축**이라
   * 별도 칸이다. 실측(2026-08-29): `users.role='admin'` **2명**.
   */
  isAdmin: boolean;
}

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
  // 2차 추가 — 댓글 삭제 권한이 **그 소식 작성자**까지 미친다(발주 §9-4). 화면이 버튼을
  //   보일지 정하려면 누가 썼는지 알아야 한다. 강제는 `news_comment_delete` 가 한다.
  authorId: string | null;
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

// ── 동행 피드(2차 · ADR-124) ───────────────────────────────────────────────
// 카톡 대체다. 게시판이 아니라 **날짜별 시간순 피드**이고, 하루에 여러 번 몇 초 단위로 쓰인다.

// 이모지 넷(발주 §9-2 확정). **DB `feed_emojis()` 와 짝이다** — 둘이 갈리면 목록 밖 이모지가
//   화면에 뜨고 누르면 거부된다. 통합테스트가 네 종 통과 + 목록 밖 거부로 그 짝을 잠근다.
export const FEED_EMOJI = ['👏', '🙏', '💪', '❤️'] as const;
export type FeedEmoji = (typeof FEED_EMOJI)[number];

// 반응 집계 — `{'👏': 3, '🙏': 1}`. **정렬에 쓰지 않는다**(불변식 11 · 발주 §3.2).
//   **5차 소건 2 로 복수 반응이 열리며 합계가 커질 수 있다.** 그래도 이 값은 여전히
//   *누가 무엇을 눌렀는가*의 표시일 뿐이고 **순위를 만들지 않는다** — 정렬키·백분위·막대로
//   쓰이는 자리가 없음을 `feed.reactions.test.ts` 가 전수로 잠근다.
export type FeedReactionSummary = Partial<Record<FeedEmoji, number>>;

// 피드 글. `deleted === true` 면 **묘비**다 — 본문·사진·작성자가 전부 null 이고 댓글만 남는다.
//   묘비를 두는 이유는 하나뿐이다: 답글이 고아가 되지 않게(발주 §5.3).
export interface FeedPost {
  id: string;
  authorId: string | null;
  authorName: string | null;
  body: string | null;
  photoPath: string | null; // 서명 URL 이 아니다. 화면이 보이는 만큼만 따로 발급한다(S-4 §2.2 선례)
  createdAt: string;
  deleted: boolean;
  commentCount: number;
  reactions: FeedReactionSummary;
  // **5차 소건 2 — 복수 반응**(지휘부 사전 승인 · 불변식 3).
  //   `FeedEmoji | null` 에서 배열로 바꿨다. **빈 배열이 무반응**이고 `null` 은 쓰지 않는다 —
  //   "없음"을 두 가지 방법으로 표현하면 화면마다 다르게 검사하고 언젠가 한쪽을 빠뜨린다.
  //   순서는 DB 가 `feed_emojis()` 선언 순서로 고정해 준다(목록·토글 두 경로가 같은 기준).
  myReactions: FeedEmoji[];
}

// 댓글은 **1단**이다(발주 §3.4). `parentId` 가 없는 것이 그 강제다 — DB 에도 컬럼이 없다.
export interface FeedComment {
  id: string;
  authorId: string;
  authorName: string | null;
  body: string;
  createdAt: string;
}

// 피드를 가진 내 기수. 여럿일 때만 화면에 전환이 뜬다. 기본은 목록 첫 행(활성 우선·최신순).
export interface FeedCohortRef {
  cohortId: string;
  name: string;
  status: 'active' | 'archived';
  isCoach: boolean;
  lastPostAt: string | null;
}

// 인도자 콘솔 전용 둘(발주 §6.2) — **판정 없이 사실만**. 참여자 경로에 두지 않는다.
export interface FeedFlowPoint {
  day: string; // KST 기준 날짜(YYYY-MM-DD)
  posts: number;
  authors: number;
}

// '조용한 분'. 색·순위 없이 목록과 마지막 게시 시각만. 지목이 아니라 안부의 재료다.
export interface QuietMember {
  userId: string;
  name: string | null;
  lastPostAt: string | null;
}

// 소식 댓글 — 전체 가입자가 쓰고 **비로그인도 읽는다**(발주 §5.2).
export interface NewsComment {
  id: string;
  authorId: string;
  authorName: string | null;
  body: string;
  createdAt: string;
}
