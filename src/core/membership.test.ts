// 경계 검증자 단위테스트 — 단계 2·3 자진 신고분(무테스트로 서 있던 toMemberState).
import { describe, it, expect } from 'vitest';
import { MEMBER_STATES, toMemberState } from './membership';
import { ACCESS_TABLE, PRIORITY_CASES } from '../../tests/fixtures/membershipAccess';

describe('toMemberState — 계약 안의 값만 통과시킨다', () => {
  it('다섯 상태를 그대로 돌려준다', () => {
    for (const s of MEMBER_STATES) expect(toMemberState(s)).toBe(s);
  });

  it('계약 밖 문자열을 거부한다', () => {
    // DB 가 새 상태를 늘렸는데 계약이 안 따라온 경우 — 조용히 흐르면 화면이 엉뚱한 분기를 탄다.
    for (const bad of ['COHORT', 'active', 'suspended', '', 'individual ']) {
      expect(() => toMemberState(bad)).toThrow(/계약 밖/);
    }
  });

  it('문자열이 아닌 값을 거부한다', () => {
    for (const bad of [null, undefined, 0, 1, true, {}, [], ['cohort']]) {
      expect(() => toMemberState(bad)).toThrow(/계약 밖/);
    }
  });

  it('거부 메시지에 받은 값이 실린다 — 원인을 바로 읽게', () => {
    expect(() => toMemberState('suspended')).toThrow(/suspended/);
  });
});

describe('진실표 픽스처가 스스로 온전하다', () => {
  it('다섯 상태를 빠짐없이 한 번씩 덮는다', () => {
    const states = ACCESS_TABLE.map((r) => r.state).sort();
    expect(states).toEqual([...MEMBER_STATES].sort());
    expect(new Set(states).size).toBe(ACCESS_TABLE.length);
  });

  it('열람 열이 없다 — 열람은 상태와 무관하다(메모 §2-가)', () => {
    // 표에 열람 열이 생기면 그 확정이 무너진 것이다. 없는 것이 곧 규율이라 없음을 단언한다.
    for (const row of ACCESS_TABLE) {
      expect(Object.keys(row).sort()).toEqual(['journey', 'standing', 'state', 'why']);
    }
  });

  it('응시 가능한 상태는 cohort·individual 둘뿐이다', () => {
    const canAny = ACCESS_TABLE.filter((r) => r.journey || r.standing).map((r) => r.state).sort();
    expect(canAny).toEqual(['cohort', 'individual']);
  });

  it('여정을 열 수 있는 상태는 cohort 하나다', () => {
    expect(ACCESS_TABLE.filter((r) => r.journey).map((r) => r.state)).toEqual(['cohort']);
  });

  it('우선순위 케이스가 진실표 안의 상태만 기대한다', () => {
    const known = new Set(ACCESS_TABLE.map((r) => r.state));
    for (const c of PRIORITY_CASES) expect(known.has(c.expect)).toBe(true);
  });

  it('held 가 cohort 를 이기는 케이스가 표에 실재한다', () => {
    const c = PRIORITY_CASES.find((x) => x.seminarEnrolled && x.stored === 'held');
    expect(c?.expect).toBe('held');
  });

  it('**자동 만료가 폐지됐다** — 기간이 지나도 저장값 그대로다(2026-08-30)', () => {
    // 옛 기댓값은 `expired` 였다. 그것이 *최박사가 지정하신 승급을 시간으로 푸는* 유일한
    //   경로였고, 확정 6(무기한)과 어긋나 폐지됐다(마이그레이션 `20260830090000`).
    //   **표를 바꾸면 그것을 세던 테스트도 함께 움직여야 한다.**
    const c = PRIORITY_CASES.find((x) => x.stored === 'individual' && x.expiredDate === true);
    expect(c?.expect).toBe('individual');
  });

  it('**expired 가 cohort 를 이기는 케이스가 표에 실재한다** — 탈퇴에 준하는 처리', () => {
    // 순서 변경(`held > expired > cohort > 저장 > pending`)이 산출을 바꾸는 **유일한 조합**이다.
    //   해당자 0명이라 지금은 실해가 없으나, 없으면 다음 사람이 순서를 되돌려도 아무것도 울지 않는다.
    const c = PRIORITY_CASES.find((x) => x.seminarEnrolled && x.stored === 'expired');
    expect(c, 'expired + 세미나 등록 케이스가 표에 없다').toBeDefined();
    expect(c?.expect).toBe('expired');
  });

  it('우선순위 진실표가 **다섯 상태를 전부** 기댓값으로 낸다 — 빠진 상태가 없다', () => {
    const covered = new Set(PRIORITY_CASES.map((c) => c.expect));
    expect([...covered].sort()).toEqual(['cohort', 'expired', 'held', 'individual', 'pending']);
  });
});
