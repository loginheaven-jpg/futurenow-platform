import { describe, expect, it } from 'vitest';
import type { CohortSession } from '@/contracts';
import { buildProgress, openedSessionNos } from './progress';

const KST = '+09:00';
const s = (n: number, opens: string, closes: string): CohortSession => ({
  cohortId: 'c1',
  sessionNo: n,
  heldAt: `${opens}T10:00:00${KST}`,
  opensAt: `${opens}T00:00:00${KST}`,
  closesAt: `${closes}T23:59:00${KST}`,
});
// 1기 실제 일정(KST).
const SEVEN: CohortSession[] = [
  s(1, '2026-07-26', '2026-08-01'), s(2, '2026-08-02', '2026-08-08'), s(3, '2026-08-09', '2026-08-15'),
  s(4, '2026-08-16', '2026-08-22'), s(5, '2026-08-23', '2026-08-29'), s(6, '2026-08-30', '2026-09-05'),
  s(7, '2026-09-06', '2026-09-13'),
];
const at = (iso: string) => new Date(`${iso}${KST}`).getTime();

describe('buildProgress (7주 기록 누적 · ADR-102 축3)', () => {
  it('제출한 회차만 채움으로 센다', () => {
    const p = buildProgress(SEVEN, new Set([1, 2]));
    expect(p).toEqual({ total: 7, done: 2, cells: [true, true, false, false, false, false, false] });
  });

  it('일정이 없으면 그리지 않는다 — 칸 0개짜리 빈 줄은 정보가 아니다', () => {
    expect(buildProgress([], new Set())).toBeNull();
  });

  // 7 로 박으면 5주·6주 편성을 팔 때 깨진다. 회차 수는 cohort_sessions 가 정한다.
  it('회차 수는 일정에서 읽는다 — 5주 편성이면 다섯 칸', () => {
    const five = SEVEN.slice(0, 5);
    const p = buildProgress(five, new Set([1]));
    expect(p?.total).toBe(5);
    expect(p?.cells).toHaveLength(5);
  });

  it('입력 순서가 뒤집혀도 회차 번호 오름차순으로 그린다', () => {
    const p = buildProgress([...SEVEN].reverse(), new Set([3]));
    expect(p?.cells).toEqual([false, false, true, false, false, false, false]);
  });

  // 제출하지 않은 '작성 중'을 채움으로 세면 다 쓰지 않고도 칸이 차 보이고,
  //   그러면 이 표시가 돌아올 이유를 없앤다(ADR-91 B 의 목적과 반대가 된다).
  it('집합에 없는 회차는 비움이다', () => {
    expect(buildProgress(SEVEN, new Set())?.done).toBe(0);
  });
});

describe('openedSessionNos — 이미 열린 회차만 묻는다', () => {
  it('미래 회차는 제외한다(카드 라우트가 진입을 막아 제출이 있을 수 없다)', () => {
    expect(openedSessionNos(SEVEN, at('2026-08-10T12:00:00'))).toEqual([1, 2, 3]);
  });

  it('아직 아무 회차도 열리지 않았으면 빈 배열 — 왕복 0', () => {
    expect(openedSessionNos(SEVEN, at('2026-07-01T12:00:00'))).toEqual([]);
  });

  it('전 회차가 열린 뒤에는 전부', () => {
    expect(openedSessionNos(SEVEN, at('2026-09-30T12:00:00'))).toHaveLength(7);
  });
});
