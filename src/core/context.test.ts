import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { createCoreContext, type CreateCoreContextOptions } from './context';
import { CoreAuthError, CoreError, CoreForbiddenError, CoreNotFoundError, CoreValidationError } from './errors';
import { makeMockSupabase, type MockOptions } from './__testhelpers__/mockSupabase';

function ctxWith(mock: MockOptions, opts: CreateCoreContextOptions = {}) {
  const { sb, calls, rpcCalls } = makeMockSupabase(mock);
  return { ctx: createCoreContext(sb, opts), calls, rpcCalls };
}

const userRow = (id: string, role: string) => ({
  id,
  email: `${id}@t.test`,
  name: id,
  nickname: id,
  role,
});

const metaRow = (over: Record<string, unknown> = {}) => ({
  id: 'co1',
  coach_id: 'c1',
  coach_name: 'CoachA',
  instrument_id: 'futurenow',
  name: '1기',
  code: 'RSTUV',
  status: 'active',
  max_members: 10,
  member_count: 0,
  expires_at: null,
  ...over,
});

describe('currentUser / requireRole', () => {
  it('비로그인이면 null', async () => {
    const { ctx } = ctxWith({ authUser: null });
    expect(await ctx.currentUser()).toBeNull();
  });

  it('로그인 + 프로필이면 CoreUser', async () => {
    const { ctx } = ctxWith({
      authUser: { id: 'u1', email: 'u1@t.test' },
      tableResolver: (c) => (c.table === 'users' ? { data: userRow('u1', 'coach'), error: null } : { data: null, error: null }),
    });
    const u = await ctx.currentUser();
    expect(u).toMatchObject({ id: 'u1', role: 'coach' });
  });

  // ★★ 조회 실패와 행 부재를 가른다 (ADR-179 · 지휘부 지시 2026-09-02).
  //   전에는 둘이 같은 길로 흘러 **실패해도 `role: 'user'` 합성 객체**가 나갔다 —
  //   코치·운영자가 조용히 참여자로 내려앉고 콘솔에서 튕겼다. 셋을 **각각 먹여서** 가른다.
  describe('★★ 조회 실패 ≠ 행 부재', () => {
    const failing = (msg = 'timeout') => ({
      authUser: { id: 'u1', email: 'u1@t.test' },
      tableResolver: (c: { table: string }) =>
        c.table === 'users' ? { data: null, error: { message: msg } } : { data: null, error: null },
    });

    it('★ 조회가 **실패하면 던진다** — 참여자로 내려앉지 않는다', async () => {
      const { ctx } = ctxWith(failing());
      await expect(ctx.currentUser()).rejects.toThrow(CoreError);
      // 무엇이 잘못됐는지 드러나야 한다 — 원인 문자열을 삼키지 않는다(이웃 관용구와 같은 모양).
      await expect(ctxWith(failing('boom')).ctx.currentUser()).rejects.toThrow(/boom/);
    });

    it('★ 실패를 **역할 강등으로 바꾸지 않는다** — 이것이 실제 피해였다', async () => {
      const { ctx } = ctxWith(failing());
      let got: unknown = null;
      await ctx.currentUser().catch((e) => { got = e; });
      expect(got, '실패인데 조용히 값이 나왔다').toBeInstanceOf(CoreError);
    });

    it('★ 행이 **없는 것은 오류가 아니다** — 가입 트리거 직후가 그렇다', async () => {
      const { ctx } = ctxWith({
        authUser: { id: 'u9', email: 'u9@t.test' },
        tableResolver: () => ({ data: null, error: null }),
      });
      const me = await ctx.currentUser();
      expect(me, '행 부재를 오류로 바꿨다').not.toBeNull();
      expect(me?.id).toBe('u9');
      expect(me?.role, '최소 구성의 역할이 바뀌었다').toBe('user');
      expect(me?.email, 'fallback 경로의 이메일을 잃었다').toBe('u9@t.test');
    });

    it('★ 정상 행은 그대로 — 역할이 살아 있다', async () => {
      const { ctx } = ctxWith({
        authUser: { id: 'c1', email: 'c1@t.test' },
        tableResolver: (c: { table: string }) =>
          c.table === 'users' ? { data: userRow('c1', 'coach'), error: null } : { data: null, error: null },
      });
      expect((await ctx.currentUser())?.role).toBe('coach');
    });

    it('★ 비로그인은 여전히 `null` 이다 — 던지지 않는다', async () => {
      const { ctx } = ctxWith({ authUser: null });
      expect(await ctx.currentUser()).toBeNull();
    });

    it('★★ `null` 로 내지 않는 이유가 살아 있다 — 로그인 화면이 되돌려 보낸다', () => {
      // 실패에 `null` 을 내면 게이트가 `/login` 으로 보내고, `/login` 은 세션이 살아 있으면
      //   **다시 그 화면으로 돌려보낸다** — 고리가 된다. 그 되돌림이 실재하는지 확인한다(계열 ⑦).
      const login = readFileSync('src/app/(public)/login/page.tsx', 'utf8');
      expect(login, '로그인 화면이 되돌려 보내지 않는다 — 그러면 이 근거가 낡았다').toContain('redirect(');
      expect(login).toContain('data.user');
    });
  });

  it('currentUser 요청 단위 메모이즈(C-2) — N회+내부 재호출에도 users SELECT 1회', async () => {
    const { ctx, calls } = ctxWith({
      authUser: { id: 'u1', email: 'u1@t.test' },
      tableResolver: (c) => (c.table === 'users' ? { data: userRow('u1', 'coach'), error: null } : { data: null, error: null }),
    });
    await ctx.currentUser();
    await ctx.currentUser();
    await ctx.requireRole('coach'); // 내부에서 currentUser 재호출
    const userSelects = calls.filter((c) => c.table === 'users' && c.op === 'select').length;
    expect(userSelects).toBe(1); // 인스턴스(=요청) 단위 메모이즈 — 과거 3회 → 1회. 검증(getUser)은 최초 1회 그대로 수행.
  });

  it('requireRole 계층 판정(비동기)', async () => {
    const { ctx } = ctxWith({
      authUser: { id: 'c1' },
      tableResolver: () => ({ data: userRow('c1', 'coach'), error: null }),
    });
    await expect(ctx.requireRole('coach')).resolves.toBeUndefined();
    await expect(ctx.requireRole('user')).resolves.toBeUndefined();
    await expect(ctx.requireRole('admin')).rejects.toBeInstanceOf(CoreForbiddenError);
  });

  it('requireRole 비로그인 → CoreAuthError', async () => {
    const { ctx } = ctxWith({ authUser: null });
    await expect(ctx.requireRole('user')).rejects.toBeInstanceOf(CoreAuthError);
  });
});

