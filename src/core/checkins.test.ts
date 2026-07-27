// 회차 갈무리 코어 메서드 단위테스트(ADR-80). RLS 는 모킹으로 검증 불가 — 실 DB 격리는 별도(리포트 §RLS 실증).
// 여기서는 (1) 쓰기가 전량 RPC 경유인지, (2) saveMyCheckin 경계 zod, (3) 행 매핑을 검증한다.
import { describe, it, expect } from 'vitest';
import { createCoreContext } from './context';
import { makeMockSupabase, type MockOptions } from './__testhelpers__/mockSupabase';

function ctxWith(mock: MockOptions) {
  const { sb, calls, rpcCalls } = makeMockSupabase(mock);
  return { ctx: createCoreContext(sb), calls, rpcCalls };
}

const meRow = { id: 'u1', email: 'u1@t.test', name: 'u1', nickname: 'u1', role: 'user' };
const checkinRow = (over: Record<string, unknown> = {}) => ({
  id: 'ck1', cohort_id: 'co1', user_id: 'u1', session_no: 1, answers: { identity_sentence: '나는 사람이다' },
  step_private: false, share_consent: false, suggestion_anon: false, contact_request: false,
  prompted_at: null, prompt_count: 0, has_content: true, first_opened_at: null, deep_opened: false,
  submitted_at: null, edit_count: 0, updated_at: '2026-07-27T00:00:00Z', ...over,
});

describe('갈무리 쓰기는 전량 DEFINER RPC 경유(직접 테이블 write 금지 · D1)', () => {
  it('saveMyCheckin → checkin_save RPC, flags 는 boolean 만 통과', async () => {
    const { ctx, rpcCalls, calls } = ctxWith({ rpcResolver: () => ({ data: null, error: null }) });
    await ctx.saveMyCheckin({
      cohortId: 'co1', sessionNo: 1, answers: { identity_sentence: '나는 사람이다', mood: ['후련함'] },
      flags: { deepOpened: true, shareConsent: false },
    });
    expect(calls.filter((c) => c.op !== 'select')).toHaveLength(0); // 직접 INSERT/UPDATE 없음
    expect(rpcCalls[0].name).toBe('checkin_save');
    const args = rpcCalls[0].args as { p_cohort_id: string; p_session_no: number; p_flags: Record<string, boolean> };
    expect(args.p_cohort_id).toBe('co1');
    expect(args.p_flags).toEqual({ deepOpened: true, shareConsent: false });
  });

  it('submitMyCheckin → checkin_submit RPC', async () => {
    const { ctx, rpcCalls } = ctxWith({ rpcResolver: () => ({ data: null, error: null }) });
    await ctx.submitMyCheckin('co1', 1);
    expect(rpcCalls[0]).toEqual({ name: 'checkin_submit', args: { p_cohort_id: 'co1', p_session_no: 1 } });
  });

  it('markCheckinPrompted/Opened → checkin_mark 의 kind 구분', async () => {
    const { ctx, rpcCalls } = ctxWith({ rpcResolver: () => ({ data: null, error: null }) });
    await ctx.markCheckinPrompted('co1', 2);
    await ctx.markCheckinOpened('co1', 2);
    expect((rpcCalls[0].args as { p_kind: string }).p_kind).toBe('prompt');
    expect((rpcCalls[1].args as { p_kind: string }).p_kind).toBe('open');
  });

  it('seedCohortSessions → count 생략 시 p_count 미포함', async () => {
    const { ctx, rpcCalls } = ctxWith({ rpcResolver: () => ({ data: null, error: null }) });
    await ctx.seedCohortSessions('co1', '2026-08-01T10:00:00Z');
    expect(rpcCalls[0].args).toEqual({ p_cohort_id: 'co1', p_first_held: '2026-08-01T10:00:00Z' });
    await ctx.seedCohortSessions('co1', '2026-08-01T10:00:00Z', 7);
    expect((rpcCalls[1].args as { p_count?: number }).p_count).toBe(7);
  });

  it('RPC 오류는 CoreError 로 전파', async () => {
    const { ctx } = ctxWith({ rpcResolver: () => ({ data: null, error: { message: 'not a member of this cohort' } }) });
    await expect(ctx.saveMyCheckin({ cohortId: 'co1', sessionNo: 1, answers: {} })).rejects.toThrow(/saveMyCheckin/);
  });
});

describe('saveMyCheckin 경계 검증(CLAUDE §9 · S4) — 무제한 JSONB 차단, 인스트루먼트 어휘 무지', () => {
  it('문자열 상한(4000자) 초과 → 거부', async () => {
    const { ctx } = ctxWith({ rpcResolver: () => ({ data: null, error: null }) });
    await expect(
      ctx.saveMyCheckin({ cohortId: 'co1', sessionNo: 1, answers: { letter_line: 'x'.repeat(4001) } }),
    ).rejects.toThrow();
  });

  it('32KB 초과 직렬화 → 거부', async () => {
    const { ctx } = ctxWith({ rpcResolver: () => ({ data: null, error: null }) });
    const answers: Record<string, string> = {};
    for (let i = 0; i < 20; i++) answers[`k${i}`] = 'y'.repeat(1900); // 각 <2000, 합계 >32KB
    await expect(ctx.saveMyCheckin({ cohortId: 'co1', sessionNo: 1, answers })).rejects.toThrow(/너무 큽니다/);
  });

  it('허용 형태(문자열·짧은 배열·숫자·null)는 통과', async () => {
    const { ctx, rpcCalls } = ctxWith({ rpcResolver: () => ({ data: null, error: null }) });
    await ctx.saveMyCheckin({
      cohortId: 'co1', sessionNo: 1,
      answers: { identity_sentence: '한 문장', mood: ['후련함', '고마움'], confidence: 7, step_blocker: null },
    });
    expect(rpcCalls[0].name).toBe('checkin_save');
  });
});

describe('읽기 매핑', () => {
  it('getMyCheckin → snake→camel 매핑, 없으면 null', async () => {
    const found = ctxWith({
      authUser: { id: 'u1' },
      tableResolver: (c) => (c.table === 'users' ? { data: meRow, error: null } : { data: checkinRow(), error: null }),
    });
    const rec = await found.ctx.getMyCheckin('co1', 1);
    expect(rec?.hasContent).toBe(true);
    expect(rec?.sessionNo).toBe(1);
    expect(rec?.submittedAt).toBeNull();

    const none = ctxWith({
      authUser: { id: 'u1' },
      tableResolver: (c) => (c.table === 'users' ? { data: meRow, error: null } : { data: null, error: null }),
    });
    expect(await none.ctx.getMyCheckin('co1', 1)).toBeNull();
  });

  it('listCohortCheckins → 행 배열 매핑', async () => {
    const { ctx } = ctxWith({
      tableResolver: (c) => (c.table === 'checkins' ? { data: [checkinRow(), checkinRow({ id: 'ck2', user_id: 'u2' })], error: null } : { data: null, error: null }),
    });
    const list = await ctx.listCohortCheckins('co1', 1);
    expect(list).toHaveLength(2);
    expect(list[1].userId).toBe('u2');
  });
});
