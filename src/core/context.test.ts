import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createCoreContext, type CreateCoreContextOptions } from './context';
import { CoreAuthError, CoreForbiddenError, CoreNotFoundError, CoreValidationError } from './errors';
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

  it('raiseAlert 는 alerts 에 매핑해 insert', async () => {
    const { ctx, calls } = ctxWith({
      authUser: { id: 'u1' },
      tableResolver: () => ({ data: null, error: null }),
    });
    await ctx.raiseAlert({ responseId: 'r1', cohortId: 'co1', severity: 'red_flag', reason: '활력 위기신호' });
    const insert = calls.find((c) => c.table === 'alerts' && c.op === 'insert');
    expect(insert?.payload).toEqual({
      response_id: 'r1',
      cohort_id: 'co1',
      severity: 'red_flag',
      reason: '활력 위기신호',
    });
  });
});