describe('getPhone / setPhone (본인·운영자만 — 코어 1차 방어)', () => {
  it('본인은 자기 번호 열람', async () => {
    const { ctx, calls } = ctxWith({
      authUser: { id: 'u1' },
      tableResolver: (c) =>
        c.table === 'users'
          ? { data: userRow('u1', 'user'), error: null }
          : { data: { phone: '010-1234-5678' }, error: null },
    });
    expect(await ctx.getPhone('u1')).toBe('010-1234-5678');
    expect(calls.some((c) => c.table === 'user_contacts')).toBe(true);
  });

  it('일반 사용자가 타인 번호를 요청하면 차단되고 user_contacts 를 조회하지 않는다', async () => {
    const { ctx, calls } = ctxWith({
      authUser: { id: 'u1' },
      tableResolver: () => ({ data: userRow('u1', 'user'), error: null }),
    });
    await expect(ctx.getPhone('u2')).rejects.toBeInstanceOf(CoreForbiddenError);
    expect(calls.some((c) => c.table === 'user_contacts')).toBe(false);
  });

  it('운영자는 타인 번호 열람 가능', async () => {
    const { ctx } = ctxWith({
      authUser: { id: 'a1' },
      tableResolver: (c) =>
        c.table === 'users'
          ? { data: userRow('a1', 'admin'), error: null }
          : { data: { phone: '010-0000-0000' }, error: null },
    });
    expect(await ctx.getPhone('u2')).toBe('010-0000-0000');
  });

  it('setPhone(본인) 은 user_contacts 에 upsert', async () => {
    const { ctx, calls } = ctxWith({
      authUser: { id: 'u1' },
      tableResolver: (c) =>
        c.table === 'users' ? { data: userRow('u1', 'user'), error: null } : { data: null, error: null },
    });
    await ctx.setPhone('u1', '010-1111-2222');
    const upsert = calls.find((c) => c.table === 'user_contacts' && c.op === 'upsert');
    expect(upsert?.payload).toEqual({ user_id: 'u1', phone: '010-1111-2222' });
  });

  it('setPhone(타인, 비운영자) 차단', async () => {
    const { ctx } = ctxWith({
      authUser: { id: 'u1' },
      tableResolver: () => ({ data: userRow('u1', 'user'), error: null }),
    });
    await expect(ctx.setPhone('u2', '010')).rejects.toBeInstanceOf(CoreForbiddenError);
  });
});

describe('saveResponse (봉투 저장 + 경계 검증)', () => {
  const validators = { futurenow: { answersSchema: z.object({ A1: z.number() }) } };

  it('등록 스키마 위반 시 CoreValidationError', async () => {
    const { ctx } = ctxWith({ authUser: { id: 'u1' } }, { validators });
    await expect(
      ctx.saveResponse({
        instrumentId: 'futurenow',
        cohortId: 'co1',
        userId: 'u1',
        wave: 'pre',
        answers: { A1: 'bad' },
        subjectProfile: {},
      }),
    ).rejects.toBeInstanceOf(CoreValidationError);
  });

  it('성공 시 id 반환 + camel→snake 매핑', async () => {
    const { ctx, calls } = ctxWith(
      {
        authUser: { id: 'u1' },
        tableResolver: (c) =>
          c.table === 'responses' && c.op === 'insert' ? { data: { id: 'r1' }, error: null } : { data: null, error: null },
      },
      { validators },
    );
    const id = await ctx.saveResponse({
      instrumentId: 'futurenow',
      cohortId: 'co1',
      userId: 'u1',
      wave: 'pre',
      answers: { A1: 4 },
      subjectProfile: { age: '30s' },
    });
    expect(id).toBe('r1');
    const insert = calls.find((c) => c.table === 'responses' && c.op === 'insert');
    expect(insert?.payload).toMatchObject({
      instrument_id: 'futurenow',
      cohort_id: 'co1',
      user_id: 'u1',
      wave: 'pre',
      subject_profile: { age: '30s' },
    });
  });
});

