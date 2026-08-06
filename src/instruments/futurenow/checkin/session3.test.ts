import { describe, expect, it } from 'vitest';
import { getCheckinSession } from './index';
import { CHECKIN_SESSION_3 } from './session3';
import { buildCheckinRead, type ReadBlock, type ReadFlags } from './readModel';

const c = CHECKIN_SESSION_3;
const OPEN: ReadFlags = { stepPrivate: false, suggestionAnon: false, contactRequest: false };

// 3회차 신규 7키 + 공통 키.
const ANSWERS_3 = {
  gap_area: '관계',
  gap_want: '아버지와 다시 대화하기',
  stuck_named: '거절당할까 봐 먼저 연락하지 못하는 것',
  habit_stop: '자기 전 휴대폰 보기',
  habit_start: '자기 전 책 두 쪽 읽기',
  identity_gap: '사람을 세운다면서 정작 집에서는 말을 아낀다',
  speech_habit: '바빠서요',
  mood: ['뜨끔함', '해볼 만함'],
  mood_custom: '조금 부끄러움',
  last_step_result: '조금 했습니다',
  last_step_note: '이틀 하고 멈췄다',
  step_what: '저녁에 아버지께 전화',
  step_when: '수요일 저녁, 퇴근길에',
  step_blocker: '야근이 늦게 끝나는 날',
  confidence: 6,
  need: '자리를 앞쪽으로 주세요',
  suggestion: '쉬는 시간이 조금 더 길었으면',
  self_note: '오늘 도망가지 않았다',
};

function flatten(blocks: ReadBlock[]): ReadBlock[] {
  return blocks.flatMap((b) => (b.kind === 'group' ? [b, ...flatten(b.blocks)] : [b]));
}
function texts(blocks: ReadBlock[]): string[] {
  return flatten(blocks).flatMap((b) => {
    if (b.kind === 'text') return [b.value];
    if (b.kind === 'pair') return [b.fromValue, b.toValue];
    if (b.kind === 'list') return b.values;
    if (b.kind === 'scale') return [String(b.value)];
    if (b.kind === 'flag' || b.kind === 'hidden') return [b.label];
    if (b.kind === 'note') return [b.text];
    return [];
  });
}

describe('3회차 등록·구조', () => {
  it('레지스트리에 등록됐고 4회차는 아직 없다', () => {
    expect(getCheckinSession(3)).toBe(c);
    expect(getCheckinSession(4)).toBeNull();
  });

  it('정체성 문장 슬롯이 없다 — 3회차에는 그 문항이 없다', () => {
    expect(c.today).not.toHaveProperty('identity');
    expect(c.today.order).not.toContain('identity');
  });

  it('표지 부제를 쪼갠 두 묶음 이름이 이정표로 쓰인다', () => {
    expect(c.cover.subtitle).toBe('현재를 직면하고, 습관을 다시 짜다');
    expect(c.today.areaPick.group).toBe('현재를 직면하고');
    expect(c.today.question.group).toBe('현재를 직면하고');
    expect(c.today.pairText.group).toBe('습관을 다시 짜다');
  });

  it('습관 짝에 connector 가 있다(1회차 갈망 쌍에는 없다)', () => {
    expect(c.today.pairText.connector).toBe('↓ 그 자리에');
  });
});

describe('필수 6칸 — 짝은 둘 다 채워야 한 칸', () => {
  it('전부 채우면 6', () => {
    expect(c.filledCount(ANSWERS_3)).toBe(6);
    expect(c.requiredTotal).toBe(6);
  });

  it('영역 칩만 고르고 문장을 비우면 미충족', () => {
    expect(c.filledCount({ ...ANSWERS_3, gap_want: '' })).toBe(5);
  });

  it('없앨 것만 적고 들일 것을 비우면 미충족 — 제거는 창조와 짝을 이룬다', () => {
    expect(c.filledCount({ ...ANSWERS_3, habit_start: '' })).toBe(5);
  });

  it('오늘의 질문·심화 두 칸·자신감은 세지 않는다', () => {
    const without = { ...ANSWERS_3 };
    for (const k of ['stuck_named', 'identity_gap', 'speech_habit', 'confidence', 'last_step_note']) {
      delete (without as Record<string, unknown>)[k];
    }
    expect(c.filledCount(without)).toBe(6);
  });
});

