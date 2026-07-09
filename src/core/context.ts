// CoreContext 구현체 (계약 A: 코어 → 진단). 화면 없음 — 서버·데이터 계층만.
// 거점 = SAIL 승격(public 스키마). supabase-js 클라이언트(서버/브라우저)를 주입받아 동작한다.
//
// 권한은 이중 방어: 코어가 1차로 막고(authz), DB RLS 가 2차로 막는다.
// 계약(/contracts) 형상은 바꾸지 않는다. 검증 스키마는 진단이 주입(validators 레지스트리).
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Alert,
  AlertInput,
  CoachApplication,
  Cohort,
  CohortPreviewMeta,
  CoreContext,
  CoreUser,
  Enrollment,
  InstrumentId,
  InterpretationView,
  MemberActivity,
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
} from '@/contracts';
import { gatewayChat } from './ai/gateway';
import { satisfiesRole, canAccessContact } from './authz';
import { CoreAuthError, CoreError, CoreForbiddenError, CoreNotFoundError } from './errors';
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

// resolve_cohort_by_code(SECURITY DEFINER) 가 반환하는 차수 공개 메타(비민감).
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
    const { data: profile } = await this.sb
      .from('users')
      .select('id,email,name,nickname,role')
      .eq('id', userId)
      .maybeSingle();

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

  // ── 차수·참여 ──────────────────────────────────────────────
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
    // resolve_cohort_by_code(SECURITY DEFINER)는 활성·미만료 차수의 공개 메타를 반환한다.
    // 미가입자도 코드만 알면 차수 정보를 확인하고 가입을 결정할 수 있다(민감정보 미노출).
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
      throw new CoreError('차수 정원이 초과되었습니다');
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
      throw new CoreError('차수 정보를 불러오지 못했어요.');
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
    if (!data) throw new CoreNotFoundError(`차수를 찾을 수 없습니다: ${cohortId}`);
    return rowToCohort(data as CohortRow);
  }

  // 코치 사후 진단 개시(open_post_wave DEFINER RPC) — 자기 차수(또는 운영자)만·NULL→now() 멱등·post_opened_at 만 세팅. ADR-55
  async openPostWave(cohortId: string): Promise<void> {
    const { error } = await this.sb.rpc('open_post_wave', { p_cohort_id: cohortId });
    if (error) throw new CoreError(`openPostWave 실패: ${error.message}`);
  }

  // 차수 하드삭제(파괴적·ADR-67). RLS(cohorts_delete: 소유 코치 OR 운영자)가 소유를 강제(이중 방어).
  //   **운영자 = 임의 차수 / 코치(소유) = 빈 차수만**(참여·응답 0). 데이터 있는 차수를 코치가 지우는 파괴(응답 SET NULL 고아화)를 코드 경계에서 차단 — 데이터 있으면 마감 유도.
  //   예약 general 차수(체험) 보호는 앱 액션 소관(코어는 진단어휘 무지). 빈 판정 = enrollments + responses(진행중 draft 는 CASCADE 로 함께 정리).
  async deleteCohort(cohortId: string): Promise<void> {
    const me = await this.requireUser();
    if (me.role !== 'coach' && me.role !== 'admin') {
      throw new CoreForbiddenError('차수 삭제는 코치 또는 운영자만 가능합니다');
    }
    if (me.role !== 'admin') {
      const [{ count: enrolled }, { count: responded }] = await Promise.all([
        this.sb.from('enrollments').select('*', { count: 'exact', head: true }).eq('cohort_id', cohortId),
        this.sb.from('responses').select('*', { count: 'exact', head: true }).eq('cohort_id', cohortId),
      ]);
      if ((enrolled ?? 0) > 0 || (responded ?? 0) > 0) {
        throw new CoreError('참여자나 응답이 있는 차수는 삭제할 수 없어요. 마감을 이용해 주세요.');
      }
    }
    const { error } = await this.sb.from('cohorts').delete().eq('id', cohortId);
    if (error) throw new CoreError(`deleteCohort 실패: ${error.message}`);
  }

  // 차수에서 참여자 제거(휴지통). 권한(해당 차수 코치 OR 운영자)은 remove_cohort_member(DEFINER) 내부에서 강제.
  //   이 차수 한정 삭제: responses(→alerts·해석 CASCADE)·response_drafts·enrollments. 계정·타 차수 데이터는 불변.
  async removeCohortMember(cohortId: string, userId: string): Promise<void> {
    const { error } = await this.sb.rpc('remove_cohort_member', { p_cohort_id: cohortId, p_user_id: userId });
    if (error) throw new CoreError(`removeCohortMember 실패: ${error.message}`);
  }

  // 차수 개설(코치/운영자). 앱측 코드 생성 + 유니크 충돌(23505) 재시도. RLS(cohorts_insert)가 권한을 강제(이중 방어).
  async createCohort(input: {
    name: string;
    instrumentId: InstrumentId;
    maxMembers?: number;
    description?: string;
    expiresAt?: string | null;
  }): Promise<Cohort> {
    const me = await this.requireUser();
    if (me.role !== 'coach' && me.role !== 'admin') {
      throw new CoreForbiddenError('차수 개설은 코치 또는 운영자만 가능합니다');
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

  // 차수 부분수정(코치/운영자). 불변 필드(coach_id·instrument_id·code·id)는 patch에 없음 —
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
      throw new CoreForbiddenError('차수 수정은 코치 또는 운영자만 가능합니다');
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
    if (!data) throw new CoreNotFoundError(`차수를 찾을 수 없거나 수정 권한이 없습니다: ${cohortId}`); // 행 0 = 미존재/RLS 차단
    return rowToCohort(data as CohortRow);
  }

  // 멤버 본인 차수+진행(비민감 메타). my_cohorts(DEFINER)가 auth.uid() 기준 격리 — 앱은 cohorts·responses 직접 select 안 함.
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
      joined_at: string;
    }[]).map((r) => ({
      cohortId: r.cohort_id,
      name: r.name,
      coachName: r.coach_name,
      status: r.status as MyCohortSummary['status'],
      preDone: r.pre_done,
      postDone: r.post_done,
      postOpened: r.post_opened,
      joinedAt: r.joined_at,
    }));
  }

  // 코치 차수 목록(콘솔 홈). RLS(cohorts_select): 코치는 본인 차수, 운영자는 전체.
  async listCohortsByCoach(coachId: string): Promise<Cohort[]> {
    const { data, error } = await this.sb
      .from('cohorts')
      .select('id,coach_id,instrument_id,name,code,status,max_members,expires_at,post_opened_at')
      .eq('coach_id', coachId);
    if (error) throw new CoreError(`listCohortsByCoach 실패: ${error.message}`);
    return (data ?? []).map((r) => rowToCohort(r as CohortRow));
  }

  // 전체 차수(운영자 콘솔 — 모든 인도자 차수 감독). coach 필터 없음 → RLS(cohorts_select)가 운영자=전체·그 외=본인/멤버 차수로 제한.
  //   앱은 운영자에게만 호출(수퍼바이저 뷰); 비운영자가 호출해도 RLS 로 자기 스코프만 반환(안전). 최신순 정렬.
  async listAllCohorts(): Promise<Cohort[]> {
    const { data, error } = await this.sb
      .from('cohorts')
      .select('id,coach_id,instrument_id,name,code,status,max_members,expires_at,post_opened_at')
      .order('created_at', { ascending: false });
    if (error) throw new CoreError(`listAllCohorts 실패: ${error.message}`);
    return (data ?? []).map((r) => rowToCohort(r as CohortRow));
  }

  // 차수 멤버 id+name(코치/운영자). 권한·노출은 cohort_member_directory(DEFINER) 내부에서 강제 — 미달 시 빈 결과.
  async listCohortMembers(cohortId: string): Promise<MemberRef[]> {
    const { data, error } = await this.sb.rpc('cohort_member_directory', { p_cohort_id: cohortId });
    if (error) throw new CoreError(`listCohortMembers 실패: ${error.message}`);
    return ((data ?? []) as { user_id: string; name: string | null }[]).map((r) => ({ userId: r.user_id, name: r.name }));
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
      .eq('instrument_id', query.instrumentId) // 차수 instrument 짝 검증
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
    // 본인 행 upsert(RLS insert/update 모두 user_id=auth.uid). role·kpc 는 경로에 없음(자기수정 봉쇄 유지).
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
    // 없을 때만 저장(멱등) — 자격: 응답 소유자(참여자 사전생성·#3) OR 차수 코치 OR 운영자(save_report_interpretation DEFINER).
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
      .eq('response_id', responseId); // RLS(코치·운영자, 자기 차수)만 갱신
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

  // 차수 알림 읽기(콘솔 '먼저 챙길 분'의 저장된 출처). RLS(alerts_select): 차수 코치/운영자만.
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
    return ((data ?? []) as { id: string; email: string | null; name: string | null; role: string }[]).map((r) => ({
      id: r.id,
      email: r.email ?? '',
      name: r.name,
      role: r.role as Role,
    }));
  }

  // 멤버 역할 직접 변경(승격/강등). 권한·화이트리스트·자기강등은 set_user_role(DEFINER) 내부에서 강제.
  async setUserRole(userId: string, role: Role): Promise<void> {
    const { error } = await this.sb.rpc('set_user_role', { p_user_id: userId, p_role: role });
    if (error) throw new CoreError(`setUserRole 실패: ${error.message}`);
  }

  // 멤버 세부(활동) — 소유/참여 차수·응답 수. admin_member_activity(DEFINER) 내부 is_admin 게이트. RETURNS TABLE → 1행 배열.
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

  // ── 내부 ───────────────────────────────────────────────────
  private async requireUser(): Promise<CoreUser> {
    const u = await this.currentUser();
    if (!u) throw new CoreAuthError();
    return u;
  }
}
