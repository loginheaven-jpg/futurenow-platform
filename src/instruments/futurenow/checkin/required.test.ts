import { describe, expect, it } from 'vitest';
import { CHECKIN_SESSION_1 } from './session1';
import { CHECKIN_SESSION_2 } from './session2';
import { CHECKIN_SESSION_3 } from './session3';

const ALL = [CHECKIN_SESSION_1, CHECKIN_SESSION_2, CHECKIN_SESSION_3];

// 실측(1기 1회차 제출 8건 중 3건)이 2·3면을 통째로 건너뛴 채 제출됐다. 제출 게이트가 그걸 막는데,
// 게이트가 서려면 '몇 칸 비었나'(filledCount)와 '무엇이 비었나'(missingLabels)가 절대 어긋나면 안 된다.
// ADR-91: 둘 다 하나의 required 선언에서 파생되므로 어긋날 수 없다 — 그 사실을 여기서 못 박는다.
describe('filledCount 와 missingLabels 는 같은 판정에서 나온다', () => {
  for (const c of ALL) {
    it(`${c.sessionNo}회차: 빈 답이면 모든 필수 묶음이 결측이다`, () => {
      expect(c.filledCount({})).toBe(0);
      // 쌍 문항은 양쪽이 다 결측이므로 라벨 수 ≥ 묶음 수
      expect(c.missingLabels({}).length).toBeGreaterThanOrEqual(c.requiredTotal);
      expect(c.missingKeys({}).length).toBe(c.missingLabels({}).length);
    });

    it(`${c.sessionNo}회차: 라벨과 키의 순서가 같다(첫 빈 칸으로 옮겨 갈 수 있다)`, () => {
      const keys = c.missingKeys({});
      const labels = c.missingLabels({});
      expect(keys).toHaveLength(labels.length);
      expect(new Set(keys).size).toBe(keys.length); // 중복 없음
    });

    it(`${c.sessionNo}회차: 결측이 0이면 filledCount 가 총계와 같다`, () => {
      // 모든 필수 키를 채운 답을 결측 목록에서 역으로 만든다.
      const full: Record<string, unknown> = {};
      for (const k of c.missingKeys({})) full[k] = k === 'mood' ? ['x'] : 'x';
      expect(c.missingLabels(full)).toEqual([]);
      expect(c.filledCount(full)).toBe(c.requiredTotal);
    });
  }
});

describe('쌍 문항 — 비어 있는 쪽만 나온다', () => {
  it('1회차 갈망: 한쪽만 채우면 나머지 한쪽만 결측', () => {
    const m = CHECKIN_SESSION_1.missingKeys({ desire_from: '전' });
    expect(m).toContain('desire_to');
    expect(m).not.toContain('desire_from');
    // 그래도 묶음은 미충족이라 칸 수는 늘지 않는다
    expect(CHECKIN_SESSION_1.filledCount({ desire_from: '전' })).toBe(0);
  });

  it('3회차 습관 짝: 없앨 것만 적으면 들일 것만 결측 — 제거는 창조와 짝을 이룬다', () => {
    const m = CHECKIN_SESSION_3.missingKeys({ habit_stop: '휴대폰' });
    expect(m).toContain('habit_start');
    expect(m).not.toContain('habit_stop');
  });

  it('2회차 영역: 칩만 고르고 문장을 비우면 문장만 결측', () => {
    const m = CHECKIN_SESSION_2.missingKeys({ future_area: '관계' });
    expect(m).toContain('future_line');
    expect(m).not.toContain('future_area');
  });
});

describe('빈 값 판정', () => {
  it('공백만 있는 문자열은 빈 것으로 본다', () => {
    expect(CHECKIN_SESSION_1.missingKeys({ self_note: '   ' })).toContain('self_note');
  });
  it('빈 배열(마음)은 빈 것으로 본다', () => {
    expect(CHECKIN_SESSION_1.missingKeys({ mood: [] })).toContain('mood');
    expect(CHECKIN_SESSION_1.missingKeys({ mood: ['후련함'] })).not.toContain('mood');
  });
});

