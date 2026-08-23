import { describe, expect, it } from 'vitest';
import { CHECKIN_SESSION_1 } from './session1';
import { CHECKIN_SESSION_2 } from './session2';
import { CHECKIN_SESSION_3 } from './session3';
import { CHECKIN_SESSION_4 } from './session4';
import { buildCheckinRead, type ReadBlock, type ReadFlags } from './readModel';
import { neededBacks, resolveMirror, slotBoundaries } from './slots';

const c = CHECKIN_SESSION_4;
const OPEN: ReadFlags = { stepPrivate: false, suggestionAnon: false, contactRequest: false };

// 4회차 신규 7키 + 공통 키.
const ANSWERS_4 = {
  project_area: '일',
  project_name: '주 한 번씩 현업 선배 만나기',
  project_due: '10월 31일',
  domino_what: '매주 목요일 저녁 약속 하나 잡기',
  domino_effect: '이력서와 포트폴리오를 저절로 손보게 된다',
  parked: '영어 공부 다시 시작하기',
  onething: '나는 사람의 가능성을 알아보는 자리에서 가장 나답다',
  mood: ['선명함', '아쉬움'],
  mood_custom: '조금 후련하다',
  last_step_result: '조금 했습니다',
  last_step_note: '이틀 하고 멈췄다',
  step_what: '오늘 밤 선배에게 문자 보내기',
  step_when: '수요일 저녁, 퇴근길에',
  step_blocker: '야근이 늦게 끝나는 날',
  confidence: 6,
  need: '자리를 앞쪽으로 주세요',
  suggestion: '쉬는 시간이 조금 더 길었으면',
  self_note: '다 하려다 아무것도 못 했잖아. 이번엔 하나만 하자',
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

describe('4회차 등록·구조', () => {
  // 3회차는 areaPick → question → pairText → mood 였다. 4회차는 pairText 가 question 앞이다 —
  //   두 옮겨 적기(펼친 것 하나 · 고른 것 하나)가 붙어 있어야 묶음 경계가 화제 전환과 일치한다.
  it('1면 순서가 3회차와 다르다 — 옮겨 적기 둘이 붙어 있다', () => {
    expect(c.today.order).toEqual(['areaPick', 'pairText', 'question', 'mood']);
    expect(CHECKIN_SESSION_3.today.order).toEqual(['areaPick', 'question', 'pairText', 'mood']);
  });

  it('표지 부제를 쪼갠 두 묶음 이름이 이정표로 쓰인다', () => {
    expect(c.cover.subtitle).toBe('옵션을 펼치고, 하나를 선택하다');
    expect(c.today.areaPick.group).toBe('옵션을 펼치고');
    expect(c.today.pairText.group).toBe('하나를 선택하다');
    expect(c.today.question.group).toBe('하나를 선택하다');
    expect('group' in c.today.mood).toBe(false); // 회차 전체에 대한 물음이라 묶음 밖
  });

  it('묶음 경계 — 캡션만 · 선+캡션 · null · 선만', () => {
    const b = slotBoundaries(c);
    expect(b[0]).toEqual({ line: false, caption: '옵션을 펼치고' }); // 면 첫 블록 — 선 생략
    expect(b[1]).toEqual({ line: true, caption: '하나를 선택하다' }); // 묶음 전환
    expect(b[2]).toBeNull();                                          // 같은 묶음
    expect(b[3]).toEqual({ line: true });                             // 묶음 밖 — 선만
  });

  it('첫 도미노 짝에 인과 연결선이 있다', () => {
    expect(c.today.pairText.connector).toBe('↓ 그것이 넘어지면');
    expect(c.today.pairText.from.key).toBe('domino_what');
    expect(c.today.pairText.to.key).toBe('domino_effect');
  });

  // 2회차 future_area · 3회차 gap_area 를 재사용하지 않는다. 세 값이 어긋날 때가 인도자에게
  //   가장 값진 정보인데 같은 키를 쓰면 그 차이가 덮인다.
  it('영역 키를 회차마다 새로 둔다 — 세 값의 차이를 보존한다', () => {
    expect(c.today.areaPick.key).toBe('project_area');
    expect(CHECKIN_SESSION_2.today.areaPick.key).toBe('future_area');
    expect(CHECKIN_SESSION_3.today.areaPick.key).toBe('gap_area');
  });

  it('사진 첨부가 없다 — letter_line 키를 쓰지 않는다', () => {
    expect(JSON.stringify(c)).not.toContain('letter_line');
  });
});

describe('필수 6칸 — 1번은 세 필드', () => {
  it('빈 답 → 0 · 전부 채우면 6', () => {
    expect(c.requiredTotal).toBe(6);
    expect(c.filledCount({})).toBe(0);
    expect(c.filledCount(ANSWERS_4)).toBe(6);
  });

  // STEP 5 의 유일한 판별 기준이 '끝나는 날'이다. 마감일을 선택으로 내리면 이 회차의 원리가 카드에서 빠진다.
  //   **둘만 채운 상태에서 그 칸이 0인 것**을 명시적으로 확인한다.
  it('영역·이름·마감일 셋이 다 있어야 1칸', () => {
    expect(c.filledCount({ ...ANSWERS_4, project_due: '' })).toBe(5);
    expect(c.filledCount({ ...ANSWERS_4, project_name: '' })).toBe(5);
    expect(c.filledCount({ ...ANSWERS_4, project_area: '   ' })).toBe(5);
    // 둘만 채운 상태 — 이 묶음은 충족되지 않는다.
    const twoOfThree = { project_area: '일', project_name: '주 한 번씩 현업 선배 만나기' };
    expect(c.filledCount(twoOfThree)).toBe(0);
  });

  it('첫 도미노는 둘 다 있어야 1칸 — 아래 칸이 검산기다', () => {
    expect(c.filledCount({ ...ANSWERS_4, domino_effect: '' })).toBe(5);
    expect(c.filledCount({ ...ANSWERS_4, domino_what: '' })).toBe(5);
  });

  // ADR-101 — 칩이 비어도 직접 쓰기만으로 충족한다. 3회차부터 적용된 규칙이 4회차에도 걸린다.
  it('마음 — 칩이 비어도 직접 쓰기만으로 충족한다', () => {
    expect(c.filledCount({ ...ANSWERS_4, mood: [] })).toBe(6);
    expect(c.filledCount({ ...ANSWERS_4, mood: [], mood_custom: '' })).toBe(5);
  });

  it('parked·onething·last_step_note·step_blocker·confidence 는 세지 않는다', () => {
    const without = { ...ANSWERS_4 };
    for (const k of ['parked', 'onething', 'last_step_note', 'step_blocker', 'confidence']) {
      delete (without as Record<string, unknown>)[k];
    }
    expect(c.filledCount(without)).toBe(6);
  });

  // 결측 안내는 화면 문구를 그대로 읽는다 — 선언과 렌더가 어긋나면 이중 진실이 된다.
  it('결측 라벨은 비어 있는 것만, 화면 문구와 바이트 동일', () => {
    const partial = { ...ANSWERS_4, project_due: '', domino_effect: '' };
    const missing = c.missingLabels(partial);
    expect(missing).toEqual(['끝나는 날', '함께 넘어갈 것은']);
    expect(missing[0]).toBe(c.today.areaPick.lines[1].label);
    expect(missing[1]).toBe(c.today.pairText.to.label);
    expect(c.missingKeys(partial)).toEqual(['project_due', 'domino_effect']);
  });

  it('missingLabels 와 missingKeys 는 길이·순서가 같다', () => {
    expect(c.missingKeys({}).length).toBe(c.missingLabels({}).length);
  });
});

describe('되비추기 네 곳 (ADR-103)', () => {
  const B1 = { gap_area: '관계', gap_want: '아버지와 다시 대화하기', rough_project: '하루 한 줄 쓰기 한 달', step_what: '저녁에 전화', step_when: '수요일 저녁' };
  const B2 = { identity_statement: '나는 상생의 사람이다' };

  it('문안이 요구하는 깊이는 [1, 2] 다', () => {
    expect(neededBacks(c)).toEqual([1, 2]);
  });

  it('① 영역 · ② 우당탕탕 · ⑤ 한 걸음은 직전 회차를 읽는다', () => {
    const P = { 1: B1, 2: B2 };
    expect(resolveMirror(c.today.areaPick.mirror, P)).toEqual({ kind: 'value', label: '지난 시간에 가장 간절하다고 고르신 영역', value: '관계 · 아버지와 다시 대화하기' });
    expect(resolveMirror(c.today.pairText.mirror, P)).toEqual({ kind: 'value', label: '지난 시간에 이름 붙이신 우당탕탕 프로젝트', value: '하루 한 줄 쓰기 한 달' });
    expect(resolveMirror(c.step.lastStep.mirror, P)).toEqual({ kind: 'value', label: '지난 시간의 한 걸음', value: '저녁에 전화 · 수요일 저녁' });
  });

  // rough_project 는 3회차에서 선택이라 비어 있을 수 있다. empty 를 두지 않아 그때는 상자가 안 그려진다.
  it('우당탕탕이 비면 그 되비추기는 그려지지 않는다', () => {
    expect(resolveMirror(c.today.pairText.mirror, { 1: { ...B1, rough_project: '' }, 2: B2 })).toBeNull();
  });

  // **봉투 분리 증명.** 심화는 두 회차 전만 읽는다 — 직전 회차에 같은 키가 있어도 읽지 않는다.
  it('심화는 두 회차 전(2회차)만 읽는다 — 직전에 같은 키가 있어도', () => {
    const m = c.deepen.fields[0].mirror;
    expect(m?.back).toBe(2);
    expect(resolveMirror(m, { 1: { identity_statement: '직전 값(읽으면 안 된다)' }, 2: B2 }))
      .toEqual({ kind: 'value', label: "2회차에 쓰신 '인생을 이끌어갈 하나의 문장'", value: '나는 상생의 사람이다' });
    // 두 회차 전이 비면 그리지 않는다(empty 없음).
    expect(resolveMirror(m, { 1: { identity_statement: '직전 값' }, 2: null })).toBeNull();
  });
});

describe('심화 — 인생의 원씽 (선택 · 한 칸)', () => {
  it('한 칸이고 필수가 아니다 — 가설이라 못 찾은 사람이 카드를 닫지 못하면 안 된다', () => {
    expect(c.deepen.fields.map((f) => f.key)).toEqual(['onething']);
    expect(c.missingKeys({})).not.toContain('onething');
  });

  it('제목은 ADR-102 격상 문안이다', () => {
    expect(c.deepen.title).toBe('여기서부터가 진짜입니다');
  });
});

describe('열람 — readModel 이 신규 7키를 모두 낸다', () => {
  const NEW_KEYS = ['project_area', 'project_name', 'project_due', 'domino_what', 'domino_effect', 'parked', 'onething'] as const;

  for (const audience of ['self', 'facilitator'] as const) {
    it(`${audience}: 7키 전량`, () => {
      const t = texts(buildCheckinRead(4, ANSWERS_4, OPEN, audience));
      for (const k of NEW_KEYS) expect(t, k).toContain(ANSWERS_4[k]);
    });
  }

  it('열람 순서가 작성 순서와 같다 — 영역 → 첫 도미노 → 오늘의 질문 → 마음', () => {
    const t = texts(buildCheckinRead(4, ANSWERS_4, OPEN, 'self'));
    const idx = (v: string) => t.indexOf(v);
    expect(idx(ANSWERS_4.project_area)).toBeLessThan(idx(ANSWERS_4.domino_what));
    expect(idx(ANSWERS_4.domino_what)).toBeLessThan(idx(ANSWERS_4.parked));
  });
});

describe('나눔 후보 열 — 소리 내어 읽을 수 있는 것만', () => {
  it('네 열 · 카드 순서를 따른다', () => {
    expect(c.summaryFields).toEqual([
      { label: '이번에 시작할 프로젝트', key: 'project_name' },
      { label: '첫 도미노', from: 'domino_what', to: 'domino_effect' },
      { label: '뒤로 미뤄 둔 것', key: 'parked' },
      { label: '인생의 원씽', key: 'onething' },
    ]);
  });

  // 범주 낱말과 날짜는 제외한다 — **날짜는 문장이 아니다.** 마감일 자체는 열람에서 그대로 보인다.
  it('범주 낱말과 날짜는 넣지 않는다', () => {
    const keys = c.summaryFields.flatMap((f) => Object.values(f));
    for (const k of ['project_area', 'project_due', 'self_note']) expect(keys).not.toContain(k);
    expect(texts(buildCheckinRead(4, ANSWERS_4, OPEN, 'facilitator'))).toContain(ANSWERS_4.project_due);
  });
});

describe('문안 규율', () => {
  const allCopy = JSON.stringify(c);

  it('참여자 금지어 0건 — 대기열은 4회차 신규 금지어다', () => {
    for (const w of ['설문', '진단', '지각', '미제출', '워크북', '함정', '점수', '평가', '게으름', '회피', '대기열']) {
      expect(allCopy, w).not.toContain(w);
    }
  });

  it('허락 어휘 0건 — ADR-102 진취 전환', () => {
    for (const w of ['하셔도 됩니다', '않으셔도 됩니다', '괜찮습니다', '아니어도 됩니다', '충분합니다', '충분해요']) {
      expect(allCopy, w).not.toContain(w);
    }
  });

  it('압박 어휘 0건', () => {
    for (const w of ['반드시', '절대', '놓치지']) expect(allCopy, w).not.toContain(w);
  });

  // 책 참조는 붙이지 않는다 — STEP 5·6 구간의 조판 확정본 대조가 끝나지 않았다(ADR-88·89).
  it('책 페이지 참조를 붙이지 않았다 — 확정된 값만 카드에 오른다', () => {
    expect(allCopy).not.toMatch(/책 \d+/);
  });

  it('오늘의 질문에 선택 표기가 있다', () => {
    expect(c.today.question.badge).toBe('선택');
  });
});

// 낱말은 회차마다 사람이 짜므로 5·6·7회차에서 겹칠 수 있다. **주장이 아니라 잠금으로 둔다.**
//   여섯 번째(목록 한계 낱말)는 회차 간 공유가 의도이므로 앞 다섯만 본다.
describe('마음 낱말 — 앞 다섯이 회차 간에 겹치지 않는다', () => {
  it('1·2·3·4회차 교집합이 공집합이다', () => {
    const sets = [CHECKIN_SESSION_1, CHECKIN_SESSION_2, CHECKIN_SESSION_3, CHECKIN_SESSION_4]
      .map((s) => ({ no: s.sessionNo, words: s.today.mood.options.slice(0, 5) }));
    const seen = new Map<string, number>();
    for (const { no, words } of sets) {
      for (const w of words) {
        expect(seen.has(w), `${w} 가 ${seen.get(w)}회차와 ${no}회차에 겹친다`).toBe(false);
        seen.set(w, no);
      }
    }
    expect(seen.size).toBe(20);
  });

  it('여섯 번째는 3회차와 같다 — 목록 한계 낱말은 공유가 의도다', () => {
    expect(c.today.mood.options[5]).toBe('딱 맞는 말이 없음');
    expect(c.today.mood.exclusive).toBe('딱 맞는 말이 없음');
  });
});
