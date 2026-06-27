// B① 응답 흐름 — ResponseFlowPlugin (데이터 선언만, 화면 렌더 없음). architecture §9.1·§9.2.
// 구조(코드·척도·required·polarity·블록·ordering·wave 분기)는 여기. 참여자 문구는 copy.ts(copydeck verbatim).
// 측정/강의 어휘 분리(§9.4): prompt 에 구인·STEP·강의 명명 없음(원문에 없음 — 유지).
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
import * as copy from './copy';

const INSTRUMENT_ID = 'futurenow';

const likertScale = (): LikertScale => ({
  kind: 'likert',
  points: 5,
  minLabel: copy.likertLabels.minLabel,
  maxLabel: copy.likertLabels.maxLabel,
  centerLabel: copy.likertCenterLabel, // copydeck '보통' (지금의 나·믿음의 자리 공용)
});
const numeric0to10 = (): NumericScale => ({ kind: 'numeric', min: 0, max: 10, input: 'slider', suffix: '점' });

const likert = (code: string, polarity: Polarity, required = true): Item => ({
  code,
  prompt: copy.itemPrompts[code],
  scale: likertScale(),
  required,
  polarity,
});
const nav = (code: string): Item => {
  const b = copy.bipolarLabels[code];
  const scale: BipolarScale = { kind: 'bipolar', points: 5, leftLabel: b.left, rightLabel: b.right };
  return { code, prompt: copy.itemPrompts[code], scale, required: true, polarity: 'neutral' };
};
const gapItem = (code: string): Item => ({
  code,
  prompt: copy.itemPrompts[code],
  scale: numeric0to10(),
  required: true,
  polarity: 'neutral',
});
const textItem = (code: string, prompt: string, required: boolean, placeholder?: string): Item => {
  const scale: TextScale = { kind: 'text', multiline: true, maxLen: 500 };
  if (placeholder) scale.placeholder = placeholder;
  return { code, prompt, scale, required, polarity: 'neutral' };
};
// 체크 문항: 진술문은 CheckScale.label 에 담는다(prompt 는 비움 — 진술 자체가 라벨).
const checkItem = (code: string, label: string): Item => {
  const scale: CheckScale = { kind: 'check', label };
  return { code, prompt: '', scale, required: false, polarity: 'neutral' };
};

function buildBlocks(wave: Wave): Block[] {
  const wk = copy.waveKey(wave);
  const ask = copy.askPrompts[wk];
  return [
    // 0. 들어가며 — 조감도 한 문장(INTRO). intro 서사·placeholder 는 wave별.
    {
      id: 'intro',
      kind: 'standard',
      title: '들어가며',
      intro: copy.introBlock[wk].intro,
      items: [textItem('INTRO', '', false, copy.introBlock[wk].placeholder)],
      ordering: { mode: 'fixed' },
    },
    // 1. 나의 나침반 — NAV1~4 (bipolar, fixed)
    {
      id: 'compass',
      kind: 'standard',
      title: '나의 나침반',
      intro: copy.blockIntros[wk].compass,
      items: [nav('NAV1'), nav('NAV2'), nav('NAV3'), nav('NAV4')],
      ordering: { mode: 'fixed' },
    },
    // 2. 지금의 나 — 5~21 (likert, constrained-shuffle: 첫 positive, 부정 2연속 금지)
    {
      id: 'now',
      kind: 'standard',
      title: '지금의 나',
      intro: copy.blockIntros[wk].now,
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
    // 3. 믿음의 자리 — F1·F2 (likert, fixed, optional). intro 공용.
    {
      id: 'faith',
      kind: 'standard',
      title: '믿음의 자리',
      intro: copy.faithIntro,
      optional: true,
      items: [likert('F1', 'positive', false), likert('F2', 'positive', false)],
      ordering: { mode: 'fixed' },
    },
    // 4. 다섯 영역의 간격 — B1~B5 (numeric, fixed).
    //    종료(post): 화면은 '오늘' 값만 수집한다. '5주 전' 값은 페어링된 사전 응답에서 가져와
    //    나란히 표시(별도 입력 아님) — 이는 B③ 리포트/비교뷰 사안이므로 여기선 수집 필드만 둔다.
    {
      id: 'gap',
      kind: 'standard',
      title: '다섯 영역의 간격',
      intro: copy.blockIntros[wk].gap,
      items: [gapItem('B1'), gapItem('B2'), gapItem('B3'), gapItem('B4'), gapItem('B5')],
      ordering: { mode: 'fixed' },
    },
    // 5. 나에게 묻는 시간 — E1~E3 + 돌봄 체크. prompt·label 은 wave별.
    {
      id: 'ask',
      kind: 'standard',
      title: '나에게 묻는 시간',
      intro: copy.blockIntros[wk].ask,
      items: [
        textItem('E1', ask.E1, true),
        textItem('E2', ask.E2, true),
        textItem('E3', ask.E3, false),
        checkItem('CARE', copy.careLabel[wk]),
      ],
      ordering: { mode: 'fixed' },
    },
    // 6. 마지막 한 걸음 — 다짐 체크. label 은 wave별.
    {
      id: 'commit',
      kind: 'standard',
      title: '마지막 한 걸음',
      items: [checkItem('COMMIT', copy.commitLabel[wk])],
      ordering: { mode: 'fixed' },
    },
  ];
}

export const futurenowFlow: ResponseFlowPlugin = {
  getSchema(wave: Wave): ResponseSchema {
    return { instrumentId: INSTRUMENT_ID, wave, blocks: buildBlocks(wave) };
  },
};