describe('listResponses (필터 구성)', () => {
  it('wave 가 null 이면 wave 필터를 걸지 않는다', async () => {
    const { ctx, calls } = ctxWith({
      authUser: { id: 'u1' },
      tableResolver: () => ({ data: [], error: null }),
    });
    await ctx.listResponses({ instrumentId: 'futurenow', userId: 'u1', wave: null });
    const q = calls.find((c) => c.table === 'responses');
    expect(q?.filters).toEqual({ instrument_id: 'futurenow', user_id: 'u1' });
  });

  it('wave 가 주어지면 필터에 포함', async () => {
    const { ctx, calls } = ctxWith({
      authUser: { id: 'u1' },
      tableResolver: () => ({ data: [], error: null }),
    });
    await ctx.listResponses({ instrumentId: 'futurenow', cohortId: 'co1', wave: 'post' });
    const q = calls.find((c) => c.table === 'responses');
    expect(q?.filters).toEqual({ instrument_id: 'futurenow', cohort_id: 'co1', wave: 'post' });
  });
});

describe('resolveCohortByCode (공개 메타, 미가입자도 가능)', () => {
  it('메타 없음 → null', async () => {
    const { ctx } = ctxWith({ authUser: { id: 'u1' }, rpcResolver: () => ({ data: [], error: null }) });
    expect(await ctx.resolveCohortByCode('ZZZZZ')).toBeNull();
  });

  it('메타 있으면 Cohort 로 매핑(민감정보 미포함)', async () => {
    const { ctx } = ctxWith({
      authUser: { id: 'u1' },
      rpcResolver: () => ({ data: [metaRow()], error: null }),
    });
    expect(await ctx.resolveCohortByCode('rstuv')).toMatchObject({
      id: 'co1',
      coachId: 'c1',
      instrumentId: 'futurenow',
      code: 'RSTUV',
      maxMembers: 10,
    });
  });
});

describe('previewCohortByCode (가입 결정용 공개 메타)', () => {
  it('메타 → CohortPreviewMeta 매핑(coachName·memberCount 포함, 민감정보 없음)', async () => {
    const { ctx } = ctxWith({
      authUser: { id: 'u1' },
      rpcResolver: () => ({ data: [metaRow({ member_count: 3 })], error: null }),
    });
    expect(await ctx.previewCohortByCode('rstuv')).toEqual({
      id: 'co1',
      name: '1기',
      coachName: 'CoachA',
      instrumentId: 'futurenow',
      memberCount: 3,
      status: 'active',
      expiresAt: null,
    });
  });
  it('메타 없음 → null', async () => {
    const { ctx } = ctxWith({ authUser: { id: 'u1' }, rpcResolver: () => ({ data: [], error: null }) });
    expect(await ctx.previewCohortByCode('ZZZZZ')).toBeNull();
  });
});

describe('enrollByCode (코드로 가입)', () => {
  it('유효하지 않은 코드 → CoreNotFoundError', async () => {
    const { ctx } = ctxWith({
      authUser: { id: 'u1' },
      tableResolver: () => ({ data: userRow('u1', 'user'), error: null }),
      rpcResolver: () => ({ data: [], error: null }),
    });
    await expect(ctx.enrollByCode('ZZZZZ')).rejects.toBeInstanceOf(CoreNotFoundError);
  });

  it('이미 가입돼 있으면 기존 참여 반환(insert 없음)', async () => {
    const { ctx, calls } = ctxWith({
      authUser: { id: 'u1' },
      rpcResolver: () => ({ data: [metaRow()], error: null }),
      tableResolver: (c) => {
        if (c.table === 'users') return { data: userRow('u1', 'user'), error: null };
        if (c.table === 'enrollments' && c.single === 'maybe')
          return { data: { cohort_id: 'co1', user_id: 'u1', joined_at: 't0' }, error: null };
        return { data: null, error: null };
      },
    });
    expect(await ctx.enrollByCode('rstuv')).toEqual({ cohortId: 'co1', userId: 'u1', joinedAt: 't0' });
    expect(calls.some((c) => c.table === 'enrollments' && c.op === 'insert')).toBe(false);
  });

  it('정원 초과 → 오류', async () => {
    const { ctx } = ctxWith({
      authUser: { id: 'u1' },
      rpcResolver: () => ({ data: [metaRow({ member_count: 10, max_members: 10 })], error: null }),
      tableResolver: (c) =>
        c.table === 'users' ? { data: userRow('u1', 'user'), error: null } : { data: null, error: null },
    });
    await expect(ctx.enrollByCode('rstuv')).rejects.toThrow(/정원/);
  });

  it('정상 가입 → enrollments insert + Enrollment 반환', async () => {
    const { ctx, calls } = ctxWith({
      authUser: { id: 'u1' },
      rpcResolver: () => ({ data: [metaRow({ member_count: 2 })], error: null }),
      tableResolver: (c) => {
        if (c.table === 'users') return { data: userRow('u1', 'user'), error: null };
        if (c.table === 'enrollments' && c.single === 'maybe') return { data: null, error: null };
        if (c.table === 'enrollments' && c.op === 'insert')
          return { data: { cohort_id: 'co1', user_id: 'u1', joined_at: 't1' }, error: null };
        return { data: null, error: null };
      },
    });
    expect(await ctx.enrollByCode('rstuv')).toEqual({ cohortId: 'co1', userId: 'u1', joinedAt: 't1' });
    const ins = calls.find((c) => c.table === 'enrollments' && c.op === 'insert');
    expect(ins?.payload).toEqual({ cohort_id: 'co1', user_id: 'u1' });
  });
});

