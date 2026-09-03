// CoreContext 구현체 (계약 A: 코어 → 진단). 화면 없음 — 서버·데이터 계층만.
// 거점 = SAIL 승격(public 스키마). supabase-js 클라이언트(서버/브라우저)를 주입받아 동작한다.
//
// 권한은 이중 방어: 코어가 1차로 막고(authz), DB RLS 가 2차로 막는다.
// 계약(/contracts) 형상은 바꾸지 않는다. 검증 스키마는 진단이 주입(validators 레지스트리).
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ValueAssessment,
  ValueAssessmentRow,
  Alert,
  AlertInput,
  CheckinPhoto,
  CheckinRecord,
  CoachApplication,
  Cohort,
  CohortMemberDetail,
  CohortPreviewMeta,
  CohortSession,
  ConsentRecord,
  ConsentType,
  ContactDetail,
  CoreContext,
  CoreUser,
  Enrollment,
  FeedCohortRef,
  FeedComment,
  FeedEmoji,
  FeedFlowPoint,
  FeedPost,
  InstrumentId,
  InterpretationView,
  ContactMessage,
  LibraryItem,
  LibraryComment,
  LibraryReport,
  LibrarySource,
  LibraryAddInput,
  MemberActivity,
  NewsComment,
  NewsPost,
  QuietMember,
  MemberState,
  MembershipDecision,
  MembershipQueueRow,
  MemberRef,
  MemberSummary,
  MyCohortSummary,
  ResponseEnvelope,
  Role,
  SaveResponseInput,
  UserProfile,
  Wave,
  ChatRequest,
  ChatResponse,
  CohortRole,
  MembershipView,
} from '@/contracts';
import { z } from 'zod';
import { gatewayChat } from './ai/gateway';
import { satisfiesRole, canAccessContact } from './authz';
import { CoreAuthError, CoreError, CoreForbiddenError, CoreNotFoundError } from './errors';
import { toMemberState, toMembershipStatus } from './membership';
import { toMembershipView } from './membershipVocab';
import {
  rowToAlert,
  rowToCoachApplication,
  rowToCohort,
  rowToEnrollment,
  rowToEnvelope,
  rowToUser,
  type AlertRow,
  type CoachApplicationRow,
  type CohortRow,
  type EnrollmentRow,
  type ResponseRow,
  type UserRow,
} from './mappers';
import { validateWith, type InstrumentValidators } from './response/validation';

// 해석 문구 row → 읽기 뷰. effective = coach_content ?? ai_content(유효 문구). 구조화 형상은 진단 소유라 unknown.
interface InterpretationRow {
  response_id: string;
  ai_content: unknown;
  ai_model: string | null;
  coach_content: unknown;
  edited_by: string | null;
  edited_at: string | null;
}
function rowToInterpretation(r: InterpretationRow): InterpretationView {
  const coach = r.coach_content ?? null;
  return {
    responseId: r.response_id,
    aiContent: r.ai_content,
    aiModel: r.ai_model ?? null,
    coachContent: coach,
    editedBy: r.edited_by ?? null,
    editedAt: r.edited_at ?? null,
    effective: coach ?? r.ai_content,
  };
}

export interface CreateCoreContextOptions {
  /** 진단별 경계 검증 스키마(zod). saveResponse 시 instrumentId 로 조회해 강제. */
  validators?: Record<InstrumentId, InstrumentValidators>;
  /**
   * proxy(S-1)가 getUser 로 서명·만료를 검증해 헤더로 전달한 user.id. 있으면 loadCurrentUser 가 getUser(Auth 왕복)를 생략하고
   * 이 id 로 users SELECT 만 한다(요청당 Auth 왕복 2→1). **검증 우회 아님** — proxy 가 매 요청 검증하고, 신뢰 경계(인입 헤더 strip)로 위조 불가.
   * 서버 전용(createServerContext 가 주입). 클라이언트/헤더 부재 시 null → 기존 getUser fallback.
   */
  verifiedUserId?: string | null;
}

export function createCoreContext(
  supabase: SupabaseClient,
  options: CreateCoreContextOptions = {},
): CoreContext {
  return new SupabaseCoreContext(supabase, options.validators ?? {}, options.verifiedUserId ?? null);
}

// resolve_cohort_by_code(SECURITY DEFINER) 가 반환하는 회기 공개 메타(비민감).
interface CohortMeta {
  id: string;
  coach_id: string;
  coach_name: string | null;
  instrument_id: string;
  name: string;
  description: string | null;
  code: string;
  status: string;
  max_members: number;
  member_count: number | string;
  expires_at: string | null;
}

// ── 회차 갈무리 매퍼·경계 스키마(ADR-80) ─────────────────────
const CHECKIN_COLS =
  'id,cohort_id,user_id,session_no,answers,step_private,share_consent,suggestion_anon,contact_request,prompted_at,prompt_count,has_content,first_opened_at,deep_opened,submitted_at,edit_count,updated_at';
const CHECKIN_PHOTO_BUCKET = 'checkin-photos';

interface CohortSessionRow {
  cohort_id: string;
  session_no: number;
  held_at: string;
  opens_at: string;
  closes_at: string;
}
function rowToCohortSession(r: CohortSessionRow): CohortSession {
  return { cohortId: r.cohort_id, sessionNo: r.session_no, heldAt: r.held_at, opensAt: r.opens_at, closesAt: r.closes_at };
}

interface CheckinRow {
  id: string;
  cohort_id: string;
  user_id: string;
  session_no: number;
  answers: Record<string, unknown> | null;
  step_private: boolean;
  share_consent: boolean;
  suggestion_anon: boolean;
  contact_request: boolean;
  prompted_at: string | null;
  prompt_count: number;
  has_content: boolean;
  first_opened_at: string | null;
  deep_opened: boolean;
  submitted_at: string | null;
  edit_count: number;
  updated_at: string;
}
function rowToCheckin(r: CheckinRow): CheckinRecord {
  return {
    id: r.id,
    cohortId: r.cohort_id,
    userId: r.user_id,
    sessionNo: r.session_no,
    answers: r.answers ?? {},
    stepPrivate: r.step_private,
    shareConsent: r.share_consent,
    suggestionAnon: r.suggestion_anon,
    contactRequest: r.contact_request,
    promptedAt: r.prompted_at,
    promptCount: r.prompt_count,
    hasContent: r.has_content,
    firstOpenedAt: r.first_opened_at,
    deepOpened: r.deep_opened,
    submittedAt: r.submitted_at,
    editCount: r.edit_count,
    updatedAt: r.updated_at,
  };
}

// 일반 구조 한계(인스트루먼트 어휘 무지): 스칼라·짧은 문자열 배열·null 만. 미지 키는 버리지 않되 값 형태는 강제.
const CHECKIN_ANSWERS_SCHEMA = z.record(
  z.string().max(100),
  // 문자열 4000자(편지 옮겨쓰기 수용 — '편지를 써 보세요' 문안, ADR-82 후속). 배열 원소는 짧은 낱말이라 2000. 전체 32KB.
  z.union([z.string().max(4000), z.number().finite(), z.boolean(), z.null(), z.array(z.string().max(2000)).max(8)]),
);

// 가치 카드(ADR-121). 경계 검증은 CLAUDE §9 — DB 는 느슨(JSONB), 코드 경계는 엄격.
//   코어는 카드 어휘를 모른다(§2·§7). 그래서 '카드 id 가 몇 번인가'는 보지 않고
//   **일반 구조 한계**(정수·개수·길이)만 강제한다. 의미 검증은 인스트루먼트 몫이다.
const VALUE_COLS =
  'user_id, cohort_id, card_set_version, stage, progress, candidates, value1_id, value2_id, value3_id,' +
  ' value1_label, value2_label, value3_label, wb_peak, wb_strength, wb_longing, alignment, finalized_at, updated_at';


// 승인 큐 RPC 원시 행. `status` 열에 담기는 것은 저장값이 아니라 member_state() 판정이다.
interface NewsRow { id: string; title: string; body: string; published_at: string | null; created_at: string; author_id: string | null }
// 서가 목록 한 줄 — `library_list()` 가 내는 모양 그대로다. **주소 칸이 없다**(§4).
interface LibraryRow {
  id: string; title: string; description: string | null; tier: string; kind: string;
  cohort_id: string | null; cohort_name: string | null;
  created_by: string | null; author_name: string | null;
  hidden: boolean; mine: boolean; can_view: boolean; created_at: string;
  // **주소가 아니라 참·거짓이다.** 서버가 넷을 곱해 낸다(볼 수 있고·파일이고·이미지이고·상한 안).
  photo: boolean;
  // 반응 집계와 댓글 수. **정렬에 쓰지 않는다**(불변식 11). 못 보는 자료는 {} 와 0 이다.
  reactions: Record<string, number> | null;
  comment_count: number | null;
}
interface ContactRow { id: string; name: string | null; email: string | null; body: string; user_id: string | null; handled_at: string | null; created_at: string }

// ── 동행 피드 행(2차 · ADR-124) ─────────────────────────────
const FEED_PHOTO_BUCKET = 'feed-photos';
interface FeedCohortRow { cohort_id: string; name: string; status: string; is_coach: boolean; last_post_at: string | null }
// 묘비(deleted=true)는 author_id·author_name·body·photo_path 가 전부 null 로 온다 — RPC 가 비운다.
interface FeedPostRow {
  id: string; author_id: string | null; author_name: string | null; body: string | null;
  photo_path: string | null; created_at: string; deleted: boolean; comment_count: number;
  reactions: Record<string, number> | null; my_reactions: string[] | null;
}
interface FeedCommentRow { id: string; author_id: string; author_name: string | null; body: string; created_at: string }

/**
 * **순서 위반을 시끄럽게 만든다** (5차 소건 2 · 지휘부 지적).
 *
 * 마이그레이션(`20260829090000_feed_reactions_multi.sql`)보다 코드가 먼저 배포되면
 * DB 는 `my_reaction text`(단일)를 주고 코드는 `my_reactions text[]` 를 기대한다.
 * **그런데 던지지 않는다 — 조용히 틀린다.** 실측으로 재현한 모양이 이렇다:
 *
 *   새 RPC(배열) `['❤️']`  → `{ '❤️': 1 }`      (맞다)
 *   옛 RPC(문자열) `'❤️'`   → `{ '❤': 1, '︎': 1 }` (쓰레기 키 둘)
 *   옛 RPC(문자열) `'👏'`   → `{ '👏': 1 }`      (**멀쩡해 보인다**)
 *
 * 넷 중 셋이 맞고 하나만 틀리므로 **눈으로는 잡히지 않는다.** 그것이 가장 나쁜 실패다.
 * 1기 졸업생도 피드를 쓰는 실사용 화면이므로, 조용히 틀리느니 **닫힌 채로 시끄럽게 실패**한다.
 *
 * 옛 스키마의 **정확한 모양**(`my_reactions` 부재 + `my_reaction` 존재)에서만 발화한다 —
 * 넓게 잡으면 무관한 이유로 피드를 닫는다.
 */
const MULTI_REACTION_MIGRATION_MSG =
  '피드 반응 스키마가 코드보다 옛 버전입니다(마이그레이션 20260829090000 미적용). ' +
  '조용히 틀린 값을 보이지 않기 위해 멈췄습니다 · 운영자에게 알려 주세요.';

function assertMultiReactionSchema(row: unknown): void {
  if (typeof row !== 'object' || row === null) return;
  if (!('my_reactions' in row) && 'my_reaction' in row) {
    throw new CoreError(MULTI_REACTION_MIGRATION_MSG);
  }
}

function rowToNews(r: unknown): NewsPost {
  const row = r as NewsRow;
  return { id: row.id, title: row.title, body: row.body, publishedAt: row.published_at, createdAt: row.created_at, authorId: row.author_id ?? null };
}

