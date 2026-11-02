// 그룹 리포트 집계 잠금 — 인수 기준 1~6·9(ORDER group_report v2 §4).
//
// **채점하지 않는다**(경계 2) — 여기 있는 것은 전부 `FuturenowScores` 에서 **파생**한 값이다.
import { describe, expect, it } from 'vitest';
import { scoreFuturenow, type FuturenowScores } from '../scoring';
import {
  attendance, careList, vitalityBuckets, vitalityMean, trapGroups, gapGroups,
  CARE_TAG, displayName, type GroupMember,
  averageScores, attribution,
} from './groupModel';

/** 점수를 **직접 짓지 않고** 필요한 자리만 덮는다 — 채점 규칙을 흉내 내면 그것을 재게 된다(계열 ⑦). */
function member(userId: string, name: string | null, patch: Partial<FuturenowScores>): GroupMember {
  const base = scoreFuturenow({} as never);
  return { userId, name, responseId: `r-${userId}`, scores: { ...base, ...patch } as FuturenowScores };
}
const vit = (n: number, low = n <= 10) => ({ vitality: { score: n, low } });
const flags = (byVitality = false, byCareCheck = false) =>
  ({ redFlag: { triggered: byVitality || byCareCheck, byVitality, byCareCheck } });

describe('블록 0 — 응답 현황은 **완료 / 미완료 두 단계**다', () => {
  it('미완료 = 등록자 − 응답자', () => {
    const done = [member('u1', '가', vit(12)), member('u2', '나', vit(20))];
    const a = attendance(
      [{ userId: 'u1', name: '가' }, { userId: 'u2', name: '나' }, { userId: 'u3', name: '다' }],
      done,
    );
    expect(a.enrolled).toBe(3);
    expect(a.done).toHaveLength(2);
    expect(a.pending.map((p) => p.userId)).toEqual(['u3']);
  });

  it('★ 미완료자는 `scores` 를 갖지 않는다 — 분포·평균에 섞일 수 없다', () => {
    const a = attendance([{ userId: 'u1', name: '가' }], []);
    // 타입이 이미 막는다: pending 은 { userId, name } 뿐이다.
    expect('scores' in (a.pending[0] as object)).toBe(false);
    expect(vitalityMean(a.done)).toBeNull();
  });

  it('이름이 없어도 한 낱말로 부른다 — 블록마다 다르면 같은 사람이 두 이름이 된다', () => {
    expect(displayName({ name: null })).toBe('이름 없음');
    expect(displayName({ name: '가' })).toBe('가');
  });
});

describe('대응 표본 수치 평균 (ADR-205)', () => {
  const scores = (value: number): FuturenowScores => ({
    ...scoreFuturenow({} as never),
    vitality: { score: 5 + value, low: true },
    compass: { NAV1: value, NAV2: 6 - value, NAV3: value + 1, NAV4: 3 },
    gap: { B1: value, B2: value + 1, B3: value + 2, B4: value + 3, B5: value + 4 },
    grow: { G: value, R: 6 - value, O: 3, W: value + 1, F: value, faithAux: { F1: 5, F2: 4 } },
    subjective: { E1: '첫 사람의 답을 대표 답으로 쓰지 않는다', E2: '원문', E3: '원문' },
  });

  it('빈 표본은 0점 객체 대신 null이다', () => {
    expect(averageScores([])).toBeNull();
  });

  it('모든 수치 축의 산술평균을 반올림하지 않고 계산한다', () => {
    const result = averageScores([scores(1), scores(2), scores(4)]);
    expect(result).toEqual({
      vitality: { score: 22 / 3 },
      compass: { NAV1: 7 / 3, NAV2: 11 / 3, NAV3: 10 / 3, NAV4: 3 },
      gap: { B1: 7 / 3, B2: 10 / 3, B3: 13 / 3, B4: 16 / 3, B5: 19 / 3 },
      grow: { G: 7 / 3, R: 11 / 3, O: 3, W: 10 / 3, F: 7 / 3 },
    });
    expect(result?.compass.NAV1).not.toBe(2.3);
  });

  it('자유서술·돌봄·함정·믿음 보조·구간 판정은 결과에 없다', () => {
    const result = averageScores([scores(1)])!;
    expect(Object.keys(result).sort()).toEqual(['compass', 'gap', 'grow', 'vitality']);
    expect(Object.keys(result.vitality)).toEqual(['score']);
    expect(Object.keys(result.grow)).toEqual(['G', 'R', 'O', 'W', 'F']);
    expect(JSON.stringify(result)).not.toContain('원문');
    expect(JSON.stringify(result)).not.toContain('첫 사람');
  });

  it('원본 점수를 수정하거나 중첩 객체를 재사용하지 않는다', () => {
    const all = [scores(1), scores(2)];
    const original = structuredClone(all);
    const result = averageScores(all)!;
    expect(all).toEqual(original);
    expect(result.compass).not.toBe(all[0].compass);
    expect(result.gap).not.toBe(all[0].gap);
    expect(result.grow).not.toBe(all[0].grow);
  });
});

