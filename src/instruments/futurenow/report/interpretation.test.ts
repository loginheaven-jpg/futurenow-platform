import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import type { CoreContext, InterpretationView } from '@/contracts';
import type { FuturenowScores } from '../scoring';
import {
  INTERPRETATION_SYSTEM_PROMPT, buildInterpretationInput, generateInterpretation,
  interpretationSystemPrompt, parseInterpretation, type InterpretationOptions,
} from './interpretation';

function scores(over: Partial<FuturenowScores> = {}): FuturenowScores {
  return {
    vitality: { score: 8, low: true },
    redFlag: { triggered: false, byVitality: false, byCareCheck: false },
    grow: { G: 3.5, R: 4, O: 2, W: 3, F: 4, faithAux: { F1: null, F2: null } },
    trap: { D1: 2, D2: 4, D3: 1, primary: 'D2' },
    compass: { NAV1: 4, NAV2: 2, NAV3: 3, NAV4: 5 },
    gap: { B1: 7, B2: 3, B3: 8, B4: 5, B5: 6 },
    faith: { F1: null, F2: null },
    subjective: { E1: '더 단단해지고 싶어요', E2: '', E3: '' },
    ...over,
  };
}

describe('buildInterpretationInput — scores를 labels 어휘로 변환', () => {
  it('사전 입력은 승인된 A21 한 줄 외에 기존 전체 문구를 보존한다', () => {
    const beforeA21 = '[삶의 간격] 일 7/10 · 재정 3/10 · 관계 8/10 · 건강 5/10 · 기여 6/10 (0~10)';
    const afterA21 = '[삶의 간격 · 현재 위치] 일 7/10 · 재정 3/10 · 관계 8/10 · 건강 5/10 · 기여 6/10 (0~10, 10 = 5년 후 완성된 모습. 점수가 낮을수록 남은 간격이 큽니다)';
    const input = buildInterpretationInput(scores());
    expect(input.split('\n').filter((line) => line.startsWith('[삶의 간격'))).toEqual([afterA21]);
    expect(buildInterpretationInput(scores(), { wave: 'pre' })).toBe(input);
    // 이 snapshot 은 ADR-206 코드 변경 전에 기존 함수의 실제 출력에서 채집했다.
    expect(input.replace(afterA21, beforeA21)).toMatchInlineSnapshot(`
      "다음은 한 참여자의 자기발견 체크 결과입니다. 위 규칙에 따라 인도자용 해석 초안을 JSON 으로 작성해 주세요.

      [활력] 8점 (구간: 시들음; 범위 5~25)
      [나침반 4축] 동기 4/5 · 기준 2/5 · 시선 3/5 · 리셋 5/5 (1~5, 우측이 바람직 방향)
      [준비도] 조감도 3.5/5 · 현실인식 4/5 · 원씽 2/5 · 피드백 3/5 · 정체성 4/5
      [삶의 간격] 일 7/10 · 재정 3/10 · 관계 8/10 · 건강 5/10 · 기여 6/10 (0~10)
      [돌봄 신호] 있음 — 돌봄 권장 · 개별 안부를 권합니다
      [참여자가 쓴 말]
      기대: 더 단단해지고 싶어요

      caution 키를 포함해, 점수·질문을 드러내지 말고 따뜻한 안부를 권하는 한 문장을 적어 주세요."
    `);
  });

  it('활력 구간명·축 라벨·점수를 포함(어휘 안에서만)', () => {
    const input = buildInterpretationInput(scores());
    expect(input).toContain('시들음'); // 활력 8 → 시들음 구간
    expect(input).toContain('동기'); // 나침반 라벨
    expect(input).toContain('원씽'); // GROW 라벨
    expect(input).toContain('재정'); // 간격 라벨
    expect(input).toContain('8점');
  });

  it('함정(D코드)·믿음(faith)·원응답 문항은 AI 입력에 없음(환각 방지·어휘 분리 ADR-77 §5.5)', () => {
    const input = buildInterpretationInput(scores());
    expect(input).not.toContain('D1');
    expect(input).not.toContain('D2');
    expect(input).not.toMatch(/믿음|신앙/);
    expect(input).not.toMatch(/관성|안주/); // 함정 라벨(TRAP_AXES) 미입력('준비'는 '준비도'와 충돌해 제외 — 관성·안주로 충분)
    expect(input).not.toContain('제자리걸음'); // 원응답 문항 원문(A2) 전량 미입력 — E1~E3 클립만 유지
  });

  it('돌봄 신호 없으면 caution 키 금지 안내, 있으면 포함 안내', () => {
    const calm = buildInterpretationInput(scores({ vitality: { score: 20, low: false } }));
    expect(calm).toContain('caution 키는 넣지 마세요');
    const care = buildInterpretationInput(scores({ redFlag: { triggered: true, byVitality: true, byCareCheck: false } }));
    expect(care).toContain('caution 키를 포함');
    expect(care).toContain('돌봄 신호] 있음');
  });

  it('주관식 원문 발췌 포함(라벨과 함께)', () => {
    const input = buildInterpretationInput(scores());
    expect(input).toContain('기대: 더 단단해지고 싶어요');
  });
});