describe('getCohort / raiseAlert', () => {
  it('getCohort 미발견 → CoreNotFoundError', async () => {
    const { ctx } = ctxWith({
      authUser: { id: 'u1' },
      tableResolver: () => ({ data: null, error: null }),
    });
    await expect(ctx.getCohort('missing')).rejects.toBeInstanceOf(CoreNotFoundError);
  });

  it('raiseAlert 는 alerts 에 멱등 upsert(중복 무시)', async () => {
    const { ctx, calls } = ctxWith({
      authUser: { id: 'u1' },
      tableResolver: () => ({ data: null, error: null }),
    });
    await ctx.raiseAlert({ responseId: 'r1', cohortId: 'co1', severity: 'red_flag', reason: '활력 위기신호' });
    const up = calls.find((c) => c.table === 'alerts' && c.op === 'upsert');
    expect(up?.payload).toEqual({
      response_id: 'r1',
      cohort_id: 'co1',
      severity: 'red_flag',
      reason: '활력 위기신호',
    });
  });
});

describe('listCohortsByCoach / listAlerts (콘솔 실데이터 출처)', () => {
  it('listCohortsByCoach 는 coach_id 로 필터, Cohort[] 매핑', async () => {
    const { ctx, calls } = ctxWith({
      authUser: { id: 'c1' },
      tableResolver: (c) =>
        c.table === 'cohorts'
          ? {
              data: [
                { id: 'co1', coach_id: 'c1', instrument_id: 'futurenow', name: '1기', code: 'RSTUV', status: 'active', max_members: 10, expires_at: null },
              ],
              error: null,
            }
          : { data: null, error: null },
    });
    const list = await ctx.listCohortsByCoach('c1');
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: 'co1', coachId: 'c1', instrumentId: 'futurenow' });
    expect(calls.find((c) => c.table === 'cohorts')?.filters).toEqual({ coach_id: 'c1' });
  });

  it('listAlerts 는 cohort_id 로 필터, 읽기형 Alert[] 매핑(저장된 출처)', async () => {
    const { ctx, calls } = ctxWith({
      authUser: { id: 'c1' },
      tableResolver: (c) =>
        c.table === 'alerts'
          ? { data: [{ id: 'a1', response_id: 'r1', cohort_id: 'co1', severity: 'red_flag', reason: '활력 위기신호', created_at: 't0' }], error: null }
          : { data: null, error: null },
    });
    const list = await ctx.listAlerts('co1');
    expect(list[0]).toEqual({ id: 'a1', responseId: 'r1', cohortId: 'co1', severity: 'red_flag', reason: '활력 위기신호', createdAt: 't0' });
    expect(calls.find((c) => c.table === 'alerts')?.filters).toEqual({ cohort_id: 'co1' });
  });
});

