// B① 응답 흐름 — ResponseFlowPlugin (데이터 선언만, 화면 렌더 없음). architecture §9.1·§9.2.
//
// ⚠️ 참여자 노출 문구(prompt·bipolar 라벨·intro·check 라벨)는 **placeholder** 다.
//    지휘부의 검증된 문항 원문으로 교체 대기(향후 copy.ts 로 분리 가능). **구조는 확정**:
//    코드·척도·required·polarity·블록·ordering·wave 분기.
// 측정/강의 어휘 분리(§9.4): prompt 에 구인명·'시들음'·'원씽' 등 노출 금지(placeholder 도 코드만).
import type {
  BipolarScale,
  Block,
  CheckScale,
  Item,
  LikertScale,
  NumericScale,
  Polarity,
  ResponseFlowPlugin,
  ResponseSchema,
  TextScale,
  Wave,
} from '@/contracts';

const INSTRUMENT_ID = 'futurenow';

// 문항 원문은 미확정 — 코드만 드러내는 placeholder(참여자에게 구인 노출 안 함).
const todoPrompt = (code: string) => `[문항 원문 대기 · ${code}]`;

const LIKERT5: LikertScale = {
  kind: 'likert',
  points: 5,
  minLabel: '전혀 그렇지 않다',
  maxLabel: '매우 그렇다',
};
const numeric0to10 = (): NumericScale => ({ kind: 'numeric', min: 0, max: 10, input: 'slider', suffix: '점' });
const bipolar5 = (code: string): BipolarScale => ({
  kind: 'bipolar',
  points: 5,
  leftLabel: `[좌 라벨 대기 · ${code}]`,
  rightLabel: `[우 라벨 대기 · ${code}]`,
});
const textScale = (multiline: boolean): TextScale => ({ kind: 'text', multiline, maxLen: 500 });
const checkScale = (code: string): CheckScale => ({ kind: 'check', label: `[체크 라벨 대기 · ${code}]` });

const likert = (code: string, polarity: Polarity, required = true): Item => ({
  code,
  prompt: todoPrompt(code),
  scale: LIKERT5,
  required,
  polarity,
});
const nav = (code: string): Item => ({
  code,
  prompt: todoPrompt(code),
  scale: bipolar5(code),
  required: true,
  polarity: 'neutral', // 양극 축 — 역채점 아님(우측 가점). 배열은 fixed 라 polarity 미사용
});
const gap = (code: string): Item => ({
  code,
  prompt: todoPrompt(code),
  scale: numeric0to10(),
  required: true,
  polarity: 'neutral',
});
const text = (code: string, required: boolean, multiline = true): Item => ({
  code,
  prompt: todoPrompt(code),
  scale: textScale(multiline),
  required,
  polarity: 'neutral',
});
const check = (code: string): Item => ({
  code,
  prompt: todoPrompt(code),
  scale: checkScale(code),
  required: false,
  polarity: 'neutral',
});

// wave 별로 intro 서사만 바뀐다(같은 코드·구인). 서사 원문은 placeholder.
function introFor(blockId: string, wave: Wave): string {
  const phase = wave === 'post' ? '종료' : '사전';
  return `[${blockId} ${phase} 서사 대기]`;
}

function buildBlocks(wave: Wave): Block[] {
  return [
    // 1. 들어가며 — 조감도 한 문장
    {
      id: 'intro',
      kind: 'standard',
      title: '들어가며',
      intro: introFor('들어가며', wave),
      items: [text('INTRO', false, false)],
      ordering: { mode: 'fixed' },
    },
    // 2. 나침반 — NAV1~4 (bipolar, fixed)
    {
      id: 'compass',
      kind: 'standard',
      title: '나침반',
      intro: introFor('나침반', wave),
      items: [nav('NAV1'), nav('NAV2'), nav('NAV3'), nav('NAV4')],
      ordering: { mode: 'fixed' },
    },
    // 3. 지금의 나 — 5~21 (likert, constrained-shuffle: 첫 positive, 부정 2연속 금지)
    {
      id: 'now',
      kind: 'standard',
      title: '지금의 나',
      intro: introFor('지금의 나', wave),
      items: [
        likert('A1', 'positive'),
        likert('C3', 'positive'),
        likert('A2', 'negative'),
        likert('C6', 'positive'),
        likert('D1', 'negative'),
        likert('C2', 'positive'),
        likert('A5', 'negative'),
        likert('C8', 'positive'),
        likert('C5', 'negative'),
        likert('A3', 'positive'),
        likert('D2', 'negative'),
        likert('C1', 'positive'),
        likert('A4', 'negative'),
        likert('C7', 'positive'),
        likert('D3', 'negative'),
        likert('C4', 'positive'),
        likert('C9', 'positive'),
      ],
      ordering: { mode: 'constrained-shuffle', firstPolarity: 'positive', maxConsecutiveSameNegative: 1 },
    },
    // 4. 믿음의 자리 — F1·F2 (likert, fixed, optional)
    {
      id: 'faith',
      kind: 'standard',
      title: '믿음의 자리',
      intro: introFor('믿음의 자리', wave),
      optional: true,
      items: [likert('F1', 'positive', false), likert('F2', 'positive', false)],
      ordering: { mode: 'fixed' },
    },
    // 5. 간격 — B1~B5 (numeric, fixed)
    {
      id: 'gap',
      kind: 'standard',
      title: '간격',
      intro: introFor('간격', wave),
      items: [gap('B1'), gap('B2'), gap('B3'), gap('B4'), gap('B5')],
      ordering: { mode: 'fixed' },
    },
    // 6. 나에게 묻는 시간 — E1~E3 + 돌봄 체크 (fixed)
    {
      id: 'ask',
      kind: 'standard',
      title: '나에게 묻는 시간',
      intro: introFor('나에게 묻는 시간', wave),
      items: [text('E1', true), text('E2', true), text('E3', false), check('CARE')],
      ordering: { mode: 'fixed' },
    },
    // 7. 마지막 한 걸음 — 다짐 체크 (fixed)
    {
      id: 'commit',
      kind: 'standard',
      title: '마지막 한 걸음',
      intro: introFor('마지막 한 걸음', wave),
      items: [check('COMMIT')],
      ordering: { mode: 'fixed' },
    },
  ];
}

export const futurenowFlow: ResponseFlowPlugin = {
  getSchema(wave: Wave): ResponseSchema {
    return { instrumentId: INSTRUMENT_ID, wave, blocks: buildBlocks(wave) };
  },
};