describe('추천 글 표기 (ADR-205)', () => {
  it('응답 스냅샷의 남/여와 당시 연령대만 공백 없는 구분자로 잇는다', () => {
    expect(attribution({ gender: '남', birthYear: 1996, name: '실명은 제외', phone: '비공개' }, '2026-11-02T00:00:00Z')).toBe('남·30대');
    expect(attribution({ gender: '여', birthYear: 1985 }, '2020-06-01T00:00:00Z')).toBe('여·30대');
  });

  it('UTC 작성 연도를 쓰고 현재 연도나 입력 문자열의 현지 연도를 쓰지 않는다', () => {
    expect(attribution({ birthYear: 1996 }, '2025-12-31T23:30:00-02:00')).toBe('30대');
    expect(attribution({ birthYear: 1996 }, '2026-01-01T00:30:00+09:00')).toBe('20대');
  });

  it.each([
    [2016, '10대'], [1926, '100대'], [2017, '참여자'], [1925, '참여자'],
    ['1996', '참여자'], [1996.5, '참여자'], [NaN, '참여자'], [Infinity, '참여자'],
  ])('생년 %s는 정수·나이 10~100 범위로 제한한다', (birthYear, expected) => {
    expect(attribution({ birthYear }, '2026-11-02T00:00:00Z')).toBe(expected);
  });

  it('없는 성별·연령대는 각각 생략하고 둘 다 없으면 참여자로 쓴다', () => {
    expect(attribution({ gender: '여' }, '잘못된 시각')).toBe('여');
    expect(attribution({ gender: 'male', birthYear: 1986 }, '2026-11-02T00:00:00Z')).toBe('40대');
    expect(attribution({ gender: '남', birthYear: 1996 }, '잘못된 시각')).toBe('남');
    expect(attribution({}, '2026-11-02T00:00:00Z')).toBe('참여자');
    for (const profile of [null, undefined, [], '남', 30]) {
      expect(attribution(profile, '2026-11-02T00:00:00Z')).toBe('참여자');
    }
  });
});

describe('블록 1 — 돌봄 우선순위 (인수 2)', () => {
  it('★ 한 사람당 **하나만**, 순서는 byVitality > byCareCheck > 시들음', () => {
    const rows = careList([
      member('a', '시들', { ...vit(9), ...flags(false, false) }),
      member('b', '요청', { ...vit(16), ...flags(false, true) }),
      member('c', '위험', { ...vit(8), ...flags(true, false) }),
      member('d', '보통', { ...vit(15), ...flags(false, false) }),
    ]);
    expect(rows.map((r) => r.member.userId)).toEqual(['c', 'b', 'a']);
    expect(rows.map((r) => r.kind)).toEqual(['byVitality', 'byCareCheck', 'languish']);
    // 신호가 없는 사람은 명단에 없다.
    expect(rows.find((r) => r.member.userId === 'd')).toBeUndefined();
  });

  it('★ 신호가 여럿이어도 **가장 높은 하나**만 — 세 신호가 다 켜진 사람', () => {
    const rows = careList([member('x', '셋', { ...vit(7), ...flags(true, true) })]);
    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe('byVitality');
  });

  it('돌봄 대상이 0명이면 빈 배열 — 화면이 빈 상태 문구를 그린다', () => {
    expect(careList([member('a', '가', { ...vit(20), ...flags() })])).toEqual([]);
  });

  it('태그가 셋 다 있다', () => {
    expect(CARE_TAG.byVitality).toBe('byVitality');
    expect(CARE_TAG.byCareCheck).toBe('byCareCheck');
    expect(CARE_TAG.languish).toBe('시들음');
  });
});