describe('본부 데이터: 멤버명부 / 코치 신청 (RPC·임베드 매핑)', () => {
  it('listCohortMembers 는 RPC 결과를 MemberRef[] 로 매핑(null 이름 보존)', async () => {
    const { ctx, rpcCalls } = ctxWith({
      authUser: { id: 'c1' },
      rpcResolver: (name) =>
        name === 'cohort_member_directory'
          ? { data: [{ user_id: 'u2', name: '이참여' }, { user_id: 'u3', name: null }], error: null }
          : { data: null, error: null },
    });
    const members = await ctx.listCohortMembers('co1');
    expect(members).toEqual([{ userId: 'u2', name: '이참여' }, { userId: 'u3', name: null }]);
    // ADR-118 이 선택 인자를 더했고 ORDER ② 가 하나를 더 더했다. **둘 다 기본값이 기존 동작**임을
    //   여기서 못 박는다 — 기본이 참여자 전용으로 바뀌면 리포트 PDF 헤더의 이름 조회가 '참여자' 로
    //   폴백되고, 마스킹이 기본으로 켜지면 **옵트인하지 않은 호출부까지** 가려진 이름을 받는다.
    //   호출처는 `rg 'listCohortMembers\('` 로 센다 — 수를 적으면 낡는다.
    expect(rpcCalls).toContainEqual({
      name: 'cohort_member_directory',
      args: { p_cohort_id: 'co1', p_only_participants: false, p_mask_unnamed: false },
    });
  });

  // ADR-118 — 세로 보기·격자가 회차 수만큼 왕복하지 않게 회차 인자를 선택으로 바꿨다.
  it('listCohortCheckins 는 sessionNo 를 줄 때만 session_no 로 거른다', async () => {
    const { ctx, calls } = ctxWith({ authUser: { id: 'c1' }, tableResolver: () => ({ data: [], error: null }) });
    await ctx.listCohortCheckins('co1', 3);
    expect(calls.find((c) => c.table === 'checkins')?.filters).toEqual({ cohort_id: 'co1', session_no: 3 });
  });

  it('listCohortCheckins 는 sessionNo 를 생략하면 그 회기 전체를 돌려준다', async () => {
    const { ctx, calls } = ctxWith({ authUser: { id: 'c1' }, tableResolver: () => ({ data: [], error: null }) });
    await ctx.listCohortCheckins('co1');
    expect(calls.find((c) => c.table === 'checkins')?.filters).toEqual({ cohort_id: 'co1' });
  });

  it('listCohortMembers(onlyParticipants) 가 RPC 인자로 전달된다 — 명단·격자만 참여자 전용', async () => {
    const { ctx, rpcCalls } = ctxWith({
      authUser: { id: 'c1' },
      rpcResolver: () => ({ data: [], error: null }),
    });
    await ctx.listCohortMembers('co1', true);
    expect(rpcCalls).toContainEqual({
      name: 'cohort_member_directory',
      args: { p_cohort_id: 'co1', p_only_participants: true, p_mask_unnamed: false },
    });
  });

  // ORDER ② — 마스킹은 **부르는 쪽이 켠다**. 계약이 옵트인을 실제로 실어 나르는지 여기서 잰다.
  //   그룹 리포트 한 곳만 켜므로, 이 한 줄이 없으면 켜는 길이 끊겨도 아무도 모른다.
  it('listCohortMembers(maskUnnamed) 가 RPC 인자로 전달된다 — 그룹 리포트만 켠다', async () => {
    const { ctx, rpcCalls } = ctxWith({
      authUser: { id: 'c1' },
      rpcResolver: () => ({ data: [], error: null }),
    });
    await ctx.listCohortMembers('co1', true, true);
    expect(rpcCalls).toContainEqual({
      name: 'cohort_member_directory',
      args: { p_cohort_id: 'co1', p_only_participants: true, p_mask_unnamed: true },
    });
  });

  it('listCoachApplications 는 status 필터 + applicant 이름 매핑(읽기형)', async () => {
    const { ctx, calls } = ctxWith({
      authUser: { id: 'a1' },
      tableResolver: (c) =>
        c.table === 'coach_applications'
          ? {
              data: [
                { id: 'ap1', user_id: 'u9', status: 'pending', motivation: '이끌고 싶어요', reviewed_by: null, reviewed_at: null, review_note: null, created_at: 't0', applicant: { name: '정신청' } },
              ],
              error: null,
            }
          : { data: null, error: null },
    });
    const apps = await ctx.listCoachApplications('pending');
    expect(apps[0]).toEqual({
      id: 'ap1', userId: 'u9', applicantName: '정신청', status: 'pending', motivation: '이끌고 싶어요',
      reviewedBy: null, reviewedAt: null, reviewNote: null, createdAt: 't0',
    });
    expect(calls.find((c) => c.table === 'coach_applications')?.filters).toEqual({ status: 'pending' });
  });

  it('decideCoachApplication 은 RPC 인자에 매핑 전달(note 미지정 → null)', async () => {
    const { ctx, rpcCalls } = ctxWith({ authUser: { id: 'a1' }, rpcResolver: () => ({ data: null, error: null }) });
    await ctx.decideCoachApplication({ applicationId: 'ap1', decision: 'approved' });
    expect(rpcCalls).toContainEqual({ name: 'decide_coach_application', args: { p_application_id: 'ap1', p_decision: 'approved', p_note: null } });
  });

  it('decideCoachApplication 은 RPC 오류를 깨끗한 CoreError 로 변환', async () => {
    const { ctx } = ctxWith({ authUser: { id: 'c1' }, rpcResolver: () => ({ data: null, error: { message: 'not authorized' } }) });
    await expect(ctx.decideCoachApplication({ applicationId: 'ap1', decision: 'approved' })).rejects.toThrowError(/decideCoachApplication/);
  });
});

describe('createCohort (회기 개설 — 코드 생성·재시도·권한)', () => {
  const CODE_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$/;
  const cohortRow = (code: string, max = 100) => ({
    id: 'co9', coach_id: 'c1', instrument_id: 'futurenow', name: '새 회기', code, status: 'active', max_members: max, expires_at: null,
  });

  it('코치가 만들면 코드가 DB CHECK 정규식을 충족하고 coach_id 가 본인', async () => {
    const { ctx, calls } = ctxWith({
      authUser: { id: 'c1' },
      tableResolver: (c) =>
        c.table === 'users'
          ? { data: userRow('c1', 'coach'), error: null }
          : { data: cohortRow((c.payload as { code: string }).code), error: null },
    });
    const cohort = await ctx.createCohort({ name: '새 회기', instrumentId: 'futurenow' });
    expect(cohort.code).toMatch(CODE_RE);
    const ins = calls.find((c) => c.table === 'cohorts' && c.op === 'insert');
    expect((ins?.payload as Record<string, unknown>).coach_id).toBe('c1');
  });

  it('maxMembers 미지정 → insert payload 에 max_members 없음(DB 기본 100), 지정 → 포함', async () => {
    const resolver = (c: { table: string; payload?: unknown }) =>
      c.table === 'users'
        ? { data: userRow('c1', 'coach'), error: null }
        : { data: cohortRow((c.payload as { code: string }).code), error: null };
    const a = ctxWith({ authUser: { id: 'c1' }, tableResolver: resolver });
    await a.ctx.createCohort({ name: 'X', instrumentId: 'futurenow' });
    expect(a.calls.find((c) => c.table === 'cohorts' && c.op === 'insert')?.payload).not.toHaveProperty('max_members');

    const b = ctxWith({ authUser: { id: 'c1' }, tableResolver: resolver });
    await b.ctx.createCohort({ name: 'X', instrumentId: 'futurenow', maxMembers: 20 });
    expect((b.calls.find((c) => c.table === 'cohorts' && c.op === 'insert')?.payload as Record<string, unknown>).max_members).toBe(20);
  });

  it('코드 충돌(23505) 시 다른 코드로 재시도해 성공', async () => {
    let n = 0;
    const seen: string[] = [];
    const { ctx } = ctxWith({
      authUser: { id: 'c1' },
      tableResolver: (c) => {
        if (c.table === 'users') return { data: userRow('c1', 'coach'), error: null };
        const code = (c.payload as { code: string }).code;
        seen.push(code);
        n += 1;
        return n === 1
          ? { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } }
          : { data: cohortRow(code), error: null };
      },
    });
    const cohort = await ctx.createCohort({ name: 'X', instrumentId: 'futurenow' });
    expect(n).toBe(2);
    expect(seen[0]).not.toBe(seen[1]);
    expect(cohort.code).toBe(seen[1]);
  });

  it('비코치(참여자)는 CoreForbiddenError, cohorts INSERT 시도 없음', async () => {
    const { ctx, calls } = ctxWith({
      authUser: { id: 'u1' },
      tableResolver: () => ({ data: userRow('u1', 'user'), error: null }),
    });
    await expect(ctx.createCohort({ name: 'X', instrumentId: 'futurenow' })).rejects.toBeInstanceOf(CoreForbiddenError);
    expect(calls.some((c) => c.table === 'cohorts' && c.op === 'insert')).toBe(false);
  });
});

