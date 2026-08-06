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

describe('confidence 는 필수가 아니다 — 제출을 막지 않는다', () => {
  for (const c of ALL) {
    it(`${c.sessionNo}회차: 결측 목록에 confidence 가 없다`, () => {
      expect(c.missingKeys({})).not.toContain(c.wrap.confidence.key);
    });
  }
});

describe('결측 라벨은 레지스트리 문안 원문이다 — 합성하지 않는다(새 문안 0)', () => {
  it('1회차 라벨이 화면 문구와 문자 단위로 같다', () => {
    const c = CHECKIN_SESSION_1;
    const labels = c.missingLabels({});
    expect(labels).toContain(c.today.pairText.from.label);
    expect(labels).toContain(c.today.pairText.to.label);
    expect(labels).toContain(c.today.identity.label);
    expect(labels).toContain(c.today.mood.label);
    expect(labels).toContain(c.step.what.label);
    expect(labels).toContain(c.step.when.label);
    expect(labels).toContain(c.wrap.selfNote.label);
  });

  it('3회차 라벨이 화면 문구와 문자 단위로 같다', () => {
    const c = CHECKIN_SESSION_3;
    const labels = c.missingLabels({});
    expect(labels).toContain(c.today.areaPick.label);
    expect(labels).toContain(c.today.areaPick.line.label);
    expect(labels).toContain(c.today.pairText.from.label);
    expect(labels).toContain(c.today.pairText.to.label);
    expect(labels).toContain(c.step.lastStep.label);
    expect(labels).toContain(c.wrap.selfNote.label);
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
