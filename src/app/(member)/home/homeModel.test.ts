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

  it('★★ 참여자 · 활성 회기 둘 → **가장 최근 가입한 회기**(ADR-182)', () => {
    // 옛 사실: 목록으로 보냈다(「하나를 임의로 고르지 않는다」). **지휘부 확정 2026-09-03 로 뒤집혔다** —
    //   「활성 회기가 둘 이상 참여자는 **회기를 선택하는 UI**가 필요합니다」.
    //   그래서 **임의로 고르는 것이 아니라 규칙으로 고르고 그 위에서 바꾸게** 한다.
    //   규칙은 새로 짓지 않았다 — `MemberHome` 이 이미 쓰던 `joinedAt` 내림차순이다.
    const t = roleTarget('user', [cohort({ joinedAt: '2026-06-01' }), cohort({ cohortId: 'c2', joinedAt: '2026-08-01' })]);
    expect(t.href, '가장 최근 가입한 회기가 아니다').toBe('/my/cohorts/c2');
    expect(t.participant, '참여자 거점 표시가 없다 — 그러면 홈이 대시보드를 안 그린다').toBe(true);
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

  it('운영자 + 자기 회기 → 본부·**인도자 콘솔**·기수 **셋**', () => {
    // ★ **가운데가 늘었다**(ADR-173). 전에는 둘이었고 그것이 이 잠금의 옛 사실이다 —
    //   `role` 이 단일값이라 운영자에게 인도자 카드가 안 섰다. **권한은 전부터 있었다**
    //   (운영자가 콘솔에 들어가면 전 차수를 본다 · ADR-74) — 홈에 문패만 없었다.
    const t = roleTargets('admin', [cohort()]);
    expect(t.map((x) => x.href)).toEqual(['/admin', '/coach', '/my/cohorts/c1']);
  });

  it('★ 회기가 여럿이면 두 번째 카드는 **지금 볼 회기**다(ADR-182 — 옛 사실은 목록이었다)', () => {
    const t = roleTargets('coach', [cohort(), cohort({ cohortId: 'c2' })]);
    expect(t.map((x) => x.href)).toEqual(['/coach', '/my/cohorts/c1']);
  });

  it('**빈손 카드를 덧붙이지 않는다** — 회기 없는 인도자에게 `체크 보기` 는 겸직이 아니라 노이즈다', () => {
    expect(roleTargets('coach', []).map((x) => x.href)).toEqual(['/coach']);
    // 운영자는 역할 카드가 **둘**이다(ADR-173) — 그래도 빈손 카드는 안 붙는다.
    expect(roleTargets('admin', []).map((x) => x.href)).toEqual(['/admin', '/coach']);
    expect(roleTargets('coach', [cohort({ status: 'archived' })]).map((x) => x.href)).toEqual(['/coach']);
  });

  it('★ 참여자 거점은 언제나 하나다 — 늘어나는 것은 겸직자와 **참여 신청 안내**뿐이다(ADR-183)', () => {
    // 회기 0 이면 「참여 신청」 카드가 한 장 더 선다(지휘부 정의 2026-09-03 · ADR-183).
    //   **참여자 거점 자체는 여전히 하나다** — 그 성질을 이 줄이 지킨다.
    const base = (t: ReturnType<typeof roleTargets>) => t.filter((x) => x.href !== '/recruit');
    expect(base(roleTargets('user', [cohort()]))).toHaveLength(1);
    expect(base(roleTargets('user', []))).toHaveLength(1);
    expect(base(roleTargets('user', [cohort(), cohort({ cohortId: 'c2' })]))).toHaveLength(1);
    // 회기가 있으면 신청 안내를 하지 않는다 — 이미 하신 분께 권하지 않는다.
    expect(roleTargets('user', [cohort()]).some((x) => x.href === '/recruit')).toBe(false);
    expect(roleTargets('user', []).some((x) => x.href === '/recruit'), '회기 0 인데 안내가 없다').toBe(true);
  });

  it('순서가 규칙으로 고정된다 — 역할 카드가 먼저, 참여자 카드가 **맨 뒤**', () => {
    // 운영자는 역할 카드가 둘이 됐으므로(ADR-173) 「[1] 이 참여자」가 아니라
    //   **「맨 뒤가 참여자」**로 잰다. 지키던 것은 자리 번호가 아니라 **순서 규칙**이다.
    for (const role of ['coach', 'admin'] as const) {
      const t = roleTargets(role, [cohort()]);
      expect(t[0].who).not.toBe('참여자');
      expect(t[t.length - 1].who).toBe('참여자');
      // 참여자 카드는 언제나 하나다 — 앞쪽에 섞이지 않는다.
      expect(t.filter((x) => x.who === '참여자')).toHaveLength(1);
    }
  });

  it('카드마다 목적지가 다르다 — 같은 곳으로 가는 카드를 둘 그리지 않는다', () => {
    for (const role of ['coach', 'admin', 'user'] as const) {
      const hrefs = roleTargets(role, [cohort()]).map((x) => x.href);
      expect(new Set(hrefs).size).toBe(hrefs.length);
    }
  });
});