describe('사전·마무리 비교 입력과 지침(ADR-206)', () => {
  const a17 = `[사전·마무리 비교가 주어졌을 때]
- 사전 대비 줄이 있으면, 지금의 상태보다 무엇이 움직였는지를 먼저 읽습니다. headline은 이동을 중심으로 적습니다.
- 척도의 방향 표기(어느 쪽이 바람직한지, 점수가 낮을수록 간격이 큰지)는 읽기를 돕는 정보입니다. 사람의 우열이나 세미나의 성공·실패를 판정하는 근거로 쓰지 않습니다.
- 내려간 점수와 커진 간격을 후퇴로 단정하지 않습니다. 그 이유는 참여자가 쓴 말에 근거가 있을 때만 적고, 근거가 없으면 인도자가 대화로 확인할 변화로 남깁니다.
- 거의 움직이지 않은 지표도 실패로 읽지 않습니다.
- 한 사람의 두 시점 차이를 세미나의 효과나 다른 참여자의 변화로 넓히지 않습니다.
- 돌봄 신호는 지금 점수의 신호만 따릅니다. 사전에만 있던 신호로 caution을 쓰지 않습니다.`;

  it('기본 시스템 프롬프트의 기존 바이트를 보존한다', () => {
    expect(createHash('sha256').update(INTERPRETATION_SYSTEM_PROMPT, 'utf8').digest('hex'))
      .toBe('159813336be97dfce5cb8f4007792e561ed6ac49e71569c72b1deaa3bf4869cb');
  });

  it('paired post 에만 승인 A17 여섯 규칙을 [구조] 바로 앞에 정확히 삽입한다', () => {
    const prompt = interpretationSystemPrompt({ wave: 'post', prev: scores() });
    expect(prompt).toBe(INTERPRETATION_SYSTEM_PROMPT.replace('[구조]', `${a17}\n\n[구조]`));
    expect(prompt.split('[사전·마무리 비교가 주어졌을 때]')).toHaveLength(2);
    expect(prompt.indexOf(a17)).toBeLessThan(prompt.indexOf('[구조]'));
  });

  const noComparison: { label: string; opts?: InterpretationOptions }[] = [
    { label: '기존 호출' },
    { label: '사전', opts: { wave: 'pre' } },
    { label: '무짝 사후', opts: { wave: 'post' } },
    { label: '이전 점수만 전달', opts: { prev: scores() } },
    { label: '사전에 이전 점수 전달', opts: { wave: 'pre', prev: scores() } },
    { label: '단발에 이전 점수 전달', opts: { wave: null, prev: scores() } },
  ];
  it.each(noComparison)('$label 에는 비교 지침과 비교 수치를 붙이지 않는다', ({ opts }) => {
    expect(interpretationSystemPrompt(opts)).toBe(INTERPRETATION_SYSTEM_PROMPT);
    expect(buildInterpretationInput(scores(), opts)).not.toContain('[사전대비]');
    expect(buildInterpretationInput(scores(), opts)).not.toContain('비교 해석에서 점수 변화의 이유는');
  });

  it.each([
    { label: '현재 돌봄 있음', current: scores() },
    { label: '현재 돌봄 없음', current: scores({ vitality: { score: 20, low: false } }) },
  ])('paired post 의 마지막에만 근거 지시를 정확히 더한다 — $label', ({ current }) => {
    const reminder = '비교 해석에서 점수 변화의 이유는 참여자가 쓴 말에 직접 근거가 있을 때만 적어 주세요. 근거가 없으면 “~일 수 있습니다” 같은 가능성 표현으로도 이유를 추정하지 말고, 관찰된 변화와 인도자가 대화로 확인할 점만 적어 주세요. 이 원칙은 headline·axes·growth 모두에 적용합니다.';
    const input = buildInterpretationInput(current, { wave: 'post', prev: scores() });
    const lines = input.split('\n');
    expect(lines.at(-1)).toBe(reminder);
    expect(lines.at(-2)).toBe('');
    expect(lines.at(-3)).toMatch(/^caution 키/);
    expect(input.split(reminder)).toHaveLength(2);
  });

  it('활력·나침반4·준비도5·간격5의 두 시점과 남은 간격의 반대 방향을 그대로 전달한다', () => {
    const before = scores({
      vitality: { score: 20, low: false },
      compass: { NAV1: 4, NAV2: 4, NAV3: 3, NAV4: 5 },
      grow: { G: 4.5, R: 4, O: 3, W: 2, F: 5, faithAux: { F1: null, F2: null } },
      gap: { B1: 8, B2: 1, B3: 7, B4: 6, B5: 4 },
    });
    const current = scores({
      compass: { NAV1: 2, NAV2: 3, NAV3: 3, NAV4: 4 },
      gap: { B1: 3, B2: 5, B3: 7, B4: 4, B5: 6 },
    });
    const input = buildInterpretationInput(current, { wave: 'post', prev: before });
    const lines = input.split('\n');
    const comparisonAt = lines.indexOf('[사전대비]');
    expect(lines.slice(comparisonAt, comparisonAt + 6)).toEqual([
      '[사전대비]',
      '활력: 20 → 8점',
      '나침반 4축: 동기 4 → 2 · 기준 4 → 3 · 시선 3 → 3 · 리셋 5 → 4 (1~5)',
      '준비도: 조감도 4.5 → 3.5 · 현실인식 4 → 4 · 원씽 3 → 2 · 피드백 2 → 3 · 정체성 5 → 4 (1~5)',
      '삶의 간격: 일 사전 8 → 지금 3 (남은 간격 2 → 7) · 재정 사전 1 → 지금 5 (남은 간격 9 → 5) · 관계 사전 7 → 지금 7 (남은 간격 3 → 3) · 건강 사전 6 → 지금 4 (남은 간격 4 → 6) · 기여 사전 4 → 지금 6 (남은 간격 6 → 4) (현재 위치 0~10)',
      '돌봄 신호: 사전 없음 · 지금 있음',
    ]);
    expect(input).not.toMatch(/후퇴|실패|효과/);
  });

  it('사전에만 돌봄이 있으면 그 사실은 비교하되 현재 caution 을 요구하지 않는다', () => {
    const current = scores({ vitality: { score: 20, low: false } });
    const input = buildInterpretationInput(current, { wave: 'post', prev: scores() });
    expect(input).toContain('[돌봄 신호] 없음');
    expect(input).toContain('돌봄 신호: 사전 있음 · 지금 없음');
    expect(input).toContain('caution 키는 넣지 마세요(돌봄 신호 없음).');
    expect(input).not.toContain('caution 키를 포함해');
  });

  it('현재 돌봄 체크는 사전 신호·활력 구간과 무관하게 현재 caution 의 근거가 된다', () => {
    const before = scores({ vitality: { score: 20, low: false } });
    const current = scores({
      vitality: { score: 20, low: false },
      redFlag: { triggered: true, byVitality: false, byCareCheck: true },
    });
    const input = buildInterpretationInput(current, { wave: 'post', prev: before });
    expect(input).toContain('[돌봄 신호] 있음 — 돌봄 권장 · 1:1 코칭을 요청했습니다');
    expect(input).toContain('돌봄 신호: 사전 없음 · 지금 있음');
    expect(input).toContain('caution 키를 포함해');
  });

  it('무짝 사후도 A21과 사후 E 라벨을 쓰고 기존 200자 발췌 규칙을 유지한다', () => {
    const input = buildInterpretationInput(scores({
      subjective: { E1: '가'.repeat(201), E2: '실천을 시작했다', E3: '다음 행동을 이어 간다' },
    }), { wave: 'post' });
    expect(input).toContain('[삶의 간격 · 현재 위치]');
    expect(input).toContain('10 = 5년 후 완성된 모습. 점수가 낮을수록 남은 간격이 큽니다');
    expect(input).toContain(`그 바람은 지금: ${'가'.repeat(200)}…`);
    expect(input).not.toContain('가'.repeat(201));
    expect(input).toContain('달라진 것 하나: 실천을 시작했다');
    expect(input).toContain('붙잡을 하나: 다음 행동을 이어 간다');
    expect(input).not.toMatch(/기대:|정서:|요청:/);
    expect(input).not.toContain('[사전대비]');
  });

  it('무짝 사후 입력은 비교 전용 근거 지시를 더하기 전과 그대로다', () => {
    // 실제 생성 결함에 대한 보완 전에 무짝 경로의 전체 출력을 고정한다.
    expect(buildInterpretationInput(scores(), { wave: 'post' })).toMatchInlineSnapshot(`
      "다음은 한 참여자의 자기발견 체크 결과입니다. 위 규칙에 따라 인도자용 해석 초안을 JSON 으로 작성해 주세요.

      [활력] 8점 (구간: 시들음; 범위 5~25)
      [나침반 4축] 동기 4/5 · 기준 2/5 · 시선 3/5 · 리셋 5/5 (1~5, 우측이 바람직 방향)
      [준비도] 조감도 3.5/5 · 현실인식 4/5 · 원씽 2/5 · 피드백 3/5 · 정체성 4/5
      [삶의 간격 · 현재 위치] 일 7/10 · 재정 3/10 · 관계 8/10 · 건강 5/10 · 기여 6/10 (0~10, 10 = 5년 후 완성된 모습. 점수가 낮을수록 남은 간격이 큽니다)
      [돌봄 신호] 있음 — 돌봄 권장 · 개별 안부를 권합니다
      [참여자가 쓴 말]
      그 바람은 지금: 더 단단해지고 싶어요

      caution 키를 포함해, 점수·질문을 드러내지 말고 따뜻한 안부를 권하는 한 문장을 적어 주세요."
    `);
  });

  it('두 시점의 REC·REC_OK 나 그 밖의 필드를 펼쳐서 AI 에 보내지 않는다', () => {
    const current = { ...scores(), REC: '추천 원문 제외', REC_OK: true, name: '실명 제외' };
    const before = { ...scores(), REC: '이전 추천 원문 제외', REC_OK: true };
    const input = buildInterpretationInput(current, { wave: 'post', prev: before });
    expect(input).not.toMatch(/REC|추천 원문 제외|실명 제외/);
    expect(input).not.toMatch(/D1|D2|D3|F1|F2/);
  });
});

