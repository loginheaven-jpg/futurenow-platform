// S4 — 실제 생성 함수·짝 선택·채점을 연결하되 DB/AI 통로는 합성 경계로 대체한다.
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import type { Answers, InterpretationView, ResponseEnvelope, Wave } from '@/contracts';

const mocks = vi.hoisted(() => ({ createServerContext: vi.fn(), after: vi.fn() }));
vi.mock('@/core/supabase/server', () => ({ createServerContext: mocks.createServerContext }));
vi.mock('next/server', () => ({ after: mocks.after }));

import { finalizeResponse } from '@/app/(public)/join/actions';
import {
  clearCoachInterpretationAction,
  ensureInterpretationAction,
} from '@/app/coach/cohort/[cohortId]/report/[responseId]/actions';
import * as interpretation from '@/instruments/futurenow/report/interpretation';
import { futurenowScoring } from '@/instruments/futurenow/scoring';

const COHORT = 'cohort-qa';
const USER = 'member-qa';
const AI = { headline: '합성 AI 해석', axes: [{ name: '동기', reading: '합성 관찰' }], growth: '합성 성장 여지' };
const CLEAR_FAILURE = '되돌리기에 실패했어요. 잠시 후 다시 시도해 주세요.';
type Envelope = ResponseEnvelope<Answers, unknown>;
let response: Envelope;
let history: Envelope[];
let afterTasks: Array<() => Promise<void>>;

function envelope(id: string, wave: Wave, createdAt: string, nav = 3): Envelope {
  return {
    id, userId: USER, wave, createdAt, instrumentId: 'futurenow', cohortId: COHORT, subjectProfile: {},
    answers: {
      NAV1: nav, NAV2: 3, NAV3: 3, NAV4: 3,
      A1: 3, A2: 3, A3: 3, A4: 3, A5: 3,
      C1: 3, C2: 3, C3: 3, C4: 3, C5: 3, C6: 3, C7: 3, C8: 3, C9: 3,
      D1: 3, D2: 3, D3: 3, B1: 5, B2: 5, B3: 5, B4: 5, B5: 5,
      E1: `바람-${id}`, E2: '', E3: '', REC: 'AI 입력에 넣지 않을 추천 글', REC_OK: true,
    },
  };
}

function view(aiContent: unknown = AI, coachContent: unknown | null = null): InterpretationView {
  return {
    responseId: response.id, aiContent, aiModel: 'synthetic-model', coachContent,
    editedBy: coachContent ? 'coach-qa' : null, editedAt: coachContent ? '2026-11-02T00:00:00Z' : null,
    effective: coachContent ?? aiContent,
  };
}

function makeContext() {
  return {
    currentUser: vi.fn().mockResolvedValue({ id: 'coach-qa', role: 'coach' }),
    getResponse: vi.fn().mockImplementation(async () => response),
    listResponses: vi.fn().mockImplementation(async () => history),
    raiseAlert: vi.fn().mockResolvedValue(undefined),
    getInterpretation: vi.fn().mockResolvedValue(null),
    aiChat: vi.fn().mockResolvedValue({ content: JSON.stringify(AI), model: 'synthetic-model' }),
    saveInterpretation: vi.fn().mockImplementation(async ({ aiContent }: { aiContent: unknown }) => view(aiContent)),
    clearCoachInterpretation: vi.fn().mockResolvedValue(undefined),
  };
}
let ctx: ReturnType<typeof makeContext>;
let generate: MockInstance<typeof interpretation.generateInterpretation>;

beforeEach(() => {
  vi.clearAllMocks();
  response = envelope('post', 'post', '2026-11-02T00:00:00Z', 5);
  history = [];
  afterTasks = [];
  ctx = makeContext();
  mocks.createServerContext.mockResolvedValue(ctx);
  mocks.after.mockImplementation((task: () => Promise<void>) => { afterTasks.push(task); });
  generate = vi.spyOn(interpretation, 'generateInterpretation');
});
afterEach(() => vi.restoreAllMocks());

