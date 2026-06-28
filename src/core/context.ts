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
  MemberRef,
  ResponseEnvelope,
  Role,
  SaveResponseInput,
  Wave,
} from '@/contracts';
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

export interface CreateCoreContextOptions {
  /** 진단별 경계 검증 스키마(zod). saveResponse 시 instrumentId 로 조회해 강제. */
  validators?: Record<InstrumentId, InstrumentValidators>;
}

export function createCoreContext(
  supabase: SupabaseClient,
  options: CreateCoreContextOptions = {},
): CoreContext {
  return new SupabaseCoreContext(supabase, options.validators ?? {});
}

// resolve_cohort_by_code(SECURITY DEFINER) 가 반환하는 차수 공개 메타(비민감).
interface CohortMeta {
  id: string;
  coach_id: string;
  coach_name: string | null;
  instrument_id: string;
  name: string;
  code: string;
  status: string;
  max_members: number;
  member_count: number | string;
  expires_at: string | null;
}

class SupabaseCoreContext implements CoreContext {
  constructor(
    private readonly sb: SupabaseClient,
    private readonly validators: Record<string, InstrumentValidators>,
  ) {}

  // ── 인증·신원 ──────────────────────────────────────────────
  async currentUser(): Promise<CoreUser | null> {
    const { data, error } = await this.sb.auth.getUser();
    if (error || !data?.user) return null;
    const authUser = data.user;
    const { data: profile } = await this.sb
      .from('users')
      .select('id,email,name,nickname,role')
      .eq('id', authUser.id)
      .maybeSingle();

    // 프로필 행이 아직 없으면(가입 트리거 직후 등) auth 정보로 최소 구성.
    return profile
      ? rowToUser(profile as UserRow)
      : { id: authUser.id, email: authUser.email ?? '', name: null, nickname: null, role: 'user' };
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
      code: meta.code,
      status: meta.status as Cohort['status'],
      maxMembers: meta.max_members,
      expiresAt: meta.expires_at,
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
    if (error) throw new CoreError(`enrollByCode 실패: ${error.message}`);
    return rowToEnrollment(data as EnrollmentRow);
  }

  private async resolveMeta(code: string): Promise<CohortMeta | null> {
    const { data, error } = await this.sb.rpc('resolve_cohort_by_code', { p_code: code });
    if (error) throw new CoreError(`resolveCohortByCode 실패: ${error.message}`);
    const rows = (Array.isArray(data) ? data : data ? [data] : []) as CohortMeta[];
    return rows[0] ?? null;
  }

  async getCohort(cohortId: string): Promise<Cohort> {
    const { data, error } = await this.sb
      .from('cohorts')
      .select('id,coach_id,instrument_id,name,code,status,max_members,expires_at')
      .eq('id', cohortId)
      .maybeSingle();
    if (error) throw new CoreError(`getCohort 실패: ${error.message}`);
    if (!data) throw new CoreNotFoundError(`차수를 찾을 수 없습니다: ${cohortId}`);
    return rowToCohort(data as CohortRow);
  }

  // 코치 차수 목록(콘솔 홈). RLS(cohorts_select): 코치는 본인 차수, 운영자는 전체.
  async listCohortsByCoach(coachId: string): Promise<Cohort[]> {
    const { data, error } = await this.sb
      .from('cohorts')
      .select('id,coach_id,instrument_id,name,code,status,max_members,expires_at')
      .eq('coach_id', coachId);
    if (error) throw new CoreError(`listCohortsByCoach 실패: ${error.message}`);
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

  // ── 내부 ───────────────────────────────────────────────────
  private async requireUser(): Promise<CoreUser> {
    const u = await this.currentUser();
    if (!u) throw new CoreAuthError();
    return u;
  }
}