interface MembershipQueueDbRow {
  bucket: string;
  user_id: string;
  name: string | null;
  email: string | null;
  forum_name: string | null;
  forum_phone: string | null;
  signup_note: string | null;
  status: string;
  valid_until: string | null;
  created_at: string;
  default_valid_until: string;
}

const VALUE_CARD_IDS = z.array(z.number().int().positive()).max(72);
const VALUE_PROGRESS = z.record(z.string(), z.unknown());
const VALUE_SHORT = z.string().max(20);   // 대조 세 칸 — 한 단어 전제
const VALUE_LABEL = z.string().max(60);   // 내 말로 바꾸기 — 한 줄 전제
const VALUE_JSON_MAX = 8_192;             // 무제한 JSONB 를 막는다(갈무리 32KB 선례의 축소판)

type ValueRow = {
  user_id: string; cohort_id: string; card_set_version: string; stage: string;
  progress: Record<string, unknown> | null; candidates: number[] | null;
  value1_id: number | null; value2_id: number | null; value3_id: number | null;
  value1_label: string | null; value2_label: string | null; value3_label: string | null;
  wb_peak: string | null; wb_strength: string | null; wb_longing: string | null;
  alignment: string | null; finalized_at: string | null; updated_at: string;
};

function rowToValue(r: ValueRow): ValueAssessment {
  const ids =
    r.value1_id != null && r.value2_id != null && r.value3_id != null
      ? ([r.value1_id, r.value2_id, r.value3_id] as [number, number, number])
      : null;
  return {
    cohortId: r.cohort_id,
    cardSetVersion: r.card_set_version,
    stage: r.stage as ValueAssessment['stage'],
    progress: r.progress ?? {},
    candidates: r.candidates ?? null,
    finalIds: ids,
    labels: { v1: r.value1_label, v2: r.value2_label, v3: r.value3_label },
    workbook: { peak: r.wb_peak, strength: r.wb_strength, longing: r.wb_longing },
    alignment: (r.alignment as ValueAssessment['alignment']) ?? null,
    finalizedAt: r.finalized_at,
    updatedAt: r.updated_at,
  };
}


class SupabaseCoreContext implements CoreContext {
  // 요청 단위 currentUser 캐시(C-2·ADR-60). CoreContext 는 요청마다 새로 생성(createCoreContext) → 인스턴스 캐시 = 요청 단위.
  //   getPhone/setProfile/requireRole/requireUser 등이 내부적으로 currentUser 를 재호출해도 신원 해석+users SELECT 는 1회.
  //   **검증 우회 아님** — verifiedUserId(S-1) 있으면 proxy 가 이미 검증(서명·만료)한 신원을 재사용, 없으면 getUser 로 직접 검증. 재검증만 생략.
  private currentUserPromise?: Promise<CoreUser | null>;

  constructor(
    private readonly sb: SupabaseClient,
    private readonly validators: Record<string, InstrumentValidators>,
    private readonly verifiedUserId: string | null = null,
  ) {}

  // ── 인증·신원 ──────────────────────────────────────────────
  async currentUser(): Promise<CoreUser | null> {
    return (this.currentUserPromise ??= this.loadCurrentUser());
  }

  private async loadCurrentUser(): Promise<CoreUser | null> {
    let userId: string;
    let fallbackEmail: string | undefined;
    if (this.verifiedUserId) {
      // proxy(S-1)가 getUser 로 서명·만료를 이미 검증한 신원(신뢰 경계 헤더) → Auth 왕복 생략. 재검증만 생략(우회 아님).
      userId = this.verifiedUserId;
    } else {
      // fallback: 검증 헤더 없음(클라이언트 컨텍스트·proxy 미실행 경계·공개 경로) → getUser 로 직접 검증.
      const { data, error } = await this.sb.auth.getUser();
      if (error || !data?.user) return null;
      userId = data.user.id;
      fallbackEmail = data.user.email;
    }
    const { data: profile, error } = await this.sb
      .from('users')
      .select('id,email,name,nickname,role')
      .eq('id', userId)
      .maybeSingle();

    // ★★ **조회 실패와 행 부재를 가른다**(ADR-179 · 지휘부 지시 2026-09-02).
    //
    //   전에는 `error` 를 안 보고 `profile` 만 봤다. 그래서 **조회가 실패한 것과 행이 없는 것이
    //   같은 길로 흘렀고**, 실패해도 아래의 최소 구성이 나갔다 — `role: 'user'`.
    //   **코치·운영자가 조용히 참여자로 내려앉는다.** 그러면 콘솔·본부에서 튕기는데
    //   **본인은 왜인지 알 수 없고 화면은 정상으로 보인다.** 가장 잡기 어려운 모양이다.
    //
    //   **바로 아래 이웃들이 이미 이렇게 한다** — `getPhone`·`setPhone`·`recordConsent`·
    //   `listMyConsents` 가 전부 `if (error) throw new CoreError(...)` 다. **여기 한 줄만 빠져 있었다.**
    //   새 관용구를 들이는 것이 아니라 **빠진 자리를 이웃에 맞추는 것**이다.
    //
    //   ★ **`null` 을 내지 않는 이유**(되돌이). 실패에 `null` 을 내면 게이트가 `/login` 으로 보내는데,
    //   `/login` 은 세션이 살아 있으면 **다시 그 화면으로 돌려보낸다**(`login/page.tsx` 의 소건 1-가).
    //   **고리가 된다.** 던지면 고리가 없고, 무엇이 잘못됐는지가 드러난다.
    //
    //   **행이 없는 것은 그대로 둔다** — 가입 트리거 직후에 실제로 그렇고, 그때는 오류가 아니다.
    if (error) throw new CoreError(`currentUser 실패: ${error.message}`);

    // 프로필 행이 아직 없으면(가입 트리거 직후 등) 최소 구성(email 은 fallback 경로에서만 확보 가능).
    return profile
      ? rowToUser(profile as UserRow)
      : { id: userId, email: fallbackEmail ?? '', name: null, nickname: null, role: 'user' };
  }

  // 비동기(승인 2026-06-26): 현재 사용자를 해석한 뒤 역할을 검사한다.
  async requireRole(role: Role): Promise<void> {
    const me = await this.currentUser();
    if (!me) throw new CoreAuthError();
    if (!satisfiesRole(me.role, role)) {
      throw new CoreForbiddenError(`권한 부족: ${role} 이상이 필요합니다`);
    }
  }

  // ── 민감 채널(전화번호) — 본인 또는 운영자만 ──────────────
  async getPhone(userId: string): Promise<string | null> {
    await this.assertContactAccess(userId);
    const { data, error } = await this.sb
      .from('user_contacts')
      .select('phone')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new CoreError(`getPhone 실패: ${error.message}`);
    return (data?.phone as string | undefined) ?? null;
  }

  async setPhone(userId: string, phone: string): Promise<void> {
    await this.assertContactAccess(userId);
    const { error } = await this.sb
      .from('user_contacts')
      .upsert({ user_id: userId, phone }, { onConflict: 'user_id' });
    if (error) throw new CoreError(`setPhone 실패: ${error.message}`);
  }

  // 전화·주소·계좌(운영자·본인만). 인도자 비노출(ADR-76 — 운영 목적). getPhone 게이트 동일(assertContactAccess).
  async getContactDetail(userId: string): Promise<ContactDetail> {
    await this.assertContactAccess(userId);
    const { data, error } = await this.sb
      .from('user_contacts')
      .select('phone,address,bank_account')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new CoreError(`getContactDetail 실패: ${error.message}`);
    const r = data as { phone: string | null; address: string | null; bank_account: string | null } | null;
    return { phone: r?.phone ?? null, address: r?.address ?? null, bankAccount: r?.bank_account ?? null };
  }

  // 본인 연락처 부분 upsert(제공 필드만 — PostgREST upsert 는 payload 컬럼만 갱신 → 미제공 필드 보존). self(RLS).
  async setContact(input: { phone?: string | null; address?: string | null; bankAccount?: string | null }): Promise<void> {
    const me = await this.requireUser();
    const payload: Record<string, unknown> = { user_id: me.id, updated_at: new Date().toISOString() };
    if (input.phone !== undefined) payload.phone = input.phone;
    if (input.address !== undefined) payload.address = input.address;
    if (input.bankAccount !== undefined) payload.bank_account = input.bankAccount;
    const { error } = await this.sb.from('user_contacts').upsert(payload, { onConflict: 'user_id' });
    if (error) throw new CoreError(`setContact 실패: ${error.message}`);
  }

  // 개인정보 동의 기록/조회(ADR-76). 본인 기록(user_id+type PK upsert — 최신 version·시각). RLS: 본인 insert/update.
  async recordConsent(type: ConsentType, version: string): Promise<void> {
    const me = await this.requireUser();
    const { error } = await this.sb
      .from('user_consents')
      .upsert({ user_id: me.id, type, version, agreed_at: new Date().toISOString() }, { onConflict: 'user_id,type' });
    if (error) throw new CoreError(`recordConsent 실패: ${error.message}`);
  }

  async listMyConsents(): Promise<ConsentRecord[]> {
    const me = await this.currentUser();
    if (!me) return [];
    const { data, error } = await this.sb.from('user_consents').select('type,version,agreed_at').eq('user_id', me.id);
    if (error) throw new CoreError(`listMyConsents 실패: ${error.message}`);
    return ((data ?? []) as { type: ConsentType; version: string; agreed_at: string }[]).map((r) => ({ type: r.type, version: r.version, agreedAt: r.agreed_at }));
  }

