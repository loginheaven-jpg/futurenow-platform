// 통합 홈 순수 판정 둘 (4차 F-3) — `roleTarget` · `buildSessionChips`.
//
// **부품에서 내린 계산에 테스트를 건다**(지휘부 지시). 부품 안에 있을 때는 화면을 띄워야 봤지만
//   순수 함수가 되면 표로 전수할 수 있다 — `progress.test.ts`·`consoleNav` 와 같은 방식이다.
import { describe, expect, it } from 'vitest';
import type { CohortSession, MyCohortSummary } from '@/contracts';
import { roleTarget, roleTargets } from './roleTarget';
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

// ── 5차 T-5 · 겸직 (발주 §5 · 확정 4) ───────────────────────────────────
//
// **실측이 근거다**(2026-08-29 운영): 인도자·운영자의 회기 등록 `admin 4 + coach 3 = 7행`,
// 사람으로는 **3명**. 발주 §5 가 적은 *7행* 과 일치한다. 겸직은 가정이 아니라 사실이다.
describe('roleTargets — 겸직자에게 카드가 둘 선다 (T-5)', () => {
  it('**목적지를 한 곳도 바꾸지 않는다** — 첫 칸이 옛 단일 반환과 같다(회귀 0)', () => {
    const cases: [Parameters<typeof roleTargets>[0], MyCohortSummary[]][] = [
      ['admin', []], ['coach', []], ['user', []],
      ['user', [cohort()]], ['user', [cohort(), cohort({ cohortId: 'c2' })]],
      ['user', [cohort({ status: 'archived' })]],
      ['admin', [cohort()]], ['coach', [cohort()]],
    ];
    for (const [role, cohorts] of cases) {
      expect(roleTargets(role, cohorts)[0]).toEqual(roleTarget(role, cohorts));
    }
  });

  it('인도자 + 자기 회기 → 콘솔 카드와 기수 카드 **둘**', () => {
    const t = roleTargets('coach', [cohort()]);
    expect(t).toHaveLength(2);
    expect(t[0].href).toBe('/coach');
    expect(t[1].href).toBe('/my/cohorts/c1');
    expect(t[1].who, '두 번째 카드에서 나는 참여자다').toBe('참여자');
  });

  it('운영자 + 자기 회기 → 본부 카드와 기수 카드 **둘**', () => {
    const t = roleTargets('admin', [cohort()]);
    expect(t.map((x) => x.href)).toEqual(['/admin', '/my/cohorts/c1']);
  });

  it('회기가 여럿이면 두 번째 카드는 **목록**이다 — 하나를 임의로 고르지 않는다', () => {
    const t = roleTargets('coach', [cohort(), cohort({ cohortId: 'c2' })]);
    expect(t.map((x) => x.href)).toEqual(['/coach', '/my/cohorts']);
  });

  it('**빈손 카드를 덧붙이지 않는다** — 회기 없는 인도자에게 `체크 보기` 는 겸직이 아니라 노이즈다', () => {
    expect(roleTargets('coach', []).map((x) => x.href)).toEqual(['/coach']);
    expect(roleTargets('admin', []).map((x) => x.href)).toEqual(['/admin']);
    expect(roleTargets('coach', [cohort({ status: 'archived' })]).map((x) => x.href)).toEqual(['/coach']);
  });

  it('참여자는 언제나 하나다 — 늘어나는 것은 겸직자뿐이다', () => {
    expect(roleTargets('user', [cohort()])).toHaveLength(1);
    expect(roleTargets('user', [])).toHaveLength(1);
    expect(roleTargets('user', [cohort(), cohort({ cohortId: 'c2' })])).toHaveLength(1);
  });

  it('순서가 규칙으로 고정된다 — 역할 카드가 먼저, 참여자 카드가 뒤', () => {
    for (const role of ['coach', 'admin'] as const) {
      const t = roleTargets(role, [cohort()]);
      expect(t[0].who).not.toBe('참여자');
      expect(t[1].who).toBe('참여자');
    }
  });

  it('카드마다 목적지가 다르다 — 같은 곳으로 가는 카드를 둘 그리지 않는다', () => {
    for (const role of ['coach', 'admin', 'user'] as const) {
      const hrefs = roleTargets(role, [cohort()]).map((x) => x.href);
      expect(new Set(hrefs).size).toBe(hrefs.length);
    }
  });
});
