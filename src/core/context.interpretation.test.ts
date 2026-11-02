import { describe, expect, it } from 'vitest';
import { createCoreContext } from './context';
import { CoreError } from './errors';
import { makeMockSupabase } from './__testhelpers__/mockSupabase';

// 반환 행에 따른 코어의 성공 판정만 검증한다. 권한별 빈 응답은 모의값이며 실DB RLS 검사가 아니다.
const methods = ['setCoachInterpretation', 'clearCoachInterpretation'] as const;
type Method = typeof methods[number];
const content = { headline: '인도자가 다듬은 문구' };

function fixture(result: { data: unknown; error: unknown }, role = 'coach') {
  const mock = makeMockSupabase({
    authUser: { id: 'actor' },
    tableResolver: (call) => {
      if (call.table === 'users') return { data: { id: 'actor', role, name: '테스트 사용자' }, error: null };
      if (call.table === 'report_interpretations' && call.op === 'update'
        && call.filters.response_id === 'response-1' && call.selection === 'response_id') return result;
      return { data: null, error: null };
    },
  });
  return { ctx: createCoreContext(mock.sb), calls: mock.calls };
}

function mutate(ctx: ReturnType<typeof createCoreContext>, method: Method) {
  return method === 'setCoachInterpretation'
    ? ctx.setCoachInterpretation('response-1', content)
    : ctx.clearCoachInterpretation('response-1');
}

describe.each(methods)('%s 실제 수정 행 확인 (ADR-206)', (method) => {
  it('해당 response_id 한 행을 반환해야 성공하며 Promise<void>를 유지한다', async () => {
    const { ctx, calls } = fixture({ data: [{ response_id: 'response-1' }], error: null });
    await expect(mutate(ctx, method)).resolves.toBeUndefined();
    const update = calls.find((call) => call.table === 'report_interpretations');
    expect(update).toMatchObject({ op: 'update', filters: { response_id: 'response-1' }, selection: 'response_id' });
    if (method === 'setCoachInterpretation') {
      expect(update?.payload).toEqual({ coach_content: content, edited_by: 'actor', edited_at: expect.any(String) });
    } else {
      expect(update?.payload).toEqual({ coach_content: null, edited_by: null, edited_at: null });
    }
  });

  it.each([[], null])('대상 부재로 data=%j가 오면 error가 없어도 실패한다', async (data) => {
    const { ctx } = fixture({ data, error: null });
    await expect(mutate(ctx, method)).rejects.toBeInstanceOf(CoreError);
  });

  it.each(['user', 'coach'])('%s 권한 거부를 0행으로 모의하면 성공으로 처리하지 않는다', async (role) => {
    // user 또는 타 회기 coach에 대해 RLS가 보이지 않는 행을 반환한 경우를 모의한다.
    const { ctx, calls } = fixture({ data: [], error: null }, role);
    await expect(mutate(ctx, method)).rejects.toBeInstanceOf(CoreError);
    expect(calls.find((call) => call.table === 'report_interpretations')?.selection).toBe('response_id');
  });

  it('DB 오류가 있으면 원래 실패 원인을 보존한다', async () => {
    const { ctx } = fixture({ data: null, error: { message: 'permission denied' } });
    await expect(mutate(ctx, method)).rejects.toThrow(`${method} 실패: permission denied`);
  });
});