describe('updateCohort (회기 수정 — 부분수정·불변필드·권한)', () => {
  const updatedRow = (over: Record<string, unknown>) => ({
    id: 'co1', coach_id: 'c1', instrument_id: 'futurenow', name: '1기', code: 'RSTUV', status: 'active', max_members: 10, expires_at: null, ...over,
  });

  it('status→archived(마감) 반영, payload·filter 정확', async () => {
    const { ctx, calls } = ctxWith({
      authUser: { id: 'c1' },
      tableResolver: (c) =>
        c.table === 'users' ? { data: userRow('c1', 'coach'), error: null } : { data: updatedRow({ status: 'archived' }), error: null },
    });
    const cohort = await ctx.updateCohort('co1', { status: 'archived' });
    expect(cohort.status).toBe('archived');
    const up = calls.find((c) => c.table === 'cohorts' && c.op === 'update');
    expect(up?.payload).toEqual({ status: 'archived' });
    expect(up?.filters).toEqual({ id: 'co1' });
  });

  it('maxMembers 수정 → max_members 매핑', async () => {
    const { ctx, calls } = ctxWith({
      authUser: { id: 'c1' },
      tableResolver: (c) =>
        c.table === 'users' ? { data: userRow('c1', 'coach'), error: null } : { data: updatedRow({ max_members: 25 }), error: null },
    });
    const cohort = await ctx.updateCohort('co1', { maxMembers: 25 });
    expect(cohort.maxMembers).toBe(25);
    expect(calls.find((c) => c.table === 'cohorts' && c.op === 'update')?.payload).toEqual({ max_members: 25 });
  });

  it('빈 patch → CoreError, UPDATE 시도 없음', async () => {
    const { ctx, calls } = ctxWith({ authUser: { id: 'c1' }, tableResolver: () => ({ data: userRow('c1', 'coach'), error: null }) });
    await expect(ctx.updateCohort('co1', {})).rejects.toThrowError(/수정할 필드 없음/);
    expect(calls.some((c) => c.table === 'cohorts' && c.op === 'update')).toBe(false);
  });

  it('비코치는 CoreForbiddenError, UPDATE 시도 없음', async () => {
    const { ctx, calls } = ctxWith({ authUser: { id: 'u1' }, tableResolver: () => ({ data: userRow('u1', 'user'), error: null }) });
    await expect(ctx.updateCohort('co1', { status: 'archived' })).rejects.toBeInstanceOf(CoreForbiddenError);
    expect(calls.some((c) => c.table === 'cohorts' && c.op === 'update')).toBe(false);
  });

  it('행 0(미존재/RLS 차단) → CoreNotFoundError', async () => {
    const { ctx } = ctxWith({
      authUser: { id: 'c1' },
      tableResolver: (c) => (c.table === 'users' ? { data: userRow('c1', 'coach'), error: null } : { data: null, error: null }),
    });
    await expect(ctx.updateCohort('coX', { status: 'archived' })).rejects.toBeInstanceOf(CoreNotFoundError);
  });
});

