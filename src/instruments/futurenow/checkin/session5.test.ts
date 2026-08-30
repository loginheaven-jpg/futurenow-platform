import { describe, expect, it } from 'vitest';
import { CHECKIN_SESSION_1 } from './session1';
import { CHECKIN_SESSION_2 } from './session2';
import { CHECKIN_SESSION_3 } from './session3';
import { CHECKIN_SESSION_4 } from './session4';
import { CHECKIN_SESSION_5 } from './session5';
import { buildCheckinRead, type ReadBlock, type ReadFlags } from './readModel';
import { neededBacks, resolveMirror, slotBoundaries } from './slots';

// 레지스트리 등록·미등록 가드는 registry.guard.test.ts 가 갖는다(ADR-108) — 여기에 두면 중복이고,
//   중복은 다시 어긋난다. 이 파일은 5회차 **문안과 판정**만 본다.
const c = CHECKIN_SESSION_5;
const OPEN: ReadFlags = { stepPrivate: false, suggestionAnon: false, contactRequest: false };

// 5회차 신규 7키 + 공통 키.
const ANSWERS_5 = {
  env_change: '자기 전에 휴대폰을 거실 서랍에 둔다',
  trigger_if: '저녁 설거지를 끝내면',
  trigger_then: '스쿼트 스무 개를 한다',
  relief: '미루는 게 내 성격이 아니라 책상 위가 어질러져 있어서였다',
  ask_person: '수요일 저녁에 한 번만 확인 문자를 달라고 부탁하기',
  domino_if: '월요일 아침 사무실에 앉으면',
  domino_then: '그 자료를 30분 먼저 연다',
  mood: ['가뿐함', '단단함'],
  mood_custom: '조금 얼떨떨하다',
  last_step_result: '크기나 내용을 바꿨습니다',
  last_step_note: '몸 상태 때문에 프로젝트를 통째로 바꿨다',
  step_what: '책상 위 물건을 셋만 남기기',
  step_when: '토요일 아침, 집에서',
  step_blocker: '야근이 늦게 끝나는 날',
  confidence: 7,
  need: '자리를 앞쪽으로 주세요',
  suggestion: '쉬는 시간이 조금 더 길었으면',
  self_note: '설계는 끝났다. 이제 켜기만 하면 된다',
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

describe('5회차 구조', () => {
  // areaPick 이 없다 — 5회차에 영역 선택이 없다. order 는 존재하는 슬롯만 담는다.
  //   문항 1은 identity 슬롯이다. 슬롯 이름은 회차가 아니라 **모양**을 가리킨다(ADR-90).
  it('1면 순서에 areaPick 이 없고 identity 가 첫 자리다', () => {
    expect(c.today.order).toEqual(['identity', 'pairText', 'question', 'mood']);
    expect('areaPick' in c.today).toBe(false);
    expect(c.today.identity.key).toBe('env_change');
  });

  it('부제를 쪼갤 수 없어 STEP 이름으로 묶음을 가른다', () => {
    expect(c.cover.subtitle).toBe('의지가 아니라 설계');
    expect(c.today.identity.group).toBe('환경을 바꾸고');
    expect(c.today.pairText.group).toBe('신호를 만들다');
    expect(c.today.question.group).toBe('신호를 만들다');
    expect('group' in c.today.mood).toBe(false); // 회차 전체에 대한 물음이라 묶음 밖
  });

  it('묶음 경계 — 캡션만 · 선+캡션 · null · 선만', () => {
    const b = slotBoundaries(c);
    expect(b[0]).toEqual({ line: false, caption: '환경을 바꾸고' }); // 면 첫 블록 — 선 생략
    expect(b[1]).toEqual({ line: true, caption: '신호를 만들다' });  // 묶음 전환
    expect(b[2]).toBeNull();                                          // 같은 묶음
    expect(b[3]).toEqual({ line: true });                             // 묶음 밖 — 선만
  });

  // 3회차 '↓ 그 자리에'(교체) · 4회차 '↓ 그것이 넘어지면'(인과)과 달리 **조건**이라 가로 화살표다.
  it('트리거 짝의 연결선이 조건이라 가로 화살표다', () => {
    expect(c.today.pairText.connector).toBe('→ 그러면');
    expect(c.today.pairText.from.key).toBe('trigger_if');
    expect(c.today.pairText.to.key).toBe('trigger_then');
    expect(CHECKIN_SESSION_3.today.pairText.connector).toBe('↓ 그 자리를 만들려면');
    expect(CHECKIN_SESSION_4.today.pairText.connector).toBe('↓ 그것이 넘어지면');
  });

  // 앞은 첫 도미노에 거는 트리거(심화), 뒤는 생활 습관 트리거(필수)다.
  //   한 칸에 덮어쓰면 그 이층 구조가 사라진다.
  it('심화 트리거와 생활 트리거의 키가 갈린다', () => {
    const deep = c.deepen.fields.map((f) => f.key);
    expect(deep).toEqual(['ask_person', 'domino_if', 'domino_then']);
    expect(deep).not.toContain('trigger_if');
    expect(deep).not.toContain('trigger_then');
  });

  it('사진 첨부가 없다 — letter_line 키를 쓰지 않는다', () => {
    expect(JSON.stringify(c)).not.toContain('letter_line');
  });
});

describe('필수 6칸', () => {
  it('빈 답 → 0 · 전부 채우면 6', () => {
    expect(c.requiredTotal).toBe(6);
    expect(c.filledCount({})).toBe(0);
    expect(c.filledCount(ANSWERS_5)).toBe(6);
  });

  // 한 칸으로 받으면 상당수가 '밤에 폰 안 보기'처럼 **신호 없는 다짐**을 쓴다.
  //   트리거는 신호가 있어야 트리거이므로 칸을 갈라 신호를 못 건너뛰게 한다.
  it('트리거는 두 칸이 다 있어야 1칸 — 신호를 건너뛸 수 없다', () => {
    expect(c.filledCount({ ...ANSWERS_5, trigger_then: '' })).toBe(5);
    expect(c.filledCount({ ...ANSWERS_5, trigger_if: '' })).toBe(5);
    // 한 칸만 채운 상태 — 이 묶음은 충족되지 않는다.
    expect(c.filledCount({ trigger_if: '저녁 설거지를 끝내면' })).toBe(0);
    expect(c.filledCount({ trigger_then: '스쿼트 스무 개를 한다' })).toBe(0);
  });

  it('환경 한 줄이 비면 1칸 준다', () => {
    expect(c.filledCount({ ...ANSWERS_5, env_change: '   ' })).toBe(5);
  });

  // ADR-101 — 칩이 비어도 직접 쓰기만으로 충족한다.
  it('마음 — 칩이 비어도 직접 쓰기만으로 충족한다', () => {
    expect(c.filledCount({ ...ANSWERS_5, mood: [] })).toBe(6);
    expect(c.filledCount({ ...ANSWERS_5, mood: [], mood_custom: '' })).toBe(5);
  });

  it('relief·ask_person·domino_*·last_step_note·step_blocker·confidence 는 세지 않는다', () => {
    const without = { ...ANSWERS_5 };
    for (const k of ['relief', 'ask_person', 'domino_if', 'domino_then', 'last_step_note', 'step_blocker', 'confidence']) {
      delete (without as Record<string, unknown>)[k];
    }
    expect(c.filledCount(without)).toBe(6);
  });

  // 결측 안내는 화면 문구를 그대로 읽는다 — 선언과 렌더가 어긋나면 이중 진실이 된다.
  it('결측 라벨은 비어 있는 것만, 화면 문구와 바이트 동일', () => {
    const partial = { ...ANSWERS_5, env_change: '', trigger_then: '' };
    const missing = c.missingLabels(partial);
    expect(missing).toEqual([c.today.identity.label, '나는']);
    expect(missing[1]).toBe(c.today.pairText.to.label);
    expect(c.missingKeys(partial)).toEqual(['env_change', 'trigger_then']);
  });

  it('missingLabels 와 missingKeys 는 길이·순서가 같다', () => {
    expect(c.missingKeys({}).length).toBe(c.missingLabels({}).length);
  });
});

describe('되비추기 두 곳 — 전부 직전 회차 (ADR-103)', () => {
  const B1 = {
    step_blocker: '야근이 늦게 끝나는 날',
    step_what: '오늘 밤 선배에게 문자 보내기',
    step_when: '수요일 저녁, 퇴근길에',
    domino_what: '매주 목요일 저녁 약속 하나 잡기',
  };

  // 5회차는 두 회차 전을 읽지 않는다 — 4회차보다 왕복이 하나 준다.
  it('문안이 요구하는 깊이는 [1] 이다', () => {
    expect(neededBacks(c)).toEqual([1]);
    expect(neededBacks(CHECKIN_SESSION_4)).toEqual([1, 2]);
  });

  it('① 환경 위 — 4회차 「못 하게 될 것 같은 때」를 읽는다', () => {
    expect(resolveMirror(c.today.identity.mirror, { 1: B1 })).toEqual({
      kind: 'value',
      label: '지난 시간에 적으신 「못 하게 될 것 같은 때」',
      value: '야근이 늦게 끝나는 날',
    });
  });

  // 4회차 step_blocker 는 선택이라 비워 둔 사람이 있다. empty 를 두지 않아 그때는 상자가 안 그려진다.
  it('4회차 step_blocker 가 비면 환경 되비추기가 그려지지 않는다', () => {
    expect(resolveMirror(c.today.identity.mirror, { 1: { ...B1, step_blocker: '' } })).toBeNull();
    expect(resolveMirror(c.today.identity.mirror, { 1: null })).toBeNull();
  });

  // 원안은 '다음 한 걸음' 블록 위에 첫 도미노를 따로 되비추려 했으나 step 에는 mirror 가 없다.
  //   lastStep 되비추기에 합쳤다 — 코드 변경 0이고 위(지난 것)와 아래(다음 것)를 한 상자에서 대조하게 된다.
  it('② 지난 걸음 위 — 한 걸음 둘과 첫 도미노를 함께 읽는다', () => {
    expect(resolveMirror(c.step.lastStep.mirror, { 1: B1 })).toEqual({
      kind: 'value',
      label: '지난 시간의 한 걸음과 첫 도미노',
      value: '오늘 밤 선배에게 문자 보내기 · 수요일 저녁, 퇴근길에 · 매주 목요일 저녁 약속 하나 잡기',
    });
  });

  it('전부 비면 lastStep 만 empty 문구를 낸다', () => {
    expect(resolveMirror(c.step.lastStep.mirror, { 1: {} })).toEqual({
      kind: 'empty',
      text: '이번 회차부터 한 걸음이 쌓입니다.',
    });
  });

  // resolveMirror 는 keys[0] 을 **앵커**로 삼는다 — 앵커가 비면 나머지에 값이 있어도 그리지 않는다.
  //   여기서 앵커는 step_what 이고 4회차 필수라 제출한 사람에게는 늘 있다. 다만 이 성질을 못 박아 두어
  //   6회차가 keys 를 늘릴 때 순서를 잘못 두지 않게 한다.
  it('앵커는 step_what 이다 — 지난 걸음이 있을 때 첫 도미노가 함께 보인다', () => {
    expect(c.step.lastStep.mirror.keys[0]).toBe('step_what');
    // 앵커만 있고 나머지가 비면 앵커만 나온다.
    expect(resolveMirror(c.step.lastStep.mirror, { 1: { step_what: '문자 보내기' } }))
      .toEqual({ kind: 'value', label: '지난 시간의 한 걸음과 첫 도미노', value: '문자 보내기' });
    // 앵커가 비면 도미노가 있어도 empty 로 떨어진다.
    expect(resolveMirror(c.step.lastStep.mirror, { 1: { domino_what: '약속 잡기' } }))
      .toEqual({ kind: 'empty', text: '이번 회차부터 한 걸음이 쌓입니다.' });
  });

  // step 에 mirror 를 붙이지 않았다 — 타입·순수함수·컴포넌트·미리보기 넷을 고쳐야 성립하고
  //   그것은 문안 작업이 아니다. 반복이 확인되지 않은 일반화는 하지 않는다(ADR-94).
  it('step 블록 자체에는 mirror 가 없다 — 렌더 경로를 넓히지 않았다', () => {
    expect('mirror' in c.step).toBe(false);
    expect(c.step.lastStep.mirror.keys).toEqual(['step_what', 'step_when', 'domino_what']);
  });
});

describe('지난 한 걸음 결산 — 5회차만 다섯', () => {
  // 1기에서 한 참여자가 몸 상태 때문에 프로젝트를 통째로 바꿨고 인도자가 그것을 성공으로 인정했다.
  //   넷 중에는 그 경우가 들어갈 자리가 없었다. **조정은 실패가 아니라 설계다.**
  it('다섯째가 신설됐다', () => {
    expect(c.step.lastStep.options).toEqual([
      '했습니다', '조금 했습니다', '잊고 지냈습니다', '하려다 막혔습니다', '크기나 내용을 바꿨습니다',
    ]);
  });

  // 2~4회차는 넷으로 응답이 이미 쌓였다. 목록을 바꾸면 저장값이 유령이 된다(ADR-91 R1).
  //   1회차에는 lastStep 자체가 없다 — 첫 회차라 되비출 지난 걸음이 없다.
  it('2~4회차는 넷 그대로다 — 저장값 보호', () => {
    expect('lastStep' in CHECKIN_SESSION_1.step).toBe(false);
    for (const s of [CHECKIN_SESSION_2, CHECKIN_SESSION_3, CHECKIN_SESSION_4]) {
      expect(s.step.lastStep.options, `${s.sessionNo}회차`).toEqual([
        '했습니다', '조금 했습니다', '잊고 지냈습니다', '하려다 막혔습니다',
      ]);
    }
  });
});

describe('심화 — 방 밖의 한 사람 · 첫 도미노에 거는 신호', () => {
  it('세 칸이고 전부 선택이다', () => {
    expect(c.deepen.fields).toHaveLength(3);
    for (const f of c.deepen.fields) expect(c.missingKeys({}), f.key).not.toContain(f.key);
  });

  it('제목은 ADR-102 격상 문안이다', () => {
    expect(c.deepen.title).toBe('여기서 한 겹 더 들어갑니다');
    expect(c.deepen.summary).toBe('방 밖의 한 사람 · 첫 도미노에 거는 신호');
  });

  // deepen.fields 는 pairText 형태를 지원하지 않아 라벨 둘을 가진 인접 필드 둘로 뒀다. 새 위젯 0.
  it('심화 ②는 인접 두 칸으로 짝을 이룬다', () => {
    const [, ifField, thenField] = c.deepen.fields;
    // ★ **기호가 대시에서 가운뎃점으로 바뀌었다**(문안 회차 · 2026-08-30).
    //   잠금이 지키는 것은 기호가 아니라 **「만약」이 끝에 남는다**는 짝 구조다 —
    //   그 낱말이 **바로 아래 칸의 문두**로 이어져 「만약 (조건), 나는 (행동)」이 한 문장이 된다.
    //   앞으로 옮기면 그 문장에서 「만약」이 사라진다(그 안이 한 번 채택됐다가 이 잠금이 잡았다).
    expect(ifField.label.endsWith('만약'), '「만약」이 끝에 남아야 아래 칸으로 이어진다').toBe(true);
    expect(ifField.label, '금지 기호가 되살아났다').not.toContain(String.fromCharCode(8212));
    expect(thenField.label).toBe('나는');
  });

  // 심화 필드의 placeholder 를 **5회차가 처음 쓴다.** 이 단언은 선언만 본다 —
  //   그 값이 실제로 화면에 닿는지는 CheckinPreviewClient.test.tsx 가 렌더로 증명한다
  //   (선언 대조만 있던 동안 렌더가 placeholder 를 통째로 버리고 있었고 아무 테스트도 그것을 못 잡았다).
  it('심화 ②의 placeholder 가 선언돼 있다 (배달은 CheckinPreviewClient.test.tsx 가 본다)', () => {
    expect(c.deepen.fields[1].placeholder).toBe('월요일 아침 사무실에 앉으면');
    expect(c.deepen.fields[2].placeholder).toBe('그 자료를 30분 먼저 연다');
    // 1~4회차 심화에는 placeholder 가 없다 — 그래서 렌더 한 줄로 그 회차 출력이 바뀌지 않는다.
    for (const s of [CHECKIN_SESSION_1, CHECKIN_SESSION_2, CHECKIN_SESSION_3, CHECKIN_SESSION_4]) {
      for (const f of s.deepen.fields) expect('placeholder' in f, `${s.sessionNo}회차`).toBe(false);
    }
  });
});

describe('열람 — readModel 이 신규 7키를 모두 낸다', () => {
  const NEW_KEYS = ['env_change', 'trigger_if', 'trigger_then', 'relief', 'ask_person', 'domino_if', 'domino_then'] as const;

  for (const audience of ['self', 'facilitator'] as const) {
    it(`${audience}: 7키 전량`, () => {
      const t = texts(buildCheckinRead(5, ANSWERS_5, OPEN, audience));
      for (const k of NEW_KEYS) expect(t, k).toContain(ANSWERS_5[k]);
    });
  }

  it('열람 순서가 작성 순서와 같다 — 환경 → 트리거 → 사면 → 마음', () => {
    const t = texts(buildCheckinRead(5, ANSWERS_5, OPEN, 'self'));
    const idx = (v: string) => t.indexOf(v);
    expect(idx(ANSWERS_5.env_change)).toBeLessThan(idx(ANSWERS_5.trigger_if));
    expect(idx(ANSWERS_5.trigger_if)).toBeLessThan(idx(ANSWERS_5.relief));
  });
});

describe('나눔 후보 열 — 소리 내어 읽을 수 있는 것만', () => {
  it('네 열 · 카드 순서를 따른다', () => {
    expect(c.summaryFields).toEqual([
      { label: '바꾼 환경', key: 'env_change' },
      { label: '만약 → 나는', from: 'trigger_if', to: 'trigger_then' },
      { label: '내려놓은 자책', key: 'relief' },
      { label: '부탁할 한마디', key: 'ask_person' },
    ]);
  });

  // domino_* 는 첫 도미노에 걸리는 개인 계획이라 나눔 재료로 약하다. 개인 상세에는 남는다.
  it('심화 트리거 짝은 나눔 열에 넣지 않는다 — 열람에는 남는다', () => {
    const keys = c.summaryFields.flatMap((f) => Object.values(f));
    for (const k of ['domino_if', 'domino_then', 'self_note']) expect(keys).not.toContain(k);
    expect(texts(buildCheckinRead(5, ANSWERS_5, OPEN, 'facilitator'))).toContain(ANSWERS_5.domino_if);
  });
});

describe('문안 규율', () => {
  const allCopy = JSON.stringify(c);

  // 신규 넷: 의지력(사람을 판정) · 원씽(4회차가 가설과 확정을 갈랐는데 카드에서는 어느 층인지 모른다) ·
  //   스프린트·전두엽·도파민(강의 어휘. 카드에 오면 의학 언어가 된다) · 단톡방(채널이 보이면 어디에 쓸지 고민한다).
  //   '체크'는 ADR-107 이후 사전·마무리 체크를 가리키므로 갈무리 문안에 쓰지 않는다.
  it('참여자 금지어 0건', () => {
    const banned = [
      '설문', '체크', '지각', '미제출', '워크북', '함정', '점수', '평가', '게으름', '회피', '대기열',
      '의지력', '줄여야 할 사람', '원씽', '스프린트', '전두엽', '도파민', '단톡방',
    ];
    for (const w of banned) expect(allCopy, w).not.toContain(w);
  });

  it('허락 어휘 0건 — ADR-102 진취 전환', () => {
    for (const w of ['하셔도 됩니다', '않으셔도 됩니다', '괜찮습니다', '아니어도 됩니다', '충분합니다', '충분해요']) {
      expect(allCopy, w).not.toContain(w);
    }
  });

  it('압박 어휘 0건', () => {
    for (const w of ['반드시', '절대', '놓치지']) expect(allCopy, w).not.toContain(w);
  });

  // 써도 되는 강의 어휘 — 금지 목록이 넓어져 필요한 말까지 지우지 않았는지 본다.
  it('허용된 강의 어휘는 살아 있다', () => {
    expect(allCopy).toContain('첫 도미노');
  });

  it('오늘의 질문에 선택 표기가 있다', () => {
    expect(c.today.question.badge).toBe('선택');
  });
});

// 5회차 발주서가 쪽수를 확정으로 표기해 ADR-88·89 조건이 해소됐다.
//   형식은 '문장부호 뒤 + 반각 공백 1칸 + (책 N~M쪽) + 문자열 맨 끝'이다.
describe('책 페이지 참조 — 넷 (ADR-108 · §11)', () => {
  it('네 자리에 붙는다', () => {
    expect(c.today.identity.label.endsWith('(책 210~213쪽)')).toBe(true);
    expect(c.today.pairText.label.endsWith('(책 230~231쪽)')).toBe(true);
    expect(c.today.question.label.endsWith('(책 202~207쪽)')).toBe(true);
    expect(c.deepen.fields[0].label.endsWith('(책 216~221쪽)')).toBe(true);
  });

  // 같은 쪽수가 pairText 에 이미 있고, '만약'과 '나는' 사이에 참조가 끼면 짝 읽기가 끊긴다.
  it('심화 ②에는 붙이지 않는다 — 중복이고 짝 읽기를 끊는다', () => {
    expect(c.deepen.fields[1].label).not.toMatch(/책 \d+/);
    expect(c.deepen.fields[2].label).not.toMatch(/책 \d+/);
  });

  it('2면 한 걸음에는 붙이지 않는다', () => {
    expect(JSON.stringify(c.step)).not.toMatch(/책 \d+/);
  });

  it('참조가 넷뿐이다', () => {
    expect(allBookRefs(c)).toHaveLength(4);
  });
});

function allBookRefs(session: unknown): string[] {
  return JSON.stringify(session).match(/\(책 \d+~\d+쪽\)/g) ?? [];
}

// 낱말은 회차마다 사람이 짜므로 6·7회차에서 겹칠 수 있다. **주장이 아니라 잠금으로 둔다.**
//   여섯 번째(목록 한계 낱말)는 회차 간 공유가 의도이므로 앞 다섯만 본다.
describe('마음 낱말 — 앞 다섯이 회차 간에 겹치지 않는다', () => {
  it('1·2·3·4·5회차 교집합이 공집합이다', () => {
    const sets = [CHECKIN_SESSION_1, CHECKIN_SESSION_2, CHECKIN_SESSION_3, CHECKIN_SESSION_4, CHECKIN_SESSION_5]
      .map((s) => ({ no: s.sessionNo, words: s.today.mood.options.slice(0, 5) }));
    const seen = new Map<string, number>();
    for (const { no, words } of sets) {
      for (const w of words) {
        expect(seen.has(w), `${w} 가 ${seen.get(w)}회차와 ${no}회차에 겹친다`).toBe(false);
        seen.set(w, no);
      }
    }
    expect(seen.size).toBe(25);
  });

  // 원안은 '홀가분함'(3회차)·'든든함'(4회차)이라 둘 다 문자열이 같았다. 어감 겹침은 허용하되
  //   문자열은 지킨다 — 어감까지 막으면 6·7회차에서 쓸 낱말이 남지 않는다.
  it('원안의 겹치던 두 낱말이 바뀌었다', () => {
    expect(c.today.mood.options).toEqual(['가뿐함', '단단함', '의욕', '부담스러움', '조바심', '딱 맞는 말이 없음']);
    expect(c.today.mood.options).not.toContain('홀가분함');
    expect(c.today.mood.options).not.toContain('든든함');
  });

  it('여섯 번째는 3회차부터의 목록 한계 낱말이다', () => {
    expect(c.today.mood.options[5]).toBe('딱 맞는 말이 없음');
    expect(c.today.mood.exclusive).toBe('딱 맞는 말이 없음');
    expect(c.today.mood.max).toBe(2);
  });
});

// ADR-108 고정 검사 — 이 회차의 판단이 문안에서 되돌아가지 않는다.
describe('5회차 문안이 되돌아가지 않는다 (ADR-108)', () => {
  it('트리거 짝 — 신호 강제 구조', () => {
    expect(c.today.pairText.connector).toBe('→ 그러면');
  });

  it('결산 다섯째 — 조정은 실패가 아니다', () => {
    expect(c.step.lastStep.options).toContain('크기나 내용을 바꿨습니다');
  });

  // 4회차가 '다음 시간의 재료가 됩니다'로 넘겼고 그 재료를 받는 회차가 여기다.
  //   5회차가 또 넘기면 약속이 이월만 된다.
  it('방해 요인 보조 문구가 3회차 위로로 돌아왔다', () => {
    expect(c.step.blocker.help).toBe('미리 적어 두면, 그때 무엇을 할지 이미 정해져 있습니다.');
    expect(CHECKIN_SESSION_4.step.blocker.help).toBe('여기 적어 두신 것이 다음 시간의 재료가 됩니다.');
  });

  it('나에게 주는 한마디가 앞을 본다 — WILL 파트', () => {
    expect(c.wrap.selfNote.label).toBe('이번 주를 살아낼 나에게, 한마디만 건네주세요.');
  });
});
