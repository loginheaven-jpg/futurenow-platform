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
  it('레지스트리에 등록됐고 미등록 회차(5)는 아직 없다', () => {
    expect(getCheckinSession(3)).toBe(c);
    // ADR-104 로 4회차가 등록됐다. 가드를 다음 미등록 회차로 이어 쓴다(지우지 않는다).
    expect(getCheckinSession(5)).toBeNull();
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
    expect(c.today.pairText.connector).toBe('↓ 그 자리를 만들려면');
  });

  // ADR-98 — 기입 순서 반전. 시작할 것이 위, 없앨 것이 아래다. 사분면 좌측 상단이 Eliminate 이고
  //   사람은 위에서부터 채우므로, 짝 맞추기를 나중에 요구하면 이미 자책 목록이 완성된 뒤다.
  //   **키는 바꾸지 않았다** — 저장된 답·결측 판정·나눔 열이 그대로 살아야 한다. 양쪽을 함께 못 박는다.
  it('습관 짝 기입 순서가 시작 → 없앰이고, 키는 그대로다', () => {
    expect(c.today.pairText.from.key).toBe('habit_start');
    expect(c.today.pairText.to.key).toBe('habit_stop');
    expect('help' in c.today.pairText.to).toBe(false); // connector 가 같은 논리를 지므로 지웠다
  });

  // 결측 안내는 화면 문구를 그대로 읽는다 — REQUIRED_3 와 렌더가 어긋나면 이중 진실이 된다.
  it('결측 라벨 순서·문안이 화면과 같다', () => {
    const missing = c.missingLabels({});
    expect(missing).toContain(c.today.pairText.from.label);
    expect(missing).toContain(c.today.pairText.to.label);
    expect(missing.indexOf(c.today.pairText.from.label)).toBeLessThan(missing.indexOf(c.today.pairText.to.label));
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

  it('오늘의 질문·심화 한 칸·자신감은 세지 않는다', () => {
    const without = { ...ANSWERS_3 };
    for (const k of ['stuck_named', 'speech_habit', 'confidence', 'last_step_note']) {
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

  // ADR-94(2026-08-07): 지휘부가 다섯 값을 최종 조판 확정치로 선언해 ADR-88·89 의 '확정된 값만 카드에 오른다'
  //   조건이 해소됐다. 그래서 이 자리의 단언은 '참조 0'(미확정 금지)에서 '확정 다섯 열거'로 **뒤집혔다**.
  //   조용히 지우지 않고 뒤집은 것은, 가드를 삭제하면 승인된 정책을 코드에서 몰래 되돌리는 것이 되기 때문이다.
  it('책 페이지 참조 네 곳 — 확정치(ADR-94 · ADR-100 으로 다섯에서 넷)', () => {
    expect(allCopy).toContain('(책 94~95쪽)');
    expect(allCopy).toContain('(책 96~104쪽)');
    expect(allCopy).toContain('(책 117~118쪽)');
    expect(allCopy).not.toContain('(책 108~111쪽)'); // ADR-100 으로 identity_gap 과 함께 사라졌다
    expect(allCopy).toContain('(책 126~133쪽)');
  });

  // 표기 규칙(ADR-94 §3-1③) — 문장부호 뒤 + 반각 공백 1칸 + 문자열 맨 끝. 1·2회차 10건과 코드포인트 단위 일치.
  //   allCopy 는 JSON.stringify 라 렌더 라벨 다섯만 잡힌다 — REQUIRED_3 는 missingLabels 클로저 안이라
  //   직렬화에 안 나온다. 그래서 여섯 번째(gap_area 필수 선언)는 아래 별도 단언이 맡는다.
  it('책 참조 표기가 관례를 따른다 — 부호 뒤·공백 1칸·문자열 맨 끝', () => {
    const refs = [...allCopy.matchAll(/[^"]*?\(책 \d+(?:~\d+)?쪽\)/g)].map((m) => m[0]);
    expect(refs).toHaveLength(4); // 렌더 경로 넷(ADR-100 으로 identity_gap 소멸)
    for (const r of [...refs, ...c.missingLabels({}).filter((l) => l.includes('(책 '))]) {
      expect(r).toMatch(/[.?] \(책 \d+(?:~\d+)?쪽\)$/); // 부호 + 공백 1칸 + 참조로 끝난다
    }
  });

  // gap_area 만 라벨이 두 벌이다(필수 선언 + 렌더). 한쪽만 고치면 결측 안내가 화면과 다른 문안을 읽어 준다.
  it('gap_area 참조가 REQUIRED_3·areaPick 양쪽에 같이 붙었다', () => {
    const label = c.today.areaPick.label;
    expect(label).toContain('(책 94~95쪽)');
    expect(c.missingLabels({})).toContain(label);
  });

  it('오늘의 질문에 선택 표기가 있다', () => {
    expect(c.today.question.badge).toBe('선택');
  });
});

describe('나눔 후보 열 — 나눌 수 있는 문장만(지휘부 확정 2026-08-03)', () => {
  // ADR-99: 자리는 **카드 순서**를 따른다 — 우당탕탕은 카드에서 gap_want 바로 아래라 여기서도 두 번째다.
  //   ADR-98 이 마지막에 뒀던 근거('빈 칸이 목록 한복판에')는 코드와 어긋났다. 현황 화면은 `c.has` 로
  //   빈 칸을 아예 렌더하지 않으므로 그 상황이 없다. 열람이 카드를 되비춘다는 원칙을 나눔 열에도 적용한다.
  //   습관 짝의 from/to 는 화면 기입 순서가 뒤집혔어도 **의미 방향(없앤 것 → 들인 것)** 그대로다.
  it('네 열: 지금 가장 바라는 것 · 우당탕탕 · 습관 바꾸기 · 입에 붙은 말', () => {
    expect(c.summaryFields).toEqual([
      { label: '지금 가장 바라는 것', key: 'gap_want' },
      { label: '우당탕탕 프로젝트', key: 'rough_project' },
      { label: '습관 바꾸기', from: 'habit_stop', to: 'habit_start' },
      { label: '입에 붙은 말', key: 'speech_habit' },
    ]);
  });

  // 카드 순서와 나눔 열 순서가 실제로 일치하는지 — 손으로 맞춘 두 목록이 어긋나지 않게 구조로 확인한다.
  it('나눔 열 첫 두 자리가 카드 1면 줄 순서와 같다', () => {
    expect(c.summaryFields.slice(0, 2).map((f) => ('key' in f ? f.key : null)))
      .toEqual(c.today.areaPick.lines.map((l) => l.key));
  });

  it('범주 낱말과 자기개시가 깊은 문항은 제외한다', () => {
    const keys = c.summaryFields.flatMap((f) => Object.values(f));
    for (const k of ['gap_area', 'stuck_named', 'self_note']) expect(keys).not.toContain(k);
  });
});

describe('되비추기 두 곳 — 전부 2회차를 읽는다(ADR-100 으로 심화① 소멸)', () => {
  it('① 영역 · ⑤ 한 걸음', () => {
    expect(c.today.areaPick.mirror).toEqual({ label: '지난 시간에 가장 가슴이 뛴다고 고르신 영역', keys: ['future_area', 'future_line'] });
    expect(c.step.lastStep.mirror.keys).toEqual(['step_what', 'step_when']);
  });

  // 잃은 것을 명시로 남긴다 — 2회차 정체성 문장을 3회차에서 되비추던 유일한 지점이었고,
  //   갈망(1) → 원씽(4) → 정체성 선언(7) 종단 축의 중간 고리였다. 되살릴 때 여기를 본다.
  it('심화에는 되비추기가 없다 — identity_statement 를 읽는 자리가 사라졌다', () => {
    expect(c.deepen.fields.some((f) => 'mirror' in f)).toBe(false);
    expect(JSON.stringify(c)).not.toContain('identity_statement');
  });
});

describe('심화 한 칸 (ADR-100)', () => {
  it('speech_habit 하나뿐이고 identity_gap 은 없다', () => {
    expect(c.deepen.fields.map((f) => f.key)).toEqual(['speech_habit']);
  });

  // help 는 두지 않는다 — 라벨이 이미 두 가지(무엇을·어떻게)를 묻고 있어 보조 문구가 군더더기가 된다.
  //   타입에서 help 를 선택으로 내린 것이 이 자리 때문이다(index.ts).
  it('보조 문구가 없다', () => {
    expect('help' in c.deepen.fields[0]).toBe(false);
  });

  it('요약 줄이 남은 한 칸만 말한다', () => {
    expect(c.deepen.summary).toBe('내 입에 붙은 말');
  });
});

describe('readModel — 신규 6키가 본인·인도자 모두에게 나온다', () => {
  const NEW_KEYS = ['gap_area', 'gap_want', 'stuck_named', 'habit_stop', 'habit_start', 'speech_habit'] as const;

  for (const audience of ['self', 'facilitator'] as const) {
    it(`${audience}: 6키 전량`, () => {
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

  // ADR-98: 열람은 카드를 그대로 되비춘다 — 기입 순서가 뒤집혔으므로 여기도 시작 → 없앰이다.
  //   나눔 열(summaryFields)만 의미 방향(없앤 것 → 들인 것)을 지킨다. 둘은 별개다.
  it('습관 짝은 쌍으로 나오고 카드 순서를 따른다', () => {
    const pair = buildCheckinRead(3, ANSWERS_3, OPEN, 'facilitator').find((x) => x.kind === 'pair');
    expect(pair?.kind === 'pair' && pair.fromValue).toBe(ANSWERS_3.habit_start);
    expect(pair?.kind === 'pair' && pair.toValue).toBe(ANSWERS_3.habit_stop);
  });

  // ADR-98 신설 칸. 선택이라 필수 6칸에는 안 들어가지만 열람에는 나와야 한다(적은 것이 안 보이면 안 된다).
  it('우당탕탕 프로젝트가 본인·인도자 모두에게 나온다', () => {
    for (const who of ['self', 'facilitator'] as const) {
      const t = texts(buildCheckinRead(3, { ...ANSWERS_3, rough_project: '하루 한 줄 쓰기 한 달' }, OPEN, who));
      expect(t, who).toContain('하루 한 줄 쓰기 한 달');
    }
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

// ADR-91 C — 마음 낱말은 3회차부터만 좁힌다.
describe('마음 낱말 — 목록의 한계를 가리키는 낱말로(3회차부터)', () => {
  it("6번째가 '딱 맞는 말이 없음'이고 배타를 유지한다", () => {
    expect(c.today.mood.options[5]).toBe('딱 맞는 말이 없음');
    expect(c.today.mood.exclusive).toBe('딱 맞는 말이 없음');
    expect(c.today.mood.options).not.toContain('아직 모르겠음');
  });

  it('고르면 직접 쓰기 안내가 바뀐다(강제하지 않는다 — 비워도 필수 충족)', () => {
    expect(c.today.moodCustom.promptPlaceholder).toBe('그럼, 지금 마음에 가까운 말을 한마디로 적어 주세요');
    // 마음은 칩 하나만 있어도 필수가 충족된다 — 직접 쓰기는 세지 않는다.
    expect(c.filledCount({ ...ANSWERS_3, mood: ['딱 맞는 말이 없음'], mood_custom: '' })).toBe(6);
  });
});

// ADR-91 D — 3회차만 지난 걸음 보조문구에서 허락절을 뺀다(1·2회차는 그대로).
describe('완충 문구 — 3회차 지난 걸음', () => {
  it('허락절 없이 용도만 남는다', () => {
    expect(c.step.lastStep.note.help).toBe('여기 정직하게 적는 것이 다음 한 주를 바꿉니다.');
  });
  it('실행 자신감은 용도 문법이다', () => {
    expect(c.wrap.confidence.help).toContain('가장 쓸모 있습니다');
  });
  it('나에게 한마디 예시가 이 회차 것이다', () => {
    expect(c.wrap.selfNote.placeholder).toBe('오늘 본 게 아프긴 했는데, 안 봤으면 몰랐겠지');
  });
});
