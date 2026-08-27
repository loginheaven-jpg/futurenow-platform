// 통합 홈 순수 판정 둘 (4차 F-3) — `roleTarget` · `buildSessionChips`.
//
// **부품에서 내린 계산에 테스트를 건다**(지휘부 지시). 부품 안에 있을 때는 화면을 띄워야 봤지만
//   순수 함수가 되면 표로 전수할 수 있다 — `progress.test.ts`·`consoleNav` 와 같은 방식이다.
import { describe, expect, it } from 'vitest';
import type { CohortSession, MyCohortSummary } from '@/contracts';
import { roleTarget } from './roleTarget';
import { buildSessionChips } from './sessionChips';

const cohort = (over: Partial<MyCohortSummary> = {}): MyCohortSummary => ({
  cohortId: 'c1', name: '예봄 2기', coachName: null, status: 'active',
  preDone: true, postDone: false, postOpened: false,
  openSessionNo: null, openSessionSubmitted: false, openSessionHasContent: false,
  joinedAt: '2026-08-01T00:00:00Z', ...over,
});

describe('roleTarget — **목적지를 한 곳도 바꾸지 않았다**(기존 RoleCard 대비 회귀 0)', () => {
  it.each([
    ['admin' as const, [], '/admin'],
    ['coach' as const, [], '/coach'],
    ['user' as const, [], '/home/assessments'],
  ])('%s · 차수 없음 → %s', (role, cohorts, href) => {
    expect(roleTarget(role, cohorts).href).toBe(href);
  });

  it('참여자 · 활성 차수 하나 → 그 차수 홈(임의로 고르지 않는다)', () => {
    expect(roleTarget('user', [cohort()]).href).toBe('/my/cohorts/c1');
  });

  it('참여자 · 활성 차수 둘 → 목록(하나를 임의로 고르지 않는다)', () => {
    const t = roleTarget('user', [cohort(), cohort({ cohortId: 'c2' })]);
    expect(t.href).toBe('/my/cohorts');
  });

  it('**보관된 차수는 세지 않는다** — 활성만 거점이 된다', () => {
    expect(roleTarget('user', [cohort({ status: 'archived' })]).href).toBe('/home/assessments');
  });

  it('열린 회차가 있으면 **사실만** 말한다 — 재촉 문구가 아니다', () => {
    const t = roleTarget('user', [cohort({ openSessionNo: 2, openSessionSubmitted: false })]);
    expect(t.sub).toBe('2회차 갈무리가 열려 있습니다');
    expect(t.cohort, '기수명은 배지로 간다').toBe('예봄 2기');
  });

  it('제출을 마쳤으면 회차를 들먹이지 않는다', () => {
    const t = roleTarget('user', [cohort({ openSessionNo: 2, openSessionSubmitted: true })]);
    expect(t.sub).not.toContain('2회차');
  });
});

describe('buildSessionChips — 시안 E 회차 칩', () => {
  const NOW = Date.parse('2026-09-30T00:00:00Z');
  const s = (no: number, opensDay: number): CohortSession => ({
    cohortId: 'c1', sessionNo: no,
    heldAt: `2026-09-${String(opensDay).padStart(2, '0')}T00:00:00Z`,
    opensAt: `2026-09-${String(opensDay).padStart(2, '0')}T00:00:00Z`,
    closesAt: `2026-12-01T00:00:00Z`,
  });
  const sessions = [s(1, 1), s(2, 8), s(3, 15), s(4, 22), s(5, 29), s(6, 30)];

  it('네 상태가 규칙대로 갈린다', () => {
    const chips = buildSessionChips({
      cohortId: 'c1', sessions, submitted: new Set([1]), openSessionNo: 2, now: Date.parse('2026-09-20T00:00:00Z'),
    });
    expect(chips.map((c) => c.state)).toEqual(['done', 'current', 'open', 'locked', 'locked', 'locked']);
  });

  it('**진행 중은 한 칸뿐이다**', () => {
    const chips = buildSessionChips({ cohortId: 'c1', sessions, submitted: new Set(), openSessionNo: 3, now: NOW });
    expect(chips.filter((c) => c.state === 'current')).toHaveLength(1);
  });

  it('**잠긴 회차를 감추지 않는다** — 여정의 전체 길이가 보인다', () => {
    const chips = buildSessionChips({
      cohortId: 'c1', sessions, submitted: new Set(), openSessionNo: 1, now: Date.parse('2026-09-02T00:00:00Z'),
    });
    expect(chips).toHaveLength(6);
    expect(chips.filter((c) => c.state === 'locked')).toHaveLength(5);
  });

  it('잠긴 회차에는 링크를 주지 않는다 — 갈 수 없는 곳으로 보내지 않는다', () => {
    const chips = buildSessionChips({
      cohortId: 'c1', sessions, submitted: new Set(), openSessionNo: null, now: Date.parse('2026-09-02T00:00:00Z'),
    });
    for (const c of chips.filter((x) => x.state === 'locked')) expect(c.href).toBeUndefined();
    expect(chips[0].href, '열린 회차는 링크가 있다').toBe('/my/cohorts/c1/checkin/1');
  });

  it('**회차 수를 6 으로 박지 않는다** — 행 수에서 읽는다(5주 편성)', () => {
    const five = sessions.slice(0, 5);
    expect(buildSessionChips({ cohortId: 'c1', sessions: five, submitted: new Set(), openSessionNo: null, now: NOW })).toHaveLength(5);
  });

  it('일정이 없으면 칩도 없다', () => {
    expect(buildSessionChips({ cohortId: 'c1', sessions: [], submitted: new Set(), openSessionNo: null, now: NOW })).toEqual([]);
  });

  it('번호 순서를 보장한다 — 입력이 뒤섞여도', () => {
    const shuffled = [s(3, 15), s(1, 1), s(2, 8)];
    const chips = buildSessionChips({ cohortId: 'c1', sessions: shuffled, submitted: new Set(), openSessionNo: null, now: NOW });
    expect(chips.map((c) => c.no)).toEqual([1, 2, 3]);
  });
});