const entries = ['제출 뒤 after', '코치 지연 생성'] as const;
async function runEntry(entry: typeof entries[number]) {
  if (entry === '코치 지연 생성') return ensureInterpretationAction(response.id);
  const result = await finalizeResponse(response.id);
  // 참여자 완료 응답 전에 AI/짝 조회가 실행되지 않음을 함께 잠근다.
  expect(ctx.aiChat).not.toHaveBeenCalled();
  expect(ctx.listResponses).not.toHaveBeenCalled();
  expect(afterTasks).toHaveLength(1);
  await afterTasks[0]();
  return result;
}

describe.each(entries)('%s — 사전·사후 생성 연결', (entry) => {
  it('사전은 짝 조회 없이 기존 단독 입력으로 생성·저장한다', async () => {
    response = envelope('pre', 'pre', '2026-09-21T00:00:00Z');
    expect((await runEntry(entry)).ok).toBe(true);
    expect(ctx.listResponses).not.toHaveBeenCalled();
    expect(generate).toHaveBeenCalledExactlyOnceWith(
      ctx, response.id, futurenowScoring.score(response.answers, { wave: 'pre' }), COHORT,
      { wave: 'pre', prev: undefined },
    );
    expect(ctx.aiChat).toHaveBeenCalledTimes(1);
    expect(ctx.saveInterpretation).toHaveBeenCalledTimes(1);
    expect(ctx.aiChat.mock.calls[0][0].messages[0].content).not.toContain('AI 입력에 넣지 않을 추천 글');
  });

  it('사후는 전체 이력에서 사후 이전의 짝을 골라 채점해 전달한다', async () => {
    const paired = envelope('paired-pre', 'pre', '2026-09-21T00:00:00Z', 1);
    history = [
      envelope('later-pre', 'pre', '2026-11-03T00:00:00Z', 4),
      envelope('old-pre', 'pre', '2026-09-20T00:00:00Z', 2),
      paired,
    ];
    expect((await runEntry(entry)).ok).toBe(true);
    expect(ctx.listResponses).toHaveBeenCalledExactlyOnceWith({
      instrumentId: 'futurenow', cohortId: COHORT, userId: USER, wave: 'pre',
    });
    expect(generate).toHaveBeenCalledExactlyOnceWith(
      ctx, response.id, futurenowScoring.score(response.answers, { wave: 'post' }), COHORT,
      { wave: 'post', prev: futurenowScoring.score(paired.answers, { wave: 'pre' }) },
    );
    expect(ctx.aiChat).toHaveBeenCalledTimes(1);
    expect(ctx.saveInterpretation).toHaveBeenCalledTimes(1);
    const input = ctx.aiChat.mock.calls[0][0].messages[0].content;
    expect(input).toContain('동기 1 → 5');
    expect(input).toContain('바람-post');
    expect(input).not.toContain('바람-later-pre');
    expect(input).not.toContain('AI 입력에 넣지 않을 추천 글');
  });

  it('정상적인 짝 부재는 사후 단독 생성으로 처리한다', async () => {
    history = [envelope('only-later-pre', 'pre', '2026-11-03T00:00:00Z')];
    expect((await runEntry(entry)).ok).toBe(true);
    expect(generate.mock.calls[0][4]).toEqual({ wave: 'post', prev: undefined });
    expect(ctx.aiChat).toHaveBeenCalledTimes(1);
    expect(ctx.saveInterpretation).toHaveBeenCalledTimes(1);
    expect(ctx.aiChat.mock.calls[0][0].messages[0].content).not.toContain('바람-only-later-pre');
  });

  it('짝 조회 실패에는 생성 함수를 호출하거나 단독 결과를 저장하지 않는다', async () => {
    ctx.listResponses.mockRejectedValueOnce(new Error('PAIR_LOOKUP_UNAVAILABLE'));
    const result = await runEntry(entry);
    expect(result.ok).toBe(entry === '제출 뒤 after');
    if (entry === '코치 지연 생성') expect(result).toEqual({ ok: false, error: 'generation_failed' });
    expect(generate).not.toHaveBeenCalled();
    expect(ctx.aiChat).not.toHaveBeenCalled();
    expect(ctx.saveInterpretation).not.toHaveBeenCalled();
  });

  it('이미 저장된 해석은 생성 함수의 선반환을 유지한다', async () => {
    const existing = view();
    ctx.getInterpretation.mockResolvedValueOnce(existing);
    expect((await runEntry(entry)).ok).toBe(true);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(ctx.aiChat).not.toHaveBeenCalled();
    expect(ctx.saveInterpretation).not.toHaveBeenCalled();
  });
});