  // 본인 표시 이름 수정(users.name). 본인 행만(id=auth.uid()) — RLS(users_update) + 컬럼권한(name=true, 2.S2)이 이중 보장.
  // role 은 payload 에 넣지 않는다(2.S2 로 권한 봉쇄·set_user_role 전용). 실패는 정제(raw 비노출·내부 로그).
  async setName(name: string): Promise<void> {
    const me = await this.requireUser();
    const { error } = await this.sb.from('users').update({ name }).eq('id', me.id);
    if (error) {
      console.error('[setName] users.name update 실패:', error);
      throw new CoreError('이름을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  }

  private async assertContactAccess(userId: string): Promise<void> {
    const me = await this.requireUser();
    if (!canAccessContact(me, userId)) {
      throw new CoreForbiddenError('전화번호는 본인 또는 운영자만 접근할 수 있습니다');
    }
  }

  // ── 회기·참여 ──────────────────────────────────────────────
  // 가입 결정용 공개 메타(coachName·memberCount 포함). resolve_cohort_by_code 메타를 버리지 않고 매핑.
  async previewCohortByCode(code: string): Promise<CohortPreviewMeta | null> {
    const meta = await this.resolveMeta(code);
    if (!meta) return null;
    return {
      id: meta.id,
      name: meta.name,
      description: meta.description,
      coachName: meta.coach_name,
      instrumentId: meta.instrument_id,
      memberCount: Number(meta.member_count),
      status: meta.status as CohortPreviewMeta['status'],
      expiresAt: meta.expires_at,
    };
  }

  async resolveCohortByCode(code: string): Promise<Cohort | null> {
    // resolve_cohort_by_code(SECURITY DEFINER)는 활성·미만료 회기의 공개 메타를 반환한다.
    // 미가입자도 코드만 알면 회기 정보를 확인하고 가입을 결정할 수 있다(민감정보 미노출).
    const meta = await this.resolveMeta(code);
    if (!meta) return null;
    return {
      id: meta.id,
      coachId: meta.coach_id,
      instrumentId: meta.instrument_id,
      name: meta.name,
      description: meta.description,
      code: meta.code,
      status: meta.status as Cohort['status'],
      maxMembers: meta.max_members,
      expiresAt: meta.expires_at,
      postOpenedAt: null, // resolve_cohort_by_code(공개 메타)는 post_opened_at 미반환 — 가입 결정 경로엔 무관(참여자 홈은 my_cohorts 사용)
    };
  }

  async enrollByCode(code: string): Promise<Enrollment> {
    const me = await this.requireUser();
    const meta = await this.resolveMeta(code);
    if (!meta) throw new CoreNotFoundError('유효하지 않거나 만료된 가입코드입니다');

    // 중복: 이미 가입돼 있으면 기존 참여를 그대로 반환(idempotent — 재입력 안전).
    const { data: existing } = await this.sb
      .from('enrollments')
      .select('cohort_id,user_id,joined_at')
      .eq('cohort_id', meta.id)
      .eq('user_id', me.id)
      .maybeSingle();
    if (existing) return rowToEnrollment(existing as EnrollmentRow);

    // 정원 검사(낙관적 — 동시성 한계는 추후 보완).
    if (Number(meta.member_count) >= meta.max_members) {
      throw new CoreError('회기 정원이 초과되었습니다');
    }

    const { data, error } = await this.sb
      .from('enrollments')
      .insert({ cohort_id: meta.id, user_id: me.id })
      .select('cohort_id,user_id,joined_at')
      .single();
    if (error) {
      // 내부 진단은 보존, 사용자 경로엔 일반 메시지만(raw PG·제약·RLS 힌트가 반환 페이로드에 실리지 않게).
      console.error('[enrollByCode] enrollments insert 실패:', error);
      throw new CoreError('가입 처리 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.');
    }
    return rowToEnrollment(data as EnrollmentRow);
  }

  private async resolveMeta(code: string): Promise<CohortMeta | null> {
    const { data, error } = await this.sb.rpc('resolve_cohort_by_code', { p_code: code });
    if (error) {
      // 내부 진단은 보존(운영 가시성), 사용자 경로엔 일반 메시지만(raw PG·RLS 힌트 비노출).
      console.error('[resolveMeta] resolve_cohort_by_code 실패:', error);
      throw new CoreError('회기 정보를 불러오지 못했어요.');
    }
    const rows = (Array.isArray(data) ? data : data ? [data] : []) as CohortMeta[];
    return rows[0] ?? null;
  }

  async getCohort(cohortId: string): Promise<Cohort> {
    const { data, error } = await this.sb
      .from('cohorts')
      .select('id,coach_id,instrument_id,name,description,code,status,max_members,expires_at,post_opened_at')
      .eq('id', cohortId)
      .maybeSingle();
    if (error) throw new CoreError(`getCohort 실패: ${error.message}`);
    if (!data) throw new CoreNotFoundError(`회기를 찾을 수 없습니다: ${cohortId}`);
    return rowToCohort(data as CohortRow);
  }

  // 코치 사후 진단 개시(open_post_wave DEFINER RPC) — 자기 회기(또는 운영자)만·NULL→now() 멱등·post_opened_at 만 세팅. ADR-55
  async openPostWave(cohortId: string): Promise<void> {
    const { error } = await this.sb.rpc('open_post_wave', { p_cohort_id: cohortId });
    if (error) throw new CoreError(`openPostWave 실패: ${error.message}`);
  }

  // 회기 하드삭제(파괴적·ADR-67). RLS(cohorts_delete: 소유 코치 OR 운영자)가 소유를 강제(이중 방어).
  //   **운영자 = 임의 회기 / 코치(소유) = 빈 회기만**(참여·응답 0). 데이터 있는 회기를 코치가 지우는 파괴(응답 SET NULL 고아화)를 코드 경계에서 차단 — 데이터 있으면 마감 유도.
  //   예약 general 회기(체험) 보호는 앱 액션 소관(코어는 진단어휘 무지). 빈 판정 = enrollments + responses(진행중 draft 는 CASCADE 로 함께 정리).
  async deleteCohort(cohortId: string): Promise<void> {
    const me = await this.requireUser();
    if (me.role !== 'coach' && me.role !== 'admin') {
      throw new CoreForbiddenError('회기 삭제는 인도자 또는 운영자만 가능합니다');
    }
    if (me.role !== 'admin') {
      const [{ count: enrolled }, { count: responded }] = await Promise.all([
        this.sb.from('enrollments').select('*', { count: 'exact', head: true }).eq('cohort_id', cohortId),
        this.sb.from('responses').select('*', { count: 'exact', head: true }).eq('cohort_id', cohortId),
      ]);
      if ((enrolled ?? 0) > 0 || (responded ?? 0) > 0) {
        throw new CoreError('참여자나 응답이 있는 회기는 삭제할 수 없어요. 마감을 이용해 주세요.');
      }
    }
    const { error } = await this.sb.from('cohorts').delete().eq('id', cohortId);
    if (error) throw new CoreError(`deleteCohort 실패: ${error.message}`);
  }

  // 회기에서 참여자 제거(휴지통). 권한(해당 회기 코치 OR 운영자)은 remove_cohort_member(DEFINER) 내부에서 강제.
  //   이 회기 한정 삭제: responses(→alerts·해석 CASCADE)·response_drafts·enrollments. 계정·타 회기 데이터는 불변.
  async removeCohortMember(cohortId: string, userId: string): Promise<void> {
    const { error } = await this.sb.rpc('remove_cohort_member', { p_cohort_id: cohortId, p_user_id: userId });
    if (error) throw new CoreError(`removeCohortMember 실패: ${error.message}`);
  }

  // 참여자 이동(운영자) — enrollment 만 옮긴다(응답·갈무리 불변). 삭제=휴지통으로 이동. move_cohort_member(DEFINER·admin). ADR-84
  async moveCohortMember(userId: string, fromCohortId: string, toCohortId: string): Promise<void> {
    const { error } = await this.sb.rpc('move_cohort_member', { p_user: userId, p_from: fromCohortId, p_to: toCohortId });
    if (error) throw new CoreError(`moveCohortMember 실패: ${error.message}`);
  }

  // 회기 개설(코치/운영자). 앱측 코드 생성 + 유니크 충돌(23505) 재시도. RLS(cohorts_insert)가 권한을 강제(이중 방어).
  async createCohort(input: {
    name: string;
    instrumentId: InstrumentId;
    maxMembers?: number;
    description?: string;
    expiresAt?: string | null;
  }): Promise<Cohort> {
    const me = await this.requireUser();
    if (me.role !== 'coach' && me.role !== 'admin') {
      throw new CoreForbiddenError('회기 개설은 인도자 또는 운영자만 가능합니다');
    }

    // 코드 알파벳 — DB cohorts_code_check(^[…]{5}$)와 글자 그대로 일치(혼동문자 I·L·O·0·1 제외, 31자).
    const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const newCode = (): string => {
      const bytes = new Uint32Array(5);
      crypto.getRandomValues(bytes); // 예측 불가(초대 수단) — Math.random 금지
      let c = '';
      for (let i = 0; i < 5; i += 1) c += ALPHABET[bytes[i] % ALPHABET.length];
      return c;
    };

    const base: Record<string, unknown> = {
      coach_id: me.id,
      instrument_id: input.instrumentId,
      name: input.name,
      description: input.description ?? null,
      expires_at: input.expiresAt ?? null,
    };
    if (input.maxMembers !== undefined) base.max_members = input.maxMembers; // 미지정이면 DB 기본 100

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data, error } = await this.sb
        .from('cohorts')
        .insert({ ...base, code: newCode() })
        .select('id,coach_id,instrument_id,name,code,status,max_members,expires_at,post_opened_at')
        .single();
      if (!error) return rowToCohort(data as CohortRow);
      if ((error as { code?: string }).code !== '23505') throw new CoreError(`createCohort 실패: ${error.message}`);
      // 23505 = code 유니크 충돌 → 코드 재생성 후 재시도
    }
    throw new CoreError('createCohort 실패: 유니크 코드 생성 재시도 초과(5회)');
  }

  // 회기 부분수정(코치/운영자). 불변 필드(coach_id·instrument_id·code·id)는 patch에 없음 —
  // 소유이전·링크파손·진단 불일치를 계약 표면에서 차단. RLS(cohorts_update: USING+WITH CHECK)가 소유를 강제.
  async updateCohort(
    cohortId: string,
    patch: {
      name?: string;
      description?: string | null;
      maxMembers?: number;
      status?: 'active' | 'archived';
      expiresAt?: string | null;
    },
  ): Promise<Cohort> {
    const me = await this.requireUser();
    if (me.role !== 'coach' && me.role !== 'admin') {
      throw new CoreForbiddenError('회기 수정은 인도자 또는 운영자만 가능합니다');
    }

    const payload: Record<string, unknown> = {};
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.description !== undefined) payload.description = patch.description;
    if (patch.maxMembers !== undefined) payload.max_members = patch.maxMembers;
    if (patch.status !== undefined) payload.status = patch.status;
    if (patch.expiresAt !== undefined) payload.expires_at = patch.expiresAt;
    if (Object.keys(payload).length === 0) throw new CoreError('updateCohort 실패: 수정할 필드 없음');

    const { data, error } = await this.sb
      .from('cohorts')
      .update(payload)
      .eq('id', cohortId)
      .select('id,coach_id,instrument_id,name,code,status,max_members,expires_at,post_opened_at')
      .maybeSingle();
    if (error) throw new CoreError(`updateCohort 실패: ${error.message}`);
    if (!data) throw new CoreNotFoundError(`회기를 찾을 수 없거나 수정 권한이 없습니다: ${cohortId}`); // 행 0 = 미존재/RLS 차단
    return rowToCohort(data as CohortRow);
  }

  // 멤버 본인 회기+진행(비민감 메타). my_cohorts(DEFINER)가 auth.uid() 기준 격리 — 앱은 cohorts·responses 직접 select 안 함.
  async listMyCohorts(): Promise<MyCohortSummary[]> {
    const { data, error } = await this.sb.rpc('my_cohorts');
    if (error) throw new CoreError(`listMyCohorts 실패: ${error.message}`);
    return ((data ?? []) as {
      cohort_id: string;
      name: string;
      coach_name: string | null;
      status: string;
      pre_done: boolean;
      post_done: boolean;
      post_opened: boolean;
      open_session_no: number | null;
      open_session_submitted: boolean;
      open_session_has_content: boolean;
      joined_at: string;
    }[]).map((r) => ({
      cohortId: r.cohort_id,
      name: r.name,
      coachName: r.coach_name,
      status: r.status as MyCohortSummary['status'],
      preDone: r.pre_done,
      postDone: r.post_done,
      postOpened: r.post_opened,
      // 배포 순서 방어(D2): 마이그 선행이 원칙이나, 중간 창·롤백에도 안전하도록 undefined→null/false.
      openSessionNo: r.open_session_no ?? null,
      openSessionSubmitted: r.open_session_submitted ?? false,
      openSessionHasContent: r.open_session_has_content ?? false,
      joinedAt: r.joined_at,
    }));
  }

  // 코치 회기 목록(콘솔 홈). RLS(cohorts_select): 코치는 본인 회기, 운영자는 전체.
  async listCohortsByCoach(coachId: string): Promise<Cohort[]> {
    const { data, error } = await this.sb
      .from('cohorts')
      .select('id,coach_id,instrument_id,name,code,status,max_members,expires_at,post_opened_at')
      .eq('coach_id', coachId);
    if (error) throw new CoreError(`listCohortsByCoach 실패: ${error.message}`);
    return (data ?? []).map((r) => rowToCohort(r as CohortRow));
  }

  // 전체 회기(운영자 콘솔 — 모든 인도자 회기 감독). coach 필터 없음 → RLS(cohorts_select)가 운영자=전체·그 외=본인/멤버 회기로 제한.
  //   앱은 운영자에게만 호출(수퍼바이저 뷰); 비운영자가 호출해도 RLS 로 자기 스코프만 반환(안전). 최신순 정렬.
  async listAllCohorts(): Promise<Cohort[]> {
    const { data, error } = await this.sb
      .from('cohorts')
      .select('id,coach_id,instrument_id,name,code,status,max_members,expires_at,post_opened_at')
      .order('created_at', { ascending: false });
    if (error) throw new CoreError(`listAllCohorts 실패: ${error.message}`);
    return (data ?? []).map((r) => rowToCohort(r as CohortRow));
  }