describe('본부 멤버 역할 (listUsers / setUserRole)', () => {
  it('listUsers 는 users 전체를 MemberSummary[] 로 매핑(이름 null 보존)', async () => {
    const { ctx } = ctxWith({
      authUser: { id: 'a1' },
      tableResolver: (c) =>
        c.table === 'users'
          ? {
              data: [
                { id: 'a1', email: 'a@t.test', name: '운영', role: 'admin' },
                { id: 'u1', email: 'u@t.test', name: null, role: 'user' },
              ],
              error: null,
            }
          : { data: null, error: null },
    });
    const list = await ctx.listUsers();
    expect(list).toHaveLength(2);
    // **회원 상태와 슈퍼어드민 표시가 더해졌다**(5-3) — 둘 다 **서버가 산출**한다.
    //   목 RPC 가 없으니 상태는 `pending` 으로 접히고 슈퍼어드민은 `false` 다 —
    //   **그 접힘 자체가 규율이다**: 한 사람을 못 읽어도 목록 전체가 무너지지 않는다.
    expect(list[1]).toEqual({
      id: 'u1', email: 'u@t.test', name: null, role: 'user',
      memberState: 'pending', isSuperAdmin: false,
    });
  });

  it('**한 사람의 상태를 못 읽어도 목록이 무너지지 않는다** — 대조군', async () => {
    const { ctx } = ctxWith({
      authUser: { id: 'a1' },
      tableResolver: (c) =>
        c.table === 'users'
          ? { data: [{ id: 'u1', email: 'u@t.test', name: null, role: 'user' }], error: null }
          : { data: null, error: null },
      rpcResolver: (name) => (name === 'member_state'
        ? { data: null, error: { message: 'boom' } }
        : { data: null, error: null }),
    });
    const list = await ctx.listUsers();
    expect(list).toHaveLength(1);
    expect(list[0].memberState, '못 읽으면 pending 으로 접는다 — 던지지 않는다').toBe('pending');
  });

  it('setUserRole 은 RPC set_user_role 에 매핑 전달', async () => {
    const { ctx, rpcCalls } = ctxWith({ authUser: { id: 'a1' }, rpcResolver: () => ({ data: null, error: null }) });
    await ctx.setUserRole('u1', 'coach');
    expect(rpcCalls).toContainEqual({ name: 'set_user_role', args: { p_user_id: 'u1', p_role: 'coach' } });
  });

  it('setUserRole 은 RPC 오류(권한 등)를 CoreError 로 변환', async () => {
    const { ctx } = ctxWith({ authUser: { id: 'c1' }, rpcResolver: () => ({ data: null, error: { message: '권한이 없습니다' } }) });
    await expect(ctx.setUserRole('u1', 'coach')).rejects.toThrowError(/setUserRole/);
  });
});

describe('listMyCohorts (멤버 본인 회기 — my_cohorts RPC)', () => {
  it('RPC 결과를 MyCohortSummary[] 로 매핑(snake→camel)', async () => {
    const { ctx, rpcCalls } = ctxWith({
      authUser: { id: 'm1' },
      rpcResolver: (name) =>
        name === 'my_cohorts'
          ? {
              data: [
                { cohort_id: 'co1', name: '1기', coach_name: '김코치', status: 'active', pre_done: true, post_done: false, post_opened: false, open_session_no: 2, open_session_submitted: false, open_session_has_content: true, joined_at: '2026-06-01' },
              ],
              error: null,
            }
          : { data: null, error: null },
    });
    const list = await ctx.listMyCohorts();
    expect(list[0]).toEqual({
      cohortId: 'co1', name: '1기', coachName: '김코치', status: 'active', preDone: true, postDone: false, postOpened: false,
      openSessionNo: 2, openSessionSubmitted: false, openSessionHasContent: true, joinedAt: '2026-06-01',
    });
    expect(rpcCalls.some((c) => c.name === 'my_cohorts')).toBe(true);
  });

  it('빈 결과 → []', async () => {
    const { ctx } = ctxWith({ authUser: { id: 'm1' }, rpcResolver: () => ({ data: [], error: null }) });
    expect(await ctx.listMyCohorts()).toEqual([]);
  });

  it('RPC 오류 → CoreError', async () => {
    const { ctx } = ctxWith({ authUser: { id: 'm1' }, rpcResolver: () => ({ data: null, error: { message: 'boom' } }) });
    await expect(ctx.listMyCohorts()).rejects.toThrowError(/listMyCohorts/);
  });
});

describe('에러 정제 (raw PG 비노출 — enrollByCode·resolveMeta, 내부 로그 보존)', () => {
  it('resolveCohortByCode RPC 실패 → 일반 메시지(raw·RLS 힌트 비노출), 내부 로그 보존', async () => {
    const raw = 'permission denied for relation cohorts (RLS hint)';
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { ctx } = ctxWith({ authUser: { id: 'u1' }, rpcResolver: () => ({ data: null, error: { message: raw } }) });
    const err = (await ctx.resolveCohortByCode('RSTUV').catch((e) => e)) as Error;
    expect(err.message).toMatch(/회기 정보/); // 사용자 경로: 일반
    expect(err.message).not.toMatch(/permission denied|RLS|relation/); // raw 비노출
    expect(JSON.stringify(spy.mock.calls)).toMatch(/permission denied/); // 내부 로그엔 보존
    spy.mockRestore();
  });

  it('enrollByCode insert 실패 → 일반 메시지(raw·제약 비노출), 내부 로그 보존', async () => {
    const raw = 'duplicate key value violates unique constraint "enrollments_pkey"';
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { ctx } = ctxWith({
      authUser: { id: 'u1' },
      rpcResolver: (name) =>
        name === 'resolve_cohort_by_code'
          ? { data: [metaRow({ member_count: 0, max_members: 10 })], error: null }
          : { data: null, error: null },
      tableResolver: (c) => {
        if (c.table === 'users') return { data: userRow('u1', 'user'), error: null };
        if (c.table === 'enrollments' && c.op === 'insert') return { data: null, error: { message: raw } };
        return { data: null, error: null }; // enrollments select(maybeSingle) → 미가입
      },
    });
    const err = (await ctx.enrollByCode('RSTUV').catch((e) => e)) as Error;
    expect(err.message).toMatch(/가입 처리 중 문제/);
    expect(err.message).not.toMatch(/duplicate key|constraint|enrollments_pkey/);
    expect(JSON.stringify(spy.mock.calls)).toMatch(/duplicate key/);
    spy.mockRestore();
  });
});