describe('코치 액션 권한과 최신 AI 원문 복원', () => {
  it.each([null, { id: USER, role: 'user' }])('지연 생성의 기존 역할 게이트를 유지한다: %j', async (user) => {
    ctx.currentUser.mockResolvedValueOnce(user);
    expect(await ensureInterpretationAction(response.id)).toEqual({ ok: false, error: 'forbidden' });
    expect(ctx.getResponse).not.toHaveBeenCalled();
    expect(ctx.listResponses).not.toHaveBeenCalled();
    expect(ctx.aiChat).not.toHaveBeenCalled();
  });

  it('오래 열린 화면의 이전 AI 대신 clear 후 서버의 최신 AI VM을 반환한다', async () => {
    const oldAI = { ...AI, headline: '화면에 남아 있던 이전 AI' };
    const newAI = { ...AI, headline: '서버에서 교체된 최신 AI' };
    const coached = { ...AI, headline: '인도자 수정본' };
    ctx.getInterpretation.mockResolvedValueOnce(view(oldAI, coached));
    const initial = await ensureInterpretationAction(response.id);
    expect(initial).toMatchObject({ ok: true, vm: { ai: oldAI, effective: coached, coachEdited: true } });

    ctx.getInterpretation.mockResolvedValueOnce(view(newAI));
    const restored = await clearCoachInterpretationAction(response.id);
    expect(ctx.clearCoachInterpretation).toHaveBeenCalledExactlyOnceWith(response.id);
    expect(ctx.getInterpretation.mock.invocationCallOrder[1]).toBeGreaterThan(ctx.clearCoachInterpretation.mock.invocationCallOrder[0]);
    expect(restored).toEqual({ ok: true, vm: { ai: newAI, effective: newAI, coachEdited: false } });
    expect(ctx.aiChat).not.toHaveBeenCalled();
    expect(ctx.saveInterpretation).not.toHaveBeenCalled();
  });

  it('clear가 0행 실패를 알리면 성공 VM을 반환하지 않는다', async () => {
    ctx.clearCoachInterpretation.mockRejectedValueOnce(new Error('interpretation_not_updated'));
    expect(await clearCoachInterpretationAction(response.id)).toEqual({ ok: false, error: CLEAR_FAILURE });
    expect(ctx.getInterpretation).not.toHaveBeenCalled();
  });

  it.each([
    ['없음', () => null],
    ['잘못된 AI', () => view({ headline: '필수 필드 누락' })],
    ['잘못된 유효문', () => ({ ...view(), effective: { axes: [] } })],
  ])('clear 후 재조회 결과가 %s이면 실패 메시지를 유지한다', async (_label, latest) => {
    ctx.getInterpretation.mockResolvedValueOnce(latest());
    expect(await clearCoachInterpretationAction(response.id)).toEqual({ ok: false, error: CLEAR_FAILURE });
    expect(ctx.clearCoachInterpretation).toHaveBeenCalledExactlyOnceWith(response.id);
  });

  it('clear 후 재조회 실패도 기존 실패 메시지로 처리한다', async () => {
    ctx.getInterpretation.mockRejectedValueOnce(new Error('REREAD_UNAVAILABLE'));
    expect(await clearCoachInterpretationAction(response.id)).toEqual({ ok: false, error: CLEAR_FAILURE });
  });
});