  // 회기 멤버 id+name(코치/운영자). 권한·노출은 cohort_member_directory(DEFINER) 내부에서 강제 — 미달 시 빈 결과.
  async listCohortMembers(cohortId: string, onlyParticipants = false, maskUnnamed = false): Promise<MemberRef[]> {
    // **마스킹은 DB 가 한다.** 여기서 이메일을 받아 가리지 않는다 —
    //   가리려는 것을 먼저 내보내는 순서가 되기 때문이다(불변식 13 과 같은 논리).
    const { data, error } = await this.sb.rpc('cohort_member_directory', {
      p_cohort_id: cohortId, p_only_participants: onlyParticipants, p_mask_unnamed: maskUnnamed,
    });
    if (error) throw new CoreError(`listCohortMembers 실패: ${error.message}`);
    return ((data ?? []) as { user_id: string; name: string | null }[]).map((r) => ({ userId: r.user_id, name: r.name }));
  }

  // 회기 멤버 신상(코치=자기 조원만·운영자=전체). 권한·구성원 검사·스코프는 cohort_member_detail(DEFINER) 내부에서 강제.
  //   전화(user_contacts) 개방은 이 RPC 한정(§10 완화·ADR-75). RETURNS TABLE → 1행.
  async getCohortMemberDetail(cohortId: string, userId: string): Promise<CohortMemberDetail> {
    const { data, error } = await this.sb.rpc('cohort_member_detail', { p_cohort_id: cohortId, p_user_id: userId });
    if (error) throw new CoreError(`getCohortMemberDetail 실패: ${error.message}`);
    const r = (Array.isArray(data) ? data[0] : data) as
      | { name: string | null; email: string | null; phone: string | null; address: string | null; gender: string | null; birth_year: number | null; religion: string | null; faith_years: number | null; response_count: number | string | null; cohort_names: string[] | null }
      | undefined;
    if (!r) throw new CoreError('getCohortMemberDetail: 대상을 찾을 수 없습니다(권한/구성원 확인).');
    return {
      name: r.name ?? null,
      email: r.email ?? '',
      phone: r.phone ?? null,
      address: r.address ?? null,
      gender: r.gender ?? null,
      birthYear: r.birth_year ?? null,
      religion: r.religion ?? null,
      faithYears: r.faith_years ?? null,
      responseCount: Number(r.response_count ?? 0),
      cohortNames: r.cohort_names ?? [],
    };
  }

  async listEnrollments(cohortId: string): Promise<Enrollment[]> {
    const { data, error } = await this.sb
      .from('enrollments')
      .select('cohort_id,user_id,joined_at')
      .eq('cohort_id', cohortId);
    if (error) throw new CoreError(`listEnrollments 실패: ${error.message}`);
    return (data ?? []).map((r) => rowToEnrollment(r as EnrollmentRow));
  }

  // ── 진행 중 응답(중간저장) ─────────────────────────────────
  // response_drafts 직접 I/O — RLS(user_id=auth.uid()) 가 본인 행만 허용(saveResponse 와 동형, RPC 불요).
  // answers 만 저장(step 미저장 — 셔플 안전). PK(user,cohort,wave) upsert = 최신 덮어쓰기.
  async saveDraft<A>(input: { instrumentId: InstrumentId; cohortId: string; wave: Wave; answers: A }): Promise<void> {
    const me = await this.currentUser();
    if (!me) throw new CoreError('saveDraft: 로그인이 필요합니다.');
    const { error } = await this.sb.from('response_drafts').upsert(
      {
        user_id: me.id,
        cohort_id: input.cohortId,
        instrument_id: input.instrumentId,
        wave: input.wave,
        answers: input.answers,
        updated_at: new Date().toISOString(), // upsert UPDATE 경로는 DEFAULT now() 미발화 → 명시 갱신
      },
      { onConflict: 'user_id,cohort_id,wave' },
    );
    if (error) throw new CoreError(`saveDraft 실패: ${error.message}`);
  }

  async getDraft<A>(query: { instrumentId: InstrumentId; cohortId: string; wave: Wave }): Promise<A | null> {
    const { data, error } = await this.sb
      .from('response_drafts')
      .select('answers')
      .eq('cohort_id', query.cohortId)
      .eq('wave', query.wave)
      .eq('instrument_id', query.instrumentId) // 회기 instrument 짝 검증
      .maybeSingle(); // RLS 가 본인 행만 → 최대 1
    if (error) throw new CoreError(`getDraft 실패: ${error.message}`);
    return (data?.answers ?? null) as A | null;
  }

  async clearDraft(query: { cohortId: string; wave: Wave }): Promise<void> {
    const { error } = await this.sb
      .from('response_drafts')
      .delete()
      .eq('cohort_id', query.cohortId)
      .eq('wave', query.wave); // RLS(user_id=auth.uid()) 가 본인 행만 삭제
    if (error) throw new CoreError(`clearDraft 실패: ${error.message}`);
  }

  // ── 응답 봉투 ──────────────────────────────────────────────
  async saveResponse<A, P>(input: SaveResponseInput<A, P>): Promise<string> {
    const v = this.validators[input.instrumentId];
    const answers = validateWith(v?.answersSchema, input.answers, 'answers');
    const subjectProfile = validateWith(v?.profileSchema, input.subjectProfile, 'subjectProfile');

    const { data, error } = await this.sb
      .from('responses')
      .insert({
        instrument_id: input.instrumentId,
        cohort_id: input.cohortId,
        user_id: input.userId,
        wave: input.wave,
        answers,
        subject_profile: subjectProfile,
      })
      .select('id')
      .single();
    if (error) throw new CoreError(`saveResponse 실패: ${error.message}`);
    return (data as { id: string }).id;
  }

  async getResponse<A, P>(responseId: string): Promise<ResponseEnvelope<A, P>> {
    const { data, error } = await this.sb
      .from('responses')
      .select('id,instrument_id,cohort_id,user_id,wave,answers,subject_profile,created_at')
      .eq('id', responseId)
      .maybeSingle();
    if (error) throw new CoreError(`getResponse 실패: ${error.message}`);
    if (!data) throw new CoreNotFoundError(`응답을 찾을 수 없습니다: ${responseId}`);
    return rowToEnvelope<A, P>(data as ResponseRow);
  }

  async listResponses<A, P>(query: {
    instrumentId: InstrumentId;
    cohortId?: string;
    userId?: string;
    wave?: Wave;
  }): Promise<ResponseEnvelope<A, P>[]> {
    let q = this.sb
      .from('responses')
      .select('id,instrument_id,cohort_id,user_id,wave,answers,subject_profile,created_at')
      .eq('instrument_id', query.instrumentId);
    if (query.cohortId !== undefined) q = q.eq('cohort_id', query.cohortId);
    if (query.userId !== undefined) q = q.eq('user_id', query.userId);
    if (query.wave !== undefined && query.wave !== null) q = q.eq('wave', query.wave);

    const { data, error } = await q;
    if (error) throw new CoreError(`listResponses 실패: ${error.message}`);
    return (data ?? []).map((r) => rowToEnvelope<A, P>(r as ResponseRow));
  }