describe('setName (본인 표시 이름 — users.name, role 미포함)', () => {
  it('users.name 만 update, 본인 행(id=auth.uid()), role 미포함', async () => {
    const { ctx, calls } = ctxWith({
      authUser: { id: 'u1' },
      tableResolver: (c) =>
        c.table === 'users' && c.op === 'update' ? { data: null, error: null } : { data: userRow('u1', 'user'), error: null },
    });
    await ctx.setName('새이름');
    const up = calls.find((c) => c.table === 'users' && c.op === 'update');
    expect(up?.payload).toEqual({ name: '새이름' });
    expect(up?.filters).toEqual({ id: 'u1' });
    expect(JSON.stringify(up?.payload)).not.toMatch(/role/); // role 미포함(2.S2 봉쇄와 일관)
  });

  it('실패 → 일반 메시지(raw 비노출)·내부 로그 보존', async () => {
    const raw = 'permission denied for column "role"';
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { ctx } = ctxWith({
      authUser: { id: 'u1' },
      tableResolver: (c) =>
        c.table === 'users' && c.op === 'update' ? { data: null, error: { message: raw } } : { data: userRow('u1', 'user'), error: null },
    });
    const err = (await ctx.setName('x').catch((e) => e)) as Error;
    expect(err.message).toMatch(/이름을 저장하지 못/);
    expect(err.message).not.toMatch(/permission denied|column/);
    expect(JSON.stringify(spy.mock.calls)).toMatch(/permission denied/);
    spy.mockRestore();
  });
});

describe('★ 동행 피드 — 내가 마지막으로 쓴 날 (ADR-180)', () => {
  it('RPC 이름과 인자 이름이 **정본과 같다** — 지어낸 이름을 부르면 셋 다 초록인 채로 배포된다', async () => {
    // 5차 사고: 없는 함수 이름을 불렀는데 롤백·통합·회귀가 전부 초록이었다(같은 가짜 이름을 셋이 불렀다).
    //   그래서 **이름과 인자를 값으로 박고**, 실물 존재는 마이그레이션 적용 때 카탈로그로 확인했다.
    const seen: { name: string; args: unknown }[] = [];
    const { ctx } = ctxWith({
      authUser: { id: 'u1', email: 'u1@t.test' },
      rpcResolver: (name, args) => {
        seen.push({ name, args });
        return { data: '2026-08-30T01:02:03.000Z', error: null };
      },
    });
    const got = await ctx.feedMyLastPostAt('c-1');
    expect(got).toBe('2026-08-30T01:02:03.000Z');
    expect(seen).toHaveLength(1);
    expect(seen[0].name, 'RPC 이름이 다르다').toBe('feed_my_last_post_at');
    expect(seen[0].args, '인자 이름이 다르다 — PostgREST 는 이름으로 찾는다').toEqual({ p_cohort_id: 'c-1' });
  });

  it('쓴 적이 없으면 `null` 이다 — 없는 것과 0을 섞지 않는다', async () => {
    const { ctx } = ctxWith({ authUser: { id: 'u1', email: 'u1@t.test' }, rpcResolver: () => ({ data: null, error: null }) });
    expect(await ctx.feedMyLastPostAt('c-1')).toBeNull();
  });

  it('실패를 삼키지 않는다 — 이웃과 같은 모양', async () => {
    const { ctx } = ctxWith({ authUser: { id: 'u1', email: 'u1@t.test' }, rpcResolver: () => ({ data: null, error: { message: 'boom' } }) });
    await expect(ctx.feedMyLastPostAt('c-1')).rejects.toThrow(/boom/);
  });

  it('★ **회기 전체의 마지막 글과 다른 것**이다 — 둘을 섞지 않는다', () => {
    // `feed_my_cohorts.last_post_at` 은 author 필터가 없다(정본 확인) = 누구든 쓴 마지막 글.
    //   새 함수는 `author_id = auth.uid()` 가 있다 = 내가 쓴 마지막 글. 이름이 비슷해 섞이기 쉽다.
    const sql = readFileSync('supabase/migrations/20260904100000_feed_my_last_post.sql', 'utf8');
    expect(sql, '자기 것만 낸다는 조건이 없다').toContain('author_id = auth.uid()');
    expect(sql, '삭제한 글을 센다').toContain('deleted_at IS NULL');
    expect(sql, '열람 자격을 안 본다').toContain('feed_can_access');
    // `revoke ... from PUBLIC` 은 anon 을 지우지 않는다 — 그래서 anon 을 따로 적어야 한다.
    expect(sql, 'anon 을 따로 회수하지 않았다').toMatch(/FROM PUBLIC, anon/);
    expect(sql, '사용자를 인자로 받는다 — 남의 활동을 물어보는 문이 생긴다').not.toMatch(/p_user_id|p_uid/);
  });
});