describe('블록 2 — 활력 분포 경계 (인수 3)', () => {
  it('★ 10=시들음 · 11=중간 · 17=중간 · 18=번성', () => {
    const b = vitalityBuckets([
      member('a', '10', vit(10)), member('b', '11', vit(11)),
      member('c', '17', vit(17)), member('d', '18', vit(18)),
    ]);
    const by = (n: string) => b.find((x) => x.name === n)!.members.map((m) => m.userId);
    expect(by('시들음')).toEqual(['a']);
    expect(by('중간')).toEqual(['b', 'c']);
    expect(by('번성')).toEqual(['d']);
  });

  it('구간이 셋이고 순서가 시들음 → 중간 → 번성이다', () => {
    expect(vitalityBuckets([]).map((b) => b.name)).toEqual(['시들음', '중간', '번성']);
  });

  it('평균은 완료자만으로 낸다', () => {
    expect(vitalityMean([member('a', 'a', vit(10)), member('b', 'b', vit(20))])).toBe(15);
  });
});

describe('블록 3 — 함정 그루핑 (인수 4)', () => {
  it('`trap.primary` 를 그대로 쓴다 — 새 판정이 없다', () => {
    const g = trapGroups([
      member('a', 'a', { trap: { D1: 5, D2: 1, D3: 1, primary: 'D1' } }),
      member('b', 'b', { trap: { D1: 1, D2: 4, D3: 1, primary: 'D2' } }),
      member('c', 'c', { trap: { D1: 3, D2: 1, D3: 1, primary: 'D1' } }),
    ]);
    expect(g.map((x) => x.code)).toEqual(['D1', 'D2', 'D3']);
    expect(g[0].members.map((m) => m.userId)).toEqual(['a', 'c']); // 점수 높은 순
    expect(g[2].members).toHaveLength(0);
  });

  it('★ 동점 규칙은 `scoring` 이 정한다 — 여기서 다시 판정하지 않는다', () => {
    // primary 가 이미 정해져 오면 그것을 따른다. 원점수가 같아도 뒤집지 않는다.
    const g = trapGroups([member('t', 't', { trap: { D1: 4, D2: 4, D3: 4, primary: 'D1' } })]);
    expect(g[0].members.map((m) => m.userId)).toEqual(['t']);
    expect(g[1].members).toHaveLength(0);
  });

  it('라벨과 설명이 셋 다 있다', () => {
    const g = trapGroups([]);
    expect(g.map((x) => x.label)).toEqual(['관성', '준비', '안주']);
    expect(g.every((x) => x.desc.length > 0)).toBe(true);
  });
});

describe('블록 4 — 가장 간절한 영역 · 동점 (인수 5)', () => {
  const gap = (B1: number, B2: number, B3: number, B4: number, B5: number) => ({ gap: { B1, B2, B3, B4, B5 } });

  it('점수가 **가장 낮은** 영역을 고른다', () => {
    const g = gapGroups([member('a', 'a', gap(8, 3, 9, 7, 6))]);
    expect(g.find((x) => x.code === 'B2')!.members.map((m) => m.member.userId)).toEqual(['a']);
    expect(g.find((x) => x.code === 'B1')!.members).toHaveLength(0);
  });

  it('★ 최저가 두 영역이면 **양쪽 모두** 집계된다 — 합이 인원수보다 클 수 있다', () => {
    const g = gapGroups([member('t', 't', gap(9, 3, 9, 3, 9))]);
    const hit = g.filter((x) => x.members.length > 0).map((x) => x.code);
    expect(hit).toEqual(['B2', 'B4']);
    // 사람은 하나인데 집계는 둘이다. 그것이 의도다.
    expect(g.reduce((n, x) => n + x.members.length, 0)).toBe(2);
  });

  it('해당자가 없는 영역은 빈 배열이다 — 화면이 「해당 없음」을 그린다', () => {
    const g = gapGroups([member('a', 'a', gap(1, 9, 9, 9, 9))]);
    expect(g.filter((x) => x.members.length === 0).map((x) => x.code)).toEqual(['B2', 'B3', 'B4', 'B5']);
  });

  it('다섯 영역이 라벨과 함께 선다', () => {
    expect(gapGroups([]).map((x) => x.label)).toEqual(['일', '재정', '관계', '건강', '기여']);
  });
});