  // ── 참여 프로필 (user_profiles) ─────────────────────────────
  // 본인·운영자 직접 I/O(RLS: user_id=auth.uid OR is_admin). 코치의 조원 열람은 cohort_member_profiles RPC(별도) — RLS 미확대.
  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await this.sb
      .from('user_profiles')
      .select('gender,birth_year,religion,faith_years')
      .eq('user_id', userId)
      .maybeSingle(); // RLS 가 본인/운영자만 → 그 외엔 0행(null)
    if (error) throw new CoreError(`getProfile 실패: ${error.message}`);
    if (!data) return null;
    const r = data as { gender: string | null; birth_year: number | null; religion: string | null; faith_years: number | null };
    return { gender: r.gender ?? null, birthYear: r.birth_year ?? null, religion: r.religion ?? null, faithYears: r.faith_years ?? null };
  }

  async setProfile(input: { gender?: string | null; birthYear?: number | null; religion?: string | null; faithYears?: number | null }): Promise<void> {
    const me = await this.currentUser();
    if (!me) throw new CoreError('setProfile: 로그인이 필요합니다.');
    // 본인 행 upsert(RLS insert/update 모두 user_id=auth.uid). role·kpc 는 경로에 없음(자회기정 봉쇄 유지).
    const { error } = await this.sb.from('user_profiles').upsert(
      {
        user_id: me.id,
        gender: input.gender ?? null,
        birth_year: input.birthYear ?? null,
        religion: input.religion ?? null,
        faith_years: input.faithYears ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    if (error) throw new CoreError(`setProfile 실패: ${error.message}`);
  }

  async createCoachApplication(input: { motivation?: string | null; kpcNumber?: string | null }): Promise<void> {
    // self-scoped DEFINER RPC(status='pending' 고정·재신청 upsert). 클라이언트 metadata 신뢰 폐기 경로.
    const { error } = await this.sb.rpc('create_coach_application', {
      p_motivation: input.motivation ?? null,
      p_kpc_number: input.kpcNumber ?? null,
    });
    if (error) throw new CoreError(`createCoachApplication 실패: ${error.message}`);
  }

  async getMyCoachKpc(): Promise<string | null> {
    // 본인 coach_applications.kpc_number(coach_apps_select RLS = 본인+운영자, 본인 자기 행 읽기). 행 없으면 null.
    const me = await this.currentUser();
    if (!me) return null;
    const { data, error } = await this.sb
      .from('coach_applications')
      .select('kpc_number')
      .eq('user_id', me.id)
      .maybeSingle();
    if (error) throw new CoreError(`getMyCoachKpc 실패: ${error.message}`);
    return (data?.kpc_number as string | null) ?? null;
  }

  async setMyCoachKpc(kpcNumber: string): Promise<void> {
    // 코치 본인 KPC upsert(S4 보완). self-scoped DEFINER RPC — role=coach 게이트·형식검증·status/role 무오염.
    const { error } = await this.sb.rpc('set_my_coach_kpc', { p_kpc: kpcNumber });
    if (error) throw new CoreError(`setMyCoachKpc 실패: ${error.message}`);
  }

  // ── AI 게이트웨이 ──────────────────────────────────────────
  // 범용 호출 통로(서버 전용). 프롬프트·진단 어휘는 인스트루먼트가 소유하고 이 메서드로 호출만 한다(ADR-35).
  async aiChat(req: ChatRequest): Promise<ChatResponse> {
    return gatewayChat(req);
  }

  // ── 코치 리포트 해석 문구 (B③·ADR-36) ─────────────────────
  // report_interpretations 직접 I/O — RLS(코치·운영자, is_cohort_coach/is_admin)가 가시성 보장(responses_select 패턴, 본인 분기 제외).
  // ai_content(원문)는 앱 규약상 불변 — 코치 수정은 coach_content·edited_by·edited_at 만 갱신. 유효=coach_content ?? ai_content.
  async getInterpretation(responseId: string): Promise<InterpretationView | null> {
    const { data, error } = await this.sb
      .from('report_interpretations')
      .select('response_id,ai_content,ai_model,coach_content,edited_by,edited_at')
      .eq('response_id', responseId)
      .maybeSingle(); // UNIQUE(response_id) + RLS(코치·운영자) → 최대 1
    if (error) throw new CoreError(`getInterpretation 실패: ${error.message}`);
    return data ? rowToInterpretation(data as InterpretationRow) : null;
  }

  async saveInterpretation(input: {
    responseId: string;
    cohortId: string | null;
    aiContent: unknown;
    aiModel?: string | null;
  }): Promise<InterpretationView> {
    // 없을 때만 저장(멱등) — 자격: 응답 소유자(참여자 사전생성·#3) OR 회기 코치 OR 운영자(save_report_interpretation DEFINER).
    //   DEFINER 가 저장/기존 행을 반환 → 참여자(SELECT RLS 차단)도 재조회 없이 뷰 구성. 코치/운영자 경로는 기존과 동형.
    const { data, error } = await this.sb.rpc('save_report_interpretation', {
      p_response_id: input.responseId,
      p_cohort_id: input.cohortId,
      p_ai_content: input.aiContent,
      p_ai_model: input.aiModel ?? null,
    });
    if (error) throw new CoreError(`saveInterpretation 실패: ${error.message}`);
    const row = (Array.isArray(data) ? data[0] : data) as InterpretationRow | null;
    if (!row) throw new CoreError('saveInterpretation: 저장 후 행 반환 없음(권한/응답 확인).');
    return rowToInterpretation(row);
  }

  async setCoachInterpretation(responseId: string, content: unknown): Promise<void> {
    const me = await this.currentUser();
    if (!me) throw new CoreError('setCoachInterpretation: 로그인이 필요합니다.');
    const { error } = await this.sb
      .from('report_interpretations')
      .update({ coach_content: content, edited_by: me.id, edited_at: new Date().toISOString() })
      .eq('response_id', responseId); // RLS(코치·운영자, 자기 회기)만 갱신
    if (error) throw new CoreError(`setCoachInterpretation 실패: ${error.message}`);
  }

  async clearCoachInterpretation(responseId: string): Promise<void> {
    const { error } = await this.sb
      .from('report_interpretations')
      .update({ coach_content: null, edited_by: null, edited_at: null }) // AI 원문으로 되돌리기
      .eq('response_id', responseId);
    if (error) throw new CoreError(`clearCoachInterpretation 실패: ${error.message}`);
  }

  // ── 알림 ───────────────────────────────────────────────────
  // 멱등: (response_id, reason) 유니크(20260628120000) + ON CONFLICT DO NOTHING.
  // 재호출·재시도로 같은 신호가 중복 적재되지 않는다. INSERT-only(불변)와 양립(UPDATE 없음).
  async raiseAlert(input: AlertInput): Promise<void> {
    const { error } = await this.sb.from('alerts').upsert(
      {
        response_id: input.responseId,
        cohort_id: input.cohortId,
        severity: input.severity,
        reason: input.reason,
      },
      { onConflict: 'response_id,reason', ignoreDuplicates: true },
    );
    if (error) throw new CoreError(`raiseAlert 실패: ${error.message}`);
  }

  // 회기 알림 읽기(콘솔 '먼저 챙길 분'의 저장된 출처). RLS(alerts_select): 회기 코치/운영자만.
  async listAlerts(cohortId: string): Promise<Alert[]> {
    const { data, error } = await this.sb
      .from('alerts')
      .select('id,response_id,cohort_id,severity,reason,created_at')
      .eq('cohort_id', cohortId);
    if (error) throw new CoreError(`listAlerts 실패: ${error.message}`);
    return (data ?? []).map((r) => rowToAlert(r as AlertRow));
  }

  // ── 본부: 코치 신청 ─────────────────────────────────────────
  // 읽기는 운영자 전용(coach_apps_select=admin). applicant=users.name 임베드(두 FK라 명시 disambiguation).
  async listCoachApplications(status?: 'pending' | 'approved' | 'rejected'): Promise<CoachApplication[]> {
    let q = this.sb
      .from('coach_applications')
      .select(
        'id,user_id,status,motivation,reviewed_by,reviewed_at,review_note,created_at, applicant:users!coach_applications_user_id_fkey(name)',
      );
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw new CoreError(`listCoachApplications 실패: ${error.message}`);
    return ((data ?? []) as unknown as CoachApplicationRow[]).map(rowToCoachApplication);
  }

  // 결정(승인/거절) — 상태변경 + (승인 시) user→coach 승격을 원자적으로(decide_coach_application RPC).
  // 권한(is_admin)·이중결정·승격 범위는 모두 RPC 내부에서 강제. rpc 오류는 깨끗한 CoreError 로 변환(원시 누출 방지).
  async decideCoachApplication(input: {
    applicationId: string;
    decision: 'approved' | 'rejected';
    note?: string;
  }): Promise<void> {
    const { error } = await this.sb.rpc('decide_coach_application', {
      p_application_id: input.applicationId,
      p_decision: input.decision,
      p_note: input.note ?? null,
    });
    if (error) throw new CoreError(`decideCoachApplication 실패: ${error.message}`);
  }

  // 본부 멤버 목록(운영자 전용). users_select RLS 가 admin 전체 읽기 허용(직접 select).
  async listUsers(): Promise<MemberSummary[]> {
    const { data, error } = await this.sb.from('users').select('id,email,name,role');
    if (error) throw new CoreError(`listUsers 실패: ${error.message}`);
    const rows = (data ?? []) as { id: string; email: string | null; name: string | null; role: string }[];

    // **회원 상태는 판정이라 여기서 얻는다**(5-3) — 화면이 계산하지 않는다.
    //   `member_state` 를 그대로 부른다. **저장값에서 다시 유도하지 않는다** —
    //   유도하면 판정 규칙이 SQL 과 여기 둘에 살고, 한쪽만 고쳐지는 날이 온다(불변식 23).
    //   마이그레이션을 더하지 않기로 한 발주라 일괄 RPC 를 새로 만들지 않고 사람 수만큼 부른다
    //   (운영자 전용 화면이고 실측 사용자 25명 · 병렬).
    //   실패는 **한 사람만 모름**으로 남긴다 — 목록 전체가 무너지지 않게.
    const supers = await Promise.all(
      rows.map(async (r) => {
        try {
          const { data: v, error: e } = await this.sb.rpc('is_super_admin', { p_user_id: r.id });
          return e ? false : v === true;
        } catch {
          return false;
        }
      }),
    );

    const states = await Promise.all(
      rows.map(async (r) => {
        try {
          const { data: s, error: e } = await this.sb.rpc('member_state', { p_uid: r.id });
          return e ? null : (s as MemberState);
        } catch {
          return null;
        }
      }),
    );

    return rows.map((r, i) => ({
      id: r.id,
      email: r.email ?? '',
      name: r.name,
      role: r.role as Role,
      memberState: states[i] ?? 'pending',
      isSuperAdmin: supers[i],
    }));
  }

  // 멤버 역할 직접 변경(승격/강등). 권한·화이트리스트·자기강등은 set_user_role(DEFINER) 내부에서 강제.
  async setUserRole(userId: string, role: Role): Promise<void> {
    const { error } = await this.sb.rpc('set_user_role', { p_user_id: userId, p_role: role });
    if (error) throw new CoreError(`setUserRole 실패: ${error.message}`);
  }

  // 멤버 세부(활동) — 소유/참여 회기·응답 수. admin_member_activity(DEFINER) 내부 is_admin 게이트. RETURNS TABLE → 1행 배열.
  async getMemberActivity(userId: string): Promise<MemberActivity> {
    const { data, error } = await this.sb.rpc('admin_member_activity', { p_user_id: userId });
    if (error) throw new CoreError(`getMemberActivity 실패: ${error.message}`);
    const r = (Array.isArray(data) ? data[0] : data) as
      | { owned_cohorts: string[] | null; enrolled_cohorts: string[] | null; response_count: number | string | null }
      | undefined;
    return {
      ownedCohorts: r?.owned_cohorts ?? [],
      enrolledCohorts: r?.enrolled_cohorts ?? [],
      responseCount: Number(r?.response_count ?? 0), // bigint → PostgREST string → 숫자화
    };
  }

  // 멤버 하드삭제(임의). delete_user(DEFINER) — auth.users 삭제 → public.users CASCADE 연쇄. 가드(admin·자기삭제)는 RPC 내부.
  async deleteMember(userId: string): Promise<void> {
    const { error } = await this.sb.rpc('delete_user', { p_user_id: userId });
    if (error) throw new CoreError(`deleteMember 실패: ${error.message}`);
  }

  // 운영자 임시 비번 설정(계정 복구). 권한(is_admin)·최소 8자·bcrypt 는 admin_set_temp_password(DEFINER) 내부. 서비스롤 미사용.
  async setMemberPassword(userId: string, password: string): Promise<void> {
    const { error } = await this.sb.rpc('admin_set_temp_password', { p_user_id: userId, p_password: password });
    if (error) throw new CoreError(`setMemberPassword 실패: ${error.message}`);
  }

  // ── 회차 갈무리(ADR-80) ─────────────────────────────────────
  // responses 와 완전 분리. 쓰기는 전량 DEFINER RPC(checkin_*), 일정은 cohort_sessions(RLS 코치/운영자 write).

  async listCohortSessions(cohortId: string): Promise<CohortSession[]> {
    const { data, error } = await this.sb
      .from('cohort_sessions')
      .select('cohort_id,session_no,held_at,opens_at,closes_at')
      .eq('cohort_id', cohortId)
      .order('session_no');
    if (error) throw new CoreError(`listCohortSessions 실패: ${error.message}`);
    return (data ?? []).map((r) => rowToCohortSession(r as CohortSessionRow));
  }

  async upsertCohortSessions(cohortId: string, rows: CohortSession[]): Promise<void> {
    const payload = rows.map((s) => ({
      cohort_id: cohortId,
      session_no: s.sessionNo,
      held_at: s.heldAt,
      opens_at: s.opensAt,
      closes_at: s.closesAt,
    }));
    const { error } = await this.sb.from('cohort_sessions').upsert(payload, { onConflict: 'cohort_id,session_no' });
    if (error) throw new CoreError(`upsertCohortSessions 실패: ${error.message}`);
  }

  async seedCohortSessions(cohortId: string, firstHeldAt: string, count?: number): Promise<number> {
    const args: Record<string, unknown> = { p_cohort_id: cohortId, p_first_held: firstHeldAt };
    if (count != null) args.p_count = count;
    const { data, error } = await this.sb.rpc('seed_cohort_sessions', args);
    if (error) throw new CoreError(`seedCohortSessions 실패: ${error.message}`);
    return typeof data === 'number' ? data : 0; // 삽입 행 수(0=이미 일정 있음)
  }

  async getMyCheckin(cohortId: string, sessionNo: number): Promise<CheckinRecord | null> {
    const me = await this.requireUser();
    const { data, error } = await this.sb
      .from('checkins')
      .select(CHECKIN_COLS)
      .eq('cohort_id', cohortId)
      .eq('session_no', sessionNo)
      .eq('user_id', me.id)
      .maybeSingle();
    if (error) throw new CoreError(`getMyCheckin 실패: ${error.message}`);
    return data ? rowToCheckin(data as CheckinRow) : null;
  }

  async saveMyCheckin(input: {
    cohortId: string;
    sessionNo: number;
    answers: Record<string, unknown>;
    flags?: Partial<Pick<CheckinRecord, 'stepPrivate' | 'shareConsent' | 'suggestionAnon' | 'contactRequest' | 'deepOpened'>>;
  }): Promise<void> {
    // 경계 검증(CLAUDE §9·S4): 갈무리는 채점 안 하므로 의미는 안 보되, 무제한 JSONB 는 막는다.
    //   코어는 인스트루먼트 어휘(키명·confidence 범위)를 모른다(§2·§7) — 일반 구조 한계만 강제.
    const answers = CHECKIN_ANSWERS_SCHEMA.parse(input.answers);
    if (JSON.stringify(answers).length > 32_768) throw new CoreError('saveMyCheckin 실패: 갈무리 내용이 너무 큽니다.');
    const flags: Record<string, boolean> = {};
    if (input.flags) {
      for (const [k, v] of Object.entries(input.flags)) if (typeof v === 'boolean') flags[k] = v;
    }
    const { error } = await this.sb.rpc('checkin_save', {
      p_cohort_id: input.cohortId,
      p_session_no: input.sessionNo,
      p_answers: answers,
      p_flags: flags,
    });
    if (error) throw new CoreError(`saveMyCheckin 실패: ${error.message}`);
  }

  async submitMyCheckin(cohortId: string, sessionNo: number): Promise<void> {
    const { error } = await this.sb.rpc('checkin_submit', { p_cohort_id: cohortId, p_session_no: sessionNo });
    if (error) throw new CoreError(`submitMyCheckin 실패: ${error.message}`);
  }

  async markCheckinPrompted(cohortId: string, sessionNo: number): Promise<void> {
    const { error } = await this.sb.rpc('checkin_mark', { p_cohort_id: cohortId, p_session_no: sessionNo, p_kind: 'prompt' });
    if (error) throw new CoreError(`markCheckinPrompted 실패: ${error.message}`);
  }

  async markCheckinOpened(cohortId: string, sessionNo: number): Promise<void> {
    const { error } = await this.sb.rpc('checkin_mark', { p_cohort_id: cohortId, p_session_no: sessionNo, p_kind: 'open' });
    if (error) throw new CoreError(`markCheckinOpened 실패: ${error.message}`);
  }

  async listCohortCheckins(cohortId: string, sessionNo?: number): Promise<CheckinRecord[]> {
    // 회차를 지정하지 않으면 그 회기 전체(ADR-118). 조건을 **인자가 있을 때만** 붙인다.
    let q = this.sb.from('checkins').select(CHECKIN_COLS).eq('cohort_id', cohortId);
    if (sessionNo !== undefined) q = q.eq('session_no', sessionNo);
    const { data, error } = await q;
    if (error) throw new CoreError(`listCohortCheckins 실패: ${error.message}`);
    return (data ?? []).map((r) => rowToCheckin(r as CheckinRow));
  }

  // 편지 사진(ADR-83) — storage RLS(본인/코치/운영자)로 게이트. 만료 signed URL 반환.
  // 경로 접두어로 훑지 않는다(ADR-87) — 갈무리가 다른 회기로 이동해도 사진 파일은 업로드 시점 회기 경로에
  // 그대로 남기 때문이다(Storage 는 실제 저장 키에 name 을 포함해 DB 만 고치면 파일이 깨진다).
  // checkin_photo_paths RPC 가 '그 회차 갈무리가 지금 이 회기에 있는가'로 게이트하고 이름을 돌려준다.
  async listCheckinPhotos(cohortId: string, sessionNo: number, userId: string): Promise<CheckinPhoto[]> {
    const { data, error } = await this.sb.rpc('checkin_photo_paths', {
      p_cohort: cohortId,
      p_user: userId,
      p_session: sessionNo,
    });
    if (error) throw new CoreError(`listCheckinPhotos 실패: ${error.message}`);
    const out: CheckinPhoto[] = [];
    for (const row of (data ?? []) as { name: string }[]) {
      const path = row.name;
      const { data: signed } = await this.sb.storage.from(CHECKIN_PHOTO_BUCKET).createSignedUrl(path, 3600);
      if (signed?.signedUrl) out.push({ path, url: signed.signedUrl });
    }
    return out;
  }

  async deleteCheckinPhoto(path: string): Promise<void> {
    const { error } = await this.sb.storage.from(CHECKIN_PHOTO_BUCKET).remove([path]);
    if (error) throw new CoreError(`deleteCheckinPhoto 실패: ${error.message}`);
  }

  // ── 가치 카드(ADR-121) ─────────────────────────────────────
  async getMyValueAssessment(cohortId: string | null): Promise<ValueAssessment | null> {
    const me = await this.requireUser();
    // NULL 은 `.eq` 로 못 잡는다(SQL 에서 NULL = NULL 이 참이 아니다) — `.is` 를 써야 개인분이 잡힌다.
    const q = this.sb.from('value_assessments').select(VALUE_COLS).eq('user_id', me.id);
    const { data, error } = await (cohortId === null ? q.is('cohort_id', null) : q.eq('cohort_id', cohortId)).maybeSingle();
    if (error) throw new CoreError(`getMyValueAssessment 실패: ${error.message}`);
    return data ? rowToValue(data as unknown as ValueRow) : null;
  }

  async saveMyValueProgress(input: {
    cohortId: string | null;
    stage: 'exploring' | 'candidates' | 'finalists';
    progress?: Record<string, unknown>;
    candidates?: number[];
  }): Promise<void> {
    const progress = input.progress === undefined ? null : VALUE_PROGRESS.parse(input.progress);
    const candidates = input.candidates === undefined ? null : VALUE_CARD_IDS.parse(input.candidates);
    if (progress && JSON.stringify(progress).length > VALUE_JSON_MAX) {
      throw new CoreError('saveMyValueProgress 실패: 진행 상태가 너무 큽니다.');
    }
    const { error } = await this.sb.rpc('value_save_progress', {
      p_cohort_id: input.cohortId,
      p_stage: input.stage,
      p_progress: progress,
      p_candidates: candidates,
    });
    if (error) throw new CoreError(`saveMyValueProgress 실패: ${error.message}`);
  }

  async finalizeMyValue(cohortId: string | null, ids: [number, number, number]): Promise<void> {
    const [v1, v2, v3] = VALUE_CARD_IDS.length(3).parse(ids);
    const { error } = await this.sb.rpc('value_finalize', {
      p_cohort_id: cohortId, p_v1: v1, p_v2: v2, p_v3: v3,
    });
    if (error) throw new CoreError(`finalizeMyValue 실패: ${error.message}`);
  }

  /**
   * 처음부터 다시. **이전 결과를 남기지 않는다**(ADR-187 · (가)안).
   *
   * 되돌림을 `value_save_progress` 의 전이로 열지 않은 이유가 있다 — 전이표에 final→exploring
   * 을 넣으면 **저장 경로로도 초기화가 가능해진다.** 지우는 일은 자기 이름을 가진 한 곳에서만.
   */
  async restartMyValue(cohortId: string | null): Promise<void> {
    const { error } = await this.sb.rpc('value_restart', { p_cohort_id: cohortId });
    if (error) throw new CoreError(`restartMyValue 실패: ${error.message}`);
  }

  async patchMyValue(input: {
    cohortId: string | null;
    labels?: Partial<{ v1: string; v2: string; v3: string }>;
    workbook?: Partial<{ peak: string; strength: string; longing: string }>;
    alignment?: 'aligned' | 'different' | 'unsure' | 'skipped';
  }): Promise<void> {
    const labels: Record<string, string> = {};
    for (const [k, v] of Object.entries(input.labels ?? {})) {
      if (typeof v === 'string' && v.trim()) labels[k] = VALUE_LABEL.parse(v.trim());
    }
    const wb: Record<string, string> = {};
    for (const [k, v] of Object.entries(input.workbook ?? {})) {
      if (typeof v === 'string' && v.trim()) wb[k] = VALUE_SHORT.parse(v.trim());
    }
    const { error } = await this.sb.rpc('value_patch', {
      p_cohort_id: input.cohortId,
      p_labels: labels,
      p_wb: wb,
      p_alignment: input.alignment ?? null,
    });
    if (error) throw new CoreError(`patchMyValue 실패: ${error.message}`);
  }

  async listCohortValueAssessments(cohortId: string): Promise<ValueAssessmentRow[]> {
    const { data, error } = await this.sb
      .from('value_assessments').select(`${VALUE_COLS}, users!inner(name)`)
      .eq('cohort_id', cohortId);
    if (error) throw new CoreError(`listCohortValueAssessments 실패: ${error.message}`);
    return (data ?? []).map((r) => {
      // PostgREST 조인은 배열로 오기도 하고 객체로 오기도 한다. 둘 다 받는다.
      const row = r as unknown as ValueRow & { users?: { name: string | null } | { name: string | null }[] | null };
      const u = Array.isArray(row.users) ? row.users[0] : row.users;
      return { ...rowToValue(row), userId: row.user_id, userName: u?.name ?? null };
    });
  }

  // ── 회원 상태·승인(S-1 · ADR-122) ─────────────────────────
  //
  // **판정은 여기 없다.** 우선순위(held > cohort > 저장 > pending)와 만료 산출은 `member_state()`
  //   한 곳에만 있고, 아래 셋은 그 결과를 읽어 나르기만 한다. TS 에 사본을 만들면 두 곳이
  //   갈리는 날이 오고, 그때 화면과 서버 강제가 다른 답을 낸다.
  // **유효기간 기본 개월수도 여기 없다** — 승인 화면 기본값은 큐가 실어 보내는 `defaultValidUntil` 이다.

  async getMyMemberState(): Promise<MemberState> {
    // 인자를 넘기지 않는다 — 함수 기본값이 auth.uid() 다. 남의 상태를 물으려면 운영자여야 하고
    //   그 게이트는 member_state() 안에 있다(DEFINER 가 RLS 를 우회하므로).
    const { data, error } = await this.sb.rpc('member_state');
    if (error) throw new CoreError(`getMyMemberState 실패: ${error.message}`);
    return toMemberState(data);
  }

  /**
   * 5차 T-3·T-4 — 표시용 회원 상태.
   *
   * **입력이 `member_state()` 산출값이 아니라 `memberships.status` 저장값이다.**
   * 처음 판은 산출값을 넣었고, 그래서 승인받은 적 없는 18명이 화면에 `포럼회원` 으로 표시됐다
   * (`member_state`=`cohort` → `forum`). 최박사가 기각하신 그것이다 —
   * *"포럼회원이라는 이름을 붙이는 순간 아닌 것을 그렇다고 말한 것이 된다."*
   * `cohort` 는 **권한**이지 자격이 아니므로 tier 의 입력이 될 수 없다.
   *
   * **권한 판정은 손대지 않았다** — `member_state()`·`member_can_assess`·RLS·진실표 무변경.
   * 이 메서드는 저장 행을 읽기만 한다(RLS `memberships_select`: 본인 + 운영자).
   *
   * 소속은 **T-5 와 같은 입력**에서 온다 — 참여는 `listMyCohorts()`(RPC `my_cohorts`),
   * 인도는 `listCohortsByCoach(me)`. *입력이 같고 출력이 다른 두 함수* 라는 정리 그대로다.
   * **활성 회기만** 담는다(T-5 가 `status === 'active'` 만 본 것과 같은 기준) — 끝난 회기를
   * 소속으로 계속 세우면 *지금 무엇인가* 를 묻는 줄이 이력이 된다.
   */
  async getMyMembershipView(): Promise<MembershipView> {
    const me = await this.currentUser();
    if (!me) throw new CoreError('로그인이 필요합니다');

    // 저장값. **행이 없을 수 있다** — 실측 18명이 그 경우이고, 그때가 `visitor` 다.
    const { data, error } = await this.sb
      .from('memberships')
      .select('status')
      .eq('user_id', me.id)
      .maybeSingle();
    if (error) throw new CoreError(`getMyMembershipView 실패: ${error.message}`);
    const stored = toMembershipStatus((data as { status?: unknown } | null)?.status ?? null);

    const mine = await this.listMyCohorts();
    const roles: Omit<CohortRole, 'firstSessionAt'>[] = mine
      .filter((c) => c.status === 'active')
      .map((c) => ({ cohortId: c.cohortId, cohortName: c.name, kind: 'participant' as const }));
    if (me.role === 'coach' || me.role === 'admin') {
      const led = await this.listCohortsByCoach(me.id).catch(() => []);
      for (const c of led) {
        if (c.status !== 'active') continue;
        roles.push({ cohortId: c.id, cohortName: c.name, kind: 'coach' as const });
      }
    }

    // **첫 회차일 — 최근 회기를 재는 기준**(최박사 확정 2026-08-30).
    //   *"1기참여자 5기운영자 이면 5기운영자인 것이다. 최신의 정보가 중요하니까."*
    //   이름 끝의 숫자로 재지 않는다 — 끝이 `n기` 가 아닌 회기가 섞이면 못 가린다.
    //   회차가 없는 회기는 `null` 이고 **가장 오래된 것으로 친다**(시작한 적이 없다).
    //   **읽지 못해도 표시가 멈추지 않는다** — `null` 이면 그 회기가 *최근* 을 주장하지 못할 뿐이다.
    const withDates: CohortRole[] = [];
    for (const r of roles) {
      const sessions = await this.listCohortSessions(r.cohortId).catch(() => []);
      const first = sessions.reduce<string | null>(
        (acc, s) => (acc === null || s.heldAt < acc ? s.heldAt : acc),
        null,
      );
      withDates.push({ ...r, firstSessionAt: first });
    }

    // 운영자는 **새로 읽어 올 것이 없다** — `currentUser()` 가 이미 `role` 을 들고 있다.
    return toMembershipView(stored, withDates, me.role === 'admin');
  }

  async listMembershipQueue(): Promise<MembershipQueueRow[]> {
    // **인자 없이 부른다.** 만료 임박 갈래가 걷히며 창 인자도 함께 사라졌다(`20260831090000`).
    const { data, error } = await this.sb.rpc('list_membership_queue', {});
    if (error) throw new CoreError(`listMembershipQueue 실패: ${error.message}`);
    return ((data ?? []) as MembershipQueueDbRow[])
      // **배포 창을 닫는 한 줄이다 — 방어적 잡음이 아니다.**
      //   코드가 먼저 나가고 마이그레이션이 나중에 적용되는 사이, 옛 함수는 `DEFAULT 30` 이라
      //   인자 없는 호출에도 응답하며 **임박 행을 함께 준다.** 그 행을 여기서 버린다.
      //   적용이 끝나면 걸릴 것이 없어지고, 지우면 그 창에서 화면에 유령 행이 뜬다.
      .filter((r) => r.bucket === 'pending')
      .map((r) => ({
      bucket: 'pending' as const,
      userId: r.user_id,
      name: r.name,
      email: r.email,
      forumName: r.forum_name,
      forumPhone: r.forum_phone, // 원값. 마스킹은 서버 컴포넌트가 한다(브라우저로 내보내지 않는다)
      signupNote: r.signup_note,
      // DB 쪽 열 이름은 `status` 이나 담긴 값은 **판정**(member_state)이다. RETURNS TABLE 의
      //   OUT 이름은 CREATE OR REPLACE 로 못 바꾸고 그것만을 위해 마이그레이션을 더하지 않는다.
      //   계약 이름(`state`)이 뜻을 말하고, 이 한 줄이 둘을 잇는다.
      state: toMemberState(r.status),
      validUntil: r.valid_until,
      createdAt: r.created_at,
      defaultValidUntil: r.default_valid_until,
    }));
  }

  async decideMembership(input: {
    userId: string;
    decision: MembershipDecision;
    validUntil?: string | null;
    note?: string | null;
  }): Promise<void> {
    // 가드(운영자·자기 자신 차단·화이트리스트·행잠금)는 전부 RPC 안이다. 앱이 앞에서 한 번 더
    //   막지 않는 이유는, 두 곳에서 막으면 한 곳만 고쳐질 때 뚫리기 때문이다.
    const { error } = await this.sb.rpc('decide_membership', {
      p_user_id: input.userId,
      p_decision: input.decision,
      p_valid_until: input.validUntil ?? null,
      p_note: input.note ?? null,
    });
    if (error) throw new CoreError(`decideMembership 실패: ${error.message}`);
  }

  async recordSignupIntake(input: {
    forumName?: string | null;
    forumPhone?: string | null;
    signupNote?: string | null;
  }): Promise<void> {
    const { error } = await this.sb.rpc('record_signup_intake', {
      p_forum_name: input.forumName ?? null,
      p_forum_phone: input.forumPhone ?? null,
      p_signup_note: input.signupNote ?? null,
    });
    if (error) throw new CoreError(`recordSignupIntake 실패: ${error.message}`);
  }

  // ── 공개 영역(S-4) ────────────────────────────────────────
  //
  // **RLS 가 가르고 코어는 나른다.** 소식의 초안·서가의 등급은 정책이 판정하므로
  //   여기에 role 분기를 쓰지 않는다 — 쓰면 판정이 두 곳이 된다.

  async listNews(limit = 20): Promise<NewsPost[]> {
    const { data, error } = await this.sb
      .from('news_posts')
      .select('id,title,body,published_at,created_at,author_id')
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) throw new CoreError(`listNews 실패: ${error.message}`);
    return (data ?? []).map(rowToNews);
  }

  async getNews(id: string): Promise<NewsPost | null> {
    const { data, error } = await this.sb
      .from('news_posts').select('id,title,body,published_at,created_at,author_id').eq('id', id).maybeSingle();
    if (error) throw new CoreError(`getNews 실패: ${error.message}`);
    return data ? rowToNews(data as NewsRow) : null;
  }

  async upsertNews(input: { id?: string | null; title: string; body: string; publish?: boolean }): Promise<string> {
    const { data, error } = await this.sb.rpc('news_upsert', {
      p_id: input.id ?? null, p_title: input.title, p_body: input.body, p_publish: input.publish ?? false,
    });
    if (error) throw new CoreError(`upsertNews 실패: ${error.message}`);
    return String(data);
  }

  async deleteNews(id: string): Promise<void> {
    const { error } = await this.sb.rpc('news_delete', { p_id: id });
    if (error) throw new CoreError(`deleteNews 실패: ${error.message}`);
  }

  async listLibrary(): Promise<LibraryItem[]> {
    // **표를 직접 읽지 않는다**(§4) — `anon`·`authenticated` 에게서 SELECT 를 회수했다.
    //   목록은 RPC 하나가 낸다. 그 RPC 가 주소를 싣지 않으므로 **주소가 샐 자리가 없다.**
    const { data, error } = await this.sb.rpc('library_list');
    if (error) throw new CoreError(`listLibrary 실패: ${error.message}`);
    return ((data ?? []) as LibraryRow[]).map((r) => ({
      id: r.id, title: r.title, description: r.description,
      tier: r.tier as LibraryItem['tier'], kind: r.kind as LibraryItem['kind'],
      cohortId: r.cohort_id, cohortName: r.cohort_name,
      createdBy: r.created_by, authorName: r.author_name,
      hidden: r.hidden, mine: r.mine, canView: r.can_view, createdAt: r.created_at,
      // 여기서 다시 계산하지 않는다 — 판정이 두 곳이 되면 한 곳만 고쳐질 때 갈린다.
      //   옛 RPC(사진 열 이전)가 응답하면 `undefined` 가 오므로 **거짓으로** 내려앉힌다.
      photo: r.photo === true,
      // 옛 RPC 가 응답하면 undefined 가 오므로 **빈 값으로 내려앉힌다**(사진 때와 같은 형태).
      reactions: (r.reactions ?? {}) as LibraryItem['reactions'],
      commentCount: r.comment_count ?? 0,
    }));
  }

  // ── 서가 B — 반응 · 댓글 · 신고 ────────────────────────────────────────────
  // **판정을 여기서 하지 않는다.** DB 가 `library_can_view` 로 판정하고 42501 을 던진다 —
  //   판정이 두 곳이 되면 한 곳만 고쳐질 때 뚫린다(서가 A 와 같은 규율).

  async toggleLibraryReaction(itemId: string, emoji: string): Promise<string[]> {
    const { data, error } = await this.sb.rpc('library_react', { p_item_id: itemId, p_emoji: emoji });
    if (error) throw new CoreError(`toggleLibraryReaction 실패: ${error.message}`);
    return (data ?? []) as string[];
  }

  async myLibraryReactions(itemIds: string[]): Promise<Record<string, string[]>> {
    if (itemIds.length === 0) return {};
    const { data, error } = await this.sb.rpc('library_my_reactions', { p_item_ids: itemIds });
    if (error) throw new CoreError(`myLibraryReactions 실패: ${error.message}`);
    const out: Record<string, string[]> = {};
    for (const r of (data ?? []) as { item_id: string; emojis: string[] }[]) out[r.item_id] = r.emojis;
    return out;
  }

  async listLibraryComments(itemId: string): Promise<LibraryComment[]> {
    const { data, error } = await this.sb.rpc('library_comment_list', { p_item_id: itemId });
    if (error) throw new CoreError(`listLibraryComments 실패: ${error.message}`);
    // **이름은 이미 가려져서 온다.** 여기서 가리지 않는다 — 가리는 자리는 DB 한 곳이다.
    return ((data ?? []) as {
      id: string; author_id: string | null; author_name: string | null;
      body: string; created_at: string; mine: boolean;
    }[]).map((r) => ({
      id: r.id, authorId: r.author_id, authorName: r.author_name,
      body: r.body, createdAt: r.created_at, mine: r.mine === true,
    }));
  }

  async createLibraryComment(itemId: string, body: string): Promise<string> {
    const { data, error } = await this.sb.rpc('library_comment_create', { p_item_id: itemId, p_body: body });
    if (error) throw new CoreError(`createLibraryComment 실패: ${error.message}`);
    return data as string;
  }

  async deleteLibraryComment(id: string): Promise<void> {
    const { error } = await this.sb.rpc('library_comment_delete', { p_id: id });
    if (error) throw new CoreError(`deleteLibraryComment 실패: ${error.message}`);
  }

  async reportLibraryItem(itemId: string, reason: string | null): Promise<void> {
    const { error } = await this.sb.rpc('library_report_create', { p_item_id: itemId, p_reason: reason });
    if (error) throw new CoreError(`reportLibraryItem 실패: ${error.message}`);
  }

  async didIReportLibraryItem(itemId: string): Promise<boolean> {
    const { data, error } = await this.sb.rpc('library_report_mine', { p_item_id: itemId });
    if (error) throw new CoreError(`didIReportLibraryItem 실패: ${error.message}`);
    return data === true;
  }

  async countOpenLibraryReports(): Promise<number> {
    const { data, error } = await this.sb.rpc('library_report_open_count');
    if (error) throw new CoreError(`countOpenLibraryReports 실패: ${error.message}`);
    return (data as number) ?? 0;
  }

  async listOpenLibraryReports(): Promise<LibraryReport[]> {
    const { data, error } = await this.sb.rpc('library_report_list');
    if (error) throw new CoreError(`listOpenLibraryReports 실패: ${error.message}`);
    return ((data ?? []) as {
      id: string; item_id: string; item_title: string | null; reason: string | null; created_at: string;
    }[]).map((r) => ({
      id: r.id, itemId: r.item_id, itemTitle: r.item_title, reason: r.reason, createdAt: r.created_at,
    }));
  }

  async markLibraryReportHandled(id: string): Promise<void> {
    const { error } = await this.sb.rpc('library_report_handle', { p_id: id });
    if (error) throw new CoreError(`markLibraryReportHandled 실패: ${error.message}`);
  }

  async openLibraryItem(id: string): Promise<LibrarySource | null> {
    // 관문은 **DB 안에** 있다(`library_open` 이 42501 을 던진다). 여기서 다시 판정하지 않는다 —
    //   판정이 두 곳이 되면 한 곳만 고쳐질 때 뚫린다.
    const { data, error } = await this.sb.rpc('library_open', { p_id: id });
    if (error) return null; // 자격 없음(42501)도 여기로 온다 — 화면은 «없거나 못 본다» 하나로 받는다
    const row = (data as { kind: string; storage_path: string | null; url: string | null; title: string }[] | null)?.[0];
    if (!row) return null;
    return { kind: row.kind as LibrarySource['kind'], storagePath: row.storage_path, url: row.url, title: row.title };
  }

  async canUploadLibrary(): Promise<boolean> {
    const { data, error } = await this.sb.rpc('library_can_upload');
    if (error) return false;
    return data === true;
  }

  async addLibraryItem(input: LibraryAddInput): Promise<string> {
    const { data, error } = await this.sb.rpc('library_add', {
      p_title: input.title, p_description: input.description, p_tier: input.tier,
      p_cohort_id: input.cohortId, p_kind: input.kind,
      p_storage_path: input.storagePath, p_url: input.url,
    });
    if (error) throw new CoreError(`addLibraryItem 실패: ${error.message}`);
    return data as string;
  }

  async hideLibraryItem(id: string, hidden: boolean): Promise<void> {
    const { error } = await this.sb.rpc('library_hide', { p_id: id, p_hidden: hidden });
    if (error) throw new CoreError(`hideLibraryItem 실패: ${error.message}`);
  }

  async downloadLibraryFile(storagePath: string): Promise<{ body: ArrayBuffer; contentType: string } | null> {
    // **매 요청이 관문을 지난다.** 이 클라이언트는 사용자 세션을 들고 있으므로
    //   저장소 RLS(`library_can_view_path`)가 여기서 한 번 더 판정한다 — **잔여 창 0**(판정 ④).
    const { data, error } = await this.sb.storage.from('library').download(storagePath);
    if (error || !data) return null;
    return { body: await data.arrayBuffer(), contentType: data.type || 'application/octet-stream' };
  }

  async submitContact(input: { name?: string | null; email?: string | null; body: string }): Promise<void> {
    const { error } = await this.sb.rpc('contact_submit', {
      p_name: input.name ?? null, p_email: input.email ?? null, p_body: input.body,
    });
    if (error) throw new CoreError(error.message); // 사용자에게 보일 문안이 RPC 안에 있다(길이·빈도)
  }

  async listContactMessages(onlyOpen = false): Promise<ContactMessage[]> {
    let q = this.sb.from('contact_messages')
      .select('id,name,email,body,user_id,handled_at,created_at')
      .order('created_at', { ascending: false });
    if (onlyOpen) q = q.is('handled_at', null);
    const { data, error } = await q;
    if (error) throw new CoreError(`listContactMessages 실패: ${error.message}`);
    return (data ?? []).map((r) => {
      const row = r as unknown as ContactRow;
      return {
        id: row.id, name: row.name, email: row.email, body: row.body,
        userId: row.user_id, handledAt: row.handled_at, createdAt: row.created_at,
      };
    });
  }

  async markContactHandled(id: string): Promise<void> {
    const { error } = await this.sb.rpc('contact_mark_handled', { p_id: id });
    if (error) throw new CoreError(`markContactHandled 실패: ${error.message}`);
  }

  // ── 동행 피드(2차 · ADR-124) ───────────────────────────────
  //
  // **판정을 여기서 하지 않는다.** 회기 자격은 `feed_can_access`, 보류 차단은 `feed_assert_writable`
  //   이 SQL 한 곳에서 본다. 코어는 나르기만 한다 — 화면이 버튼을 감추는 것은 표시일 뿐이고
  //   막는 것은 RPC 다(IA §5.8).
  //
  // **쓰기 오류 문안은 RPC 안에 있다**(55000 + 사실 문장 · ADR-123 contact_submit 선례).
  //   보류 계정에게 입력창을 감추지 않고 이 문장으로 답하라는 것이 발주 §9.1 의 단서다.

  async listFeedCohorts(): Promise<FeedCohortRef[]> {
    const { data, error } = await this.sb.rpc('feed_my_cohorts');
    if (error) throw new CoreError(`listFeedCohorts 실패: ${error.message}`);
    return (data ?? []).map((r: unknown) => {
      const row = r as unknown as FeedCohortRow;
      return {
        cohortId: row.cohort_id,
        name: row.name,
        status: row.status as FeedCohortRef['status'],
        isCoach: row.is_coach,
        lastPostAt: row.last_post_at,
      };
    });
  }

  /**
   * 내가 그 회기 동행 피드에 마지막으로 쓴 날(ADR-180). 쓴 적이 없으면 `null`.
   *
   * **자기 것만 낸다** — 사용자를 인자로 받지 않는다. 판정은 전부 DB 안이다
   * (`auth.uid()` 고정 · `feed_can_access` · 삭제 글 제외). 앱은 셈을 하지 않는다.
   */
  async feedMyLastPostAt(cohortId: string): Promise<string | null> {
    const { data, error } = await this.sb.rpc('feed_my_last_post_at', { p_cohort_id: cohortId });
    if (error) throw new CoreError(`feedMyLastPostAt 실패: ${error.message}`);
    return (data as string | null) ?? null;
  }

  async listFeed(input: {
    cohortId: string;
    before?: { createdAt: string; id: string } | null;
    limit?: number;
    mine?: boolean;
  }): Promise<FeedPost[]> {
    const { data, error } = await this.sb.rpc('feed_list', {
      p_cohort_id: input.cohortId,
      p_before: input.before?.createdAt ?? null,
      p_before_id: input.before?.id ?? null,
      p_limit: input.limit ?? 20,
      p_mine: input.mine ?? false,
    });
    if (error) throw new CoreError(`listFeed 실패: ${error.message}`);
    return (data ?? []).map((r: unknown) => {
      const row = r as unknown as FeedPostRow;
      assertMultiReactionSchema(r);
      return {
        id: row.id,
        authorId: row.author_id,
        authorName: row.author_name,
        body: row.body,
        photoPath: row.photo_path,
        createdAt: row.created_at,
        deleted: row.deleted,
        commentCount: row.comment_count,
        reactions: (row.reactions ?? {}) as FeedPost['reactions'],
        // 빈 배열이 무반응이다 — DB 가 `ARRAY[]` 를 주지만 null 도 방어한다(경계는 엄격 · §9).
        myReactions: (row.my_reactions ?? []) as FeedEmoji[],
      };
    });
  }

  async createFeedPost(input: { cohortId: string; body?: string; photoPath?: string | null }): Promise<string> {
    const { data, error } = await this.sb.rpc('feed_post_create', {
      p_cohort_id: input.cohortId,
      p_body: input.body ?? '',
      p_photo_path: input.photoPath ?? null,
    });
    if (error) throw new CoreError(error.message); // 사용자에게 보일 문안이 RPC 안에 있다
    return String(data);
  }

  // **바이트는 이 호출 전에 지운다**(deleteFeedPhoto). DB 로는 storage 를 지울 수 없고
  //   (ADR-87 · storage.protect_delete), RPC 가 photo_path 를 비우므로 순서를 뒤집으면 경로를 잃는다.
  async deleteFeedPost(id: string): Promise<void> {
    const { error } = await this.sb.rpc('feed_post_delete', { p_id: id });
    if (error) throw new CoreError(`deleteFeedPost 실패: ${error.message}`);
  }

  async listFeedComments(postId: string): Promise<FeedComment[]> {
    const { data, error } = await this.sb.rpc('feed_comment_list', { p_post_id: postId });
    if (error) throw new CoreError(`listFeedComments 실패: ${error.message}`);
    return (data ?? []).map((r: unknown) => {
      const row = r as unknown as FeedCommentRow;
      return { id: row.id, authorId: row.author_id, authorName: row.author_name, body: row.body, createdAt: row.created_at };
    });
  }

  async createFeedComment(postId: string, body: string): Promise<string> {
    const { data, error } = await this.sb.rpc('feed_comment_create', { p_post_id: postId, p_body: body });
    if (error) throw new CoreError(error.message);
    return String(data);
  }

  async deleteFeedComment(id: string): Promise<void> {
    const { error } = await this.sb.rpc('feed_comment_delete', { p_id: id });
    if (error) throw new CoreError(`deleteFeedComment 실패: ${error.message}`);
  }

  async reactToFeedPost(postId: string, emoji: FeedEmoji): Promise<FeedEmoji[]> {
    const { data, error } = await this.sb.rpc('feed_react', { p_post_id: postId, p_emoji: emoji });
    if (error) throw new CoreError(error.message);
    // 옛 RPC 는 **문자열 하나**를 준다. 그대로 흘리면 화면의 집합 연산이 문자열을 코드포인트로
    //   쪼개어 `❤️` 를 `❤` + 변이선택자 두 칸으로 센다 — 아래 가드의 근거다.
    if (data !== null && !Array.isArray(data)) throw new CoreError(MULTI_REACTION_MIGRATION_MSG);
    return (data ?? []) as FeedEmoji[]; // 빈 배열 = 무반응
  }

  // 목록에 URL 을 미리 싣지 않는다(S-4 §2.2 선례) — 화면이 보이는 만큼만 여기서 발급한다.
  //   다만 피드 사진은 **인라인으로 보여야 한다**(클릭해야 보이는 사진은 카톡이 아니다).
  async signFeedPhotos(paths: string[], expiresInSec = 3600): Promise<Record<string, string>> {
    if (paths.length === 0) return {};
    const { data, error } = await this.sb.storage.from(FEED_PHOTO_BUCKET).createSignedUrls(paths, expiresInSec);
    if (error) return {}; // 조용히 실패한다 — 사진이 안 뜨는 것과 피드가 안 열리는 것은 심각도가 다르다
    const out: Record<string, string> = {};
    for (const row of data ?? []) {
      if (row.signedUrl && row.path) out[row.path] = row.signedUrl;
    }
    return out;
  }

  async deleteFeedPhoto(path: string): Promise<void> {
    const { error } = await this.sb.storage.from(FEED_PHOTO_BUCKET).remove([path]);
    if (error) throw new CoreError(`deleteFeedPhoto 실패: ${error.message}`);
  }

  // 회기 하드삭제 전 회수 대상. RLS(feed_posts_select)가 이미 그 회기를 가르므로 여기서
  //   권한을 다시 보지 않는다. 접두어로 스토리지를 훑지 않는 이유는 ADR-87 과 같다 —
  //   실제 저장 키를 아는 것은 DB 이고, 훑기는 경로 규약이 바뀌는 순간 조용히 빗나간다.
  async listFeedPhotoPaths(cohortId: string): Promise<string[]> {
    const { data, error } = await this.sb
      .from('feed_posts').select('photo_path').eq('cohort_id', cohortId).not('photo_path', 'is', null);
    if (error) throw new CoreError(`listFeedPhotoPaths 실패: ${error.message}`);
    return (data ?? [])
      .map((r: unknown) => (r as { photo_path: string | null }).photo_path)
      .filter((p): p is string => !!p);
  }

  async getFeedFlow(cohortId: string, days = 7): Promise<FeedFlowPoint[]> {
    const { data, error } = await this.sb.rpc('feed_flow', { p_cohort_id: cohortId, p_days: days });
    if (error) throw new CoreError(`getFeedFlow 실패: ${error.message}`);
    return (data ?? []).map((r: unknown) => {
      const row = r as unknown as { day: string; posts: number; authors: number };
      return { day: row.day, posts: Number(row.posts), authors: Number(row.authors) };
    });
  }

  async listQuietMembers(cohortId: string, days = 3): Promise<QuietMember[]> {
    const { data, error } = await this.sb.rpc('feed_quiet', { p_cohort_id: cohortId, p_days: days });
    if (error) throw new CoreError(`listQuietMembers 실패: ${error.message}`);
    return (data ?? []).map((r: unknown) => {
      const row = r as unknown as { user_id: string; name: string | null; last_post_at: string | null };
      return { userId: row.user_id, name: row.name, lastPostAt: row.last_post_at };
    });
  }

  // ── 소식 댓글(2차) ─────────────────────────────────────────
  async listNewsComments(postId: string): Promise<NewsComment[]> {
    const { data, error } = await this.sb.rpc('news_comment_list', { p_post_id: postId });
    if (error) throw new CoreError(`listNewsComments 실패: ${error.message}`);
    return (data ?? []).map((r: unknown) => {
      const row = r as unknown as FeedCommentRow;
      return { id: row.id, authorId: row.author_id, authorName: row.author_name, body: row.body, createdAt: row.created_at };
    });
  }

  async createNewsComment(postId: string, body: string): Promise<string> {
    const { data, error } = await this.sb.rpc('news_comment_create', { p_post_id: postId, p_body: body });
    if (error) throw new CoreError(error.message);
    return String(data);
  }

  async deleteNewsComment(id: string): Promise<void> {
    const { error } = await this.sb.rpc('news_comment_delete', { p_id: id });
    if (error) throw new CoreError(`deleteNewsComment 실패: ${error.message}`);
  }

  // ── 내부 ───────────────────────────────────────────────────
  private async requireUser(): Promise<CoreUser> {
    const u = await this.currentUser();
    if (!u) throw new CoreAuthError();
    return u;
  }
}
