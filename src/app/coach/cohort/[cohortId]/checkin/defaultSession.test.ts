import { describe, expect, it } from 'vitest';
import type { CohortSession } from '@/contracts';
import { defaultSessionNo } from './defaultSession';

// 1기 실제 일정(KST) 그대로. 창이 겹치지 않는다 — 마감 23:59 → 다음 개시 00:00.
const KST = '+09:00';
const s = (n: number, opens: string, closes: string): CohortSession => ({
  cohortId: 'c1',
  sessionNo: n,
  heldAt: `${opens}T10:00:00${KST}`,
  opensAt: `${opens}T00:00:00${KST}`,
  closesAt: `${closes}T23:59:00${KST}`,
});
const SCHEDULE: CohortSession[] = [
  s(1, '2026-07-26', '2026-08-01'),
  s(2, '2026-08-02', '2026-08-08'),
  s(3, '2026-08-09', '2026-08-15'),
  s(4, '2026-08-16', '2026-08-22'),
];
const at = (iso: string) => new Date(`${iso}${KST}`).getTime();

describe('defaultSessionNo (회차 현황 기본 선택 · ADR-94 §4-1)', () => {
  it('열린 회차를 고른다 — 8/9 에 열면 3회차', () => {
    expect(defaultSessionNo(SCHEDULE, at('2026-08-09T09:00:00'))).toBe(3);
  });

  it('창 안이면 언제든 그 회차 — 2회차 마감 당일 오후는 2회차', () => {
    expect(defaultSessionNo(SCHEDULE, at('2026-08-08T18:00:00'))).toBe(2);
  });

  it('마감과 다음 개시 사이(빈틈)에는 마지막으로 마감된 회차', () => {
    // 8/8 23:59:30 — 2회차는 닫혔고 3회차는 아직 안 열렸다.
    expect(defaultSessionNo(SCHEDULE, at('2026-08-08T23:59:30'))).toBe(2);
  });

  it('전 회차 종료 후에는 마지막 회차', () => {
    expect(defaultSessionNo(SCHEDULE, at('2026-09-30T12:00:00'))).toBe(4);
  });

  it('아직 아무 회차도 열리지 않았으면 첫 회차', () => {
    expect(defaultSessionNo(SCHEDULE, at('2026-07-01T12:00:00'))).toBe(1);
  });

  it('일정이 없으면 1', () => {
    expect(defaultSessionNo([], at('2026-08-09T09:00:00'))).toBe(1);
  });

  // 일정 편집 화면이 임의 날짜를 허용하므로 창이 겹칠 수 있다. 겹치면 뒤엣것이 지금 준비하는 회차다.
  it('창이 겹치면 회차 번호가 큰 쪽', () => {
    const overlap: CohortSession[] = [s(1, '2026-08-01', '2026-08-20'), s(2, '2026-08-05', '2026-08-25')];
    expect(defaultSessionNo(overlap, at('2026-08-10T12:00:00'))).toBe(2);
  });

  // 배열 순서에 기대지 않는다 — listCohortSessions 정렬이 바뀌어도 같은 답이어야 한다.
  it('입력 순서가 뒤집혀도 같은 답', () => {
    expect(defaultSessionNo([...SCHEDULE].reverse(), at('2026-08-09T09:00:00'))).toBe(3);
  });
});