describe('역할명 어휘 회귀 방지 — 화면·AI 어휘는 "인도자"(코치 아님)', () => {
  it('시스템 프롬프트에 역할명 "코치"가 없다', () => {
    expect(INTERPRETATION_SYSTEM_PROMPT).not.toContain('코치');
  });

  it('유저 프롬프트에도 역할명 "코치"가 없다(70행 유래 — AI 출력 오염원)', () => {
    // 유저 프롬프트는 buildInterpretationInput(scores)가 생성. 되돌아가면 AI 초안이 '코치님'을 쓴다.
    expect(buildInterpretationInput(scores())).not.toContain('코치');
  });
});

describe('generateInterpretation — 기존 해석을 보존하고 새 입력만 생성한다', () => {
  const content = { headline: '합성 해석', axes: [{ name: '동기', reading: '방향을 살핀다' }], growth: '다음 대화를 이어 간다' };
  const view: InterpretationView = {
    responseId: 'response', aiContent: content, aiModel: 'qa-model', coachContent: null,
    editedBy: null, editedAt: null, effective: content,
  };
  const context = (existing: InterpretationView | null = null) => {
    const getInterpretation = vi.fn().mockResolvedValue(existing);
    const aiChat = vi.fn().mockResolvedValue({
      content: JSON.stringify(content), model: 'qa-model', provider: 'qa', usage: { inputTokens: 1, outputTokens: 1 },
    });
    const saveInterpretation = vi.fn().mockResolvedValue(view);
    return {
      ctx: { getInterpretation, aiChat, saveInterpretation } as unknown as CoreContext,
      getInterpretation, aiChat, saveInterpretation,
    };
  };

  it('기존 해석은 비교 옵션이 있어도 그대로 반환하고 AI·저장을 호출하지 않는다', async () => {
    const existing: InterpretationView = { ...view, coachContent: { ...content, headline: '인도자 수정본' }, editedBy: 'coach' };
    const { ctx, getInterpretation, aiChat, saveInterpretation } = context(existing);
    expect(await generateInterpretation(ctx, 'response', scores(), 'cohort', { wave: 'post', prev: scores() })).toBe(existing);
    expect(getInterpretation).toHaveBeenCalledExactlyOnceWith('response');
    expect(aiChat).not.toHaveBeenCalled();
    expect(saveInterpretation).not.toHaveBeenCalled();
  });

  it('새 paired post 는 같은 opts 의 비교 프롬프트·입력으로 요청하고 파싱한 결과를 저장한다', async () => {
    const { ctx, aiChat, saveInterpretation } = context();
    const current = scores();
    const opts: InterpretationOptions = { wave: 'post', prev: scores({ vitality: { score: 20, low: false } }) };
    expect(await generateInterpretation(ctx, 'response', current, 'cohort', opts)).toBe(view);
    expect(aiChat).toHaveBeenCalledExactlyOnceWith({
      systemPrompt: interpretationSystemPrompt(opts),
      messages: [{ role: 'user', content: buildInterpretationInput(current, opts) }],
      temperature: 0.4, caller: 'futurenow:report-interpretation', useCache: true,
    });
    expect(saveInterpretation).toHaveBeenCalledExactlyOnceWith({
      responseId: 'response', cohortId: 'cohort', aiContent: content, aiModel: 'qa-model',
    });
  });

  it('기존 네 인자 호출은 기본 프롬프트와 사전 입력을 유지한다', async () => {
    const { ctx, aiChat } = context();
    const current = scores();
    await generateInterpretation(ctx, 'response', current, null);
    expect(aiChat.mock.calls[0][0].systemPrompt).toBe(INTERPRETATION_SYSTEM_PROMPT);
    expect(aiChat.mock.calls[0][0].messages).toEqual([{ role: 'user', content: buildInterpretationInput(current) }]);
  });

  it('새 AI 응답 파싱이 실패하면 저장하지 않는다', async () => {
    const { ctx, aiChat, saveInterpretation } = context();
    aiChat.mockResolvedValueOnce({ content: 'JSON 형식이 아님', model: 'qa-model' });
    await expect(generateInterpretation(ctx, 'response', scores(), 'cohort', { wave: 'post', prev: scores() })).rejects.toThrow();
    expect(saveInterpretation).not.toHaveBeenCalled();
  });
});