// ADR-101 — 마음의 대체 칸. 칩(mood)과 직접 쓰기(mood_custom)는 서로 다른 칸이라,
//   목록에 없는 감정을 상자에만 적은 사람이 mood 가 빈 배열이라 제출에서 막혔다.
//   본인은 방금 적었는데 '마음이 비었다'는 안내를 받는 상태였다.
describe('마음 — 직접 쓰기만 채워도 충족한다 (ADR-101)', () => {
  const c = CHECKIN_SESSION_3;
  const 나머지 = {
    gap_area: '관계', gap_want: '아버지와 다시 대화하기',
    habit_start: '자기 전 책 두 쪽', habit_stop: '자기 전 휴대폰',
    last_step_result: '했습니다', step_what: '저녁에 전화', step_when: '수요일 저녁',
    self_note: '오늘 도망가지 않았다',
  };

  it('칩은 비었고 직접 쓰기만 적었다 → 6칸 충족·결측 0', () => {
    const a = { ...나머지, mood: [], mood_custom: '뭐라 해야 할지 모르겠는데, 후련하다' };
    expect(c.filledCount(a)).toBe(6);
    expect(c.missingKeys(a)).not.toContain('mood');
  });

  it('둘 다 비면 여전히 결측이다 — 느슨해진 것이 아니다', () => {
    const a = { ...나머지, mood: [], mood_custom: '' };
    expect(c.filledCount(a)).toBe(5);
    expect(c.missingKeys(a)).toContain('mood');
    // 결측 안내는 칩 라벨 하나만 가리킨다(상자는 바로 아래 있어 둘을 나열하면 오히려 헷갈린다).
    expect(c.missingLabels(a).filter((l) => l.includes('마음은 어떤가요'))).toHaveLength(1);
  });

  it('공백만 적은 것은 빈 것으로 본다', () => {
    expect(c.missingKeys({ ...나머지, mood: [], mood_custom: '   ' })).toContain('mood');
  });

  // 칩을 대신 눌러 주는 방식은 쓰지 않는다 — 참여자가 하지 않은 말을 저장하게 되기 때문이다.
  //   판정만 인정하고 저장값은 건드리지 않는다는 사실을 못 박는다.
  it('판정만 인정한다 — 저장값에 칩을 만들어 넣지 않는다', () => {
    const a = { ...나머지, mood: [], mood_custom: '후련하다' };
    expect(c.filledCount(a)).toBe(6);
    expect(a.mood).toEqual([]); // 판정을 물어봐도 답이 바뀌지 않는다
  });

  // 1·2회차는 마감된 회차다. 판정을 바꾸면 이미 저장된 행의 '남은 칸 수'가 소급해서 달라진다(ADR-91 §2-4).
  it('1·2회차는 그대로다 — 직접 쓰기만으로는 충족하지 않는다', () => {
    for (const s of [CHECKIN_SESSION_1, CHECKIN_SESSION_2]) {
      expect(s.missingKeys({ mood: [], mood_custom: '후련하다' }), `${s.sessionNo}회차`).toContain('mood');
    }
  });
});

describe('confidence 는 필수가 아니다 — 제출을 막지 않는다', () => {
  for (const c of ALL) {
    it(`${c.sessionNo}회차: 결측 목록에 confidence 가 없다`, () => {
      expect(c.missingKeys({})).not.toContain(c.wrap.confidence.key);
    });
  }
});

// required 선언에는 라벨이 **문자열로 다시 적혀 있다**. 그래서 문안 쪽 라벨만 고치고 선언을 안 고치면
// 두 곳이 어긋나 이중 진실이 된다 — 리터럴 잠금(ADR-90)은 baseline 대비 '변경'만 보므로 이 어긋남은 못 잡는다.
//
// 슬롯 이름을 열거하면 회차가 늘 때마다 손으로 추가해야 하고 그러다 빠진다(실제로 2회차가 빠져 있었다).
// 그래서 **'결측 라벨이 그 회차 문안 어딘가에 실제로 있는가'** 로 일반화한다 — 4~7회차가 자동으로 덮인다.
function copyStrings(node: unknown, out = new Set<string>()): Set<string> {
  if (typeof node === 'string') out.add(node);
  else if (Array.isArray(node)) for (const v of node) copyStrings(v, out);
  else if (node && typeof node === 'object') for (const v of Object.values(node)) copyStrings(v, out);
  return out; // 함수(filledCount·counter)는 걸러진다
}

describe('결측 라벨은 레지스트리 문안 원문이다 — 합성하지 않는다(새 문안 0)', () => {
  for (const c of ALL) {
    it(`${c.sessionNo}회차: 모든 결측 라벨이 그 회차 문안에 실제로 있다`, () => {
      const inCopy = copyStrings(c);
      const orphans = c.missingLabels({}).filter((l) => !inCopy.has(l));
      expect(orphans, `문안에 없는 라벨(이중 진실): ${JSON.stringify(orphans)}`).toEqual([]);
    });
  }

  it('일반화가 실제로 동작한다 — 문안에 없는 라벨은 잡힌다', () => {
    const inCopy = copyStrings(CHECKIN_SESSION_2);
    expect(inCopy.has('오늘 그린 다섯 영역 중, 가장 가슴이 뛴 하나를 옮겨 주세요. (책 69~73쪽)')).toBe(true);
    expect(inCopy.has('없는 문안')).toBe(false);
  });
});

describe('실측 재현 — 1면만 채우고 제출한 3건', () => {
  it('1회차: 1면만 채우면 2·3면 세 칸이 결측으로 잡힌다', () => {
    const onlyPage1 = {
      desire_from: '나는 늘 소심했다',
      desire_to: '나는 신중한 사람이다',
      identity_sentence: '나는 성장의 가치를 최우선으로 여긴다',
      mood: ['후련함'],
    };
    const keys = CHECKIN_SESSION_1.missingKeys(onlyPage1);
    expect(keys).toEqual(['step_what', 'step_when', 'self_note']);
    expect(CHECKIN_SESSION_1.filledCount(onlyPage1)).toBe(3);
    expect(CHECKIN_SESSION_1.requiredTotal).toBe(5);
  });
});