describe('문안 규율', () => {
  const allCopy = JSON.stringify(c);

  it('참여자 금지어 0건', () => {
    for (const w of ['설문', '진단', '지각', '미제출', '워크북']) expect(allCopy).not.toContain(w);
  });

  it("'함정' 0건 — 사람을 판정하는 낱말을 카드에 쓰지 않는다", () => {
    expect(allCopy).not.toContain('함정');
  });

  it('책 페이지 참조를 붙이지 않았다 — 미확정 참조는 넣지 않는다(ADR-88·89 정책)', () => {
    expect(allCopy).not.toMatch(/책 \d+/);
  });

  it('오늘의 질문에 선택 표기가 있다', () => {
    expect(c.today.question.badge).toBe('선택');
  });
});

describe('나눔 후보 열 — 나눌 수 있는 문장만(지휘부 확정 2026-08-03)', () => {
  it('세 열: 지금 가장 바라는 것 · 습관 바꾸기 · 입에 붙은 말', () => {
    expect(c.summaryFields).toEqual([
      { label: '지금 가장 바라는 것', key: 'gap_want' },
      { label: '습관 바꾸기', from: 'habit_stop', to: 'habit_start' },
      { label: '입에 붙은 말', key: 'speech_habit' },
    ]);
  });

  it('범주 낱말과 자기개시가 깊은 문항은 제외한다', () => {
    const keys = c.summaryFields.flatMap((f) => Object.values(f));
    for (const k of ['gap_area', 'stuck_named', 'identity_gap', 'self_note']) expect(keys).not.toContain(k);
  });
});

describe('되비추기 세 곳 — 전부 2회차를 읽는다', () => {
  it('① 영역 · 심화① 정체성 문장 · ⑤ 한 걸음', () => {
    expect(c.today.areaPick.mirror).toEqual({ label: '지난 시간에 가장 가슴이 뛴다고 고르신 영역', keys: ['future_area', 'future_line'] });
    expect(c.deepen.fields[0].mirror).toEqual({ label: '지난 시간에 쓰신 문장', keys: ['identity_statement'] });
    expect(c.step.lastStep.mirror.keys).toEqual(['step_what', 'step_when']);
  });
});

describe('readModel — 신규 7키가 본인·인도자 모두에게 나온다', () => {
  const NEW_KEYS = ['gap_area', 'gap_want', 'stuck_named', 'habit_stop', 'habit_start', 'identity_gap', 'speech_habit'] as const;

  for (const audience of ['self', 'facilitator'] as const) {
    it(`${audience}: 7키 전량`, () => {
      const t = texts(buildCheckinRead(3, ANSWERS_3, OPEN, audience));
      for (const k of NEW_KEYS) expect(t, k).toContain(ANSWERS_3[k]);
    });
  }

  it('열람 순서가 작성 순서와 같다 — 영역 → 오늘의 질문 → 습관 짝 → 마음', () => {
    const b = buildCheckinRead(3, ANSWERS_3, OPEN, 'self');
    const labels = b.flatMap((x) => ('label' in x ? [x.label] : []));
    const idx = (s: string) => labels.findIndex((l) => l === s);
    expect(idx(c.today.areaPick.label)).toBeLessThan(idx(c.today.question.label));
    expect(idx(c.today.question.label)).toBeLessThan(idx(c.today.pairText.label));
    expect(idx(c.today.pairText.label)).toBeLessThan(idx(c.today.mood.label));
  });

  it('습관 짝은 쌍으로 나온다', () => {
    const pair = buildCheckinRead(3, ANSWERS_3, OPEN, 'facilitator').find((x) => x.kind === 'pair');
    expect(pair?.kind === 'pair' && pair.fromValue).toBe(ANSWERS_3.habit_stop);
    expect(pair?.kind === 'pair' && pair.toValue).toBe(ANSWERS_3.habit_start);
  });

  it('비공개 토글을 켜면 인도자에게 ⑥ 블록 전체가 사라진다(ADR-86 정책 그대로)', () => {
    const b = buildCheckinRead(3, ANSWERS_3, { ...OPEN, stepPrivate: true }, 'facilitator');
    const t = texts(b);
    expect(t).not.toContain(ANSWERS_3.step_what);
    expect(t).not.toContain(ANSWERS_3.step_when);
    expect(t).not.toContain(ANSWERS_3.step_blocker);
    // ⑤ 결산과 자신감은 사정권 밖이라 남는다
    expect(t).toContain(ANSWERS_3.last_step_result);
    expect(t).toContain('6');
  });
});