describe('parseInterpretation — 방어적 파싱', () => {
  const valid = '{"headline":"전반적으로 차분한 인상이에요","axes":[{"name":"동기","reading":"접근 경향이 보입니다"}],"growth":"원씽을 좁히면 좋겠어요"}';

  it('정상 JSON 파싱', () => {
    const c = parseInterpretation(valid);
    expect(c.headline).toContain('차분');
    expect(c.axes[0].name).toBe('동기');
    expect(c.caution).toBeUndefined();
  });

  it('```json 코드펜스 감싸짐 strip', () => {
    const c = parseInterpretation('```json\n' + valid + '\n```');
    expect(c.headline).toContain('차분');
  });

  it('서두 텍스트가 붙어도 첫{~끝} 추출', () => {
    const c = parseInterpretation('네, 다음과 같습니다:\n' + valid);
    expect(c.axes).toHaveLength(1);
  });

  it('caution 포함 정상 파싱', () => {
    const c = parseInterpretation('{"headline":"h","axes":[],"caution":"가벼운 안부를 권합니다","growth":"g"}');
    expect(c.caution).toBe('가벼운 안부를 권합니다');
  });

  it('JSON 아님 → throw', () => {
    expect(() => parseInterpretation('해석을 생성할 수 없습니다')).toThrow();
  });

  it('필수 필드 누락(headline 없음) → throw', () => {
    expect(() => parseInterpretation('{"axes":[],"growth":"g"}')).toThrow();
  });
});
