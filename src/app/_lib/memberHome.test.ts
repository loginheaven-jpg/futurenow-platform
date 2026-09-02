// 참여자 홈 정비 — 시트의 출구와 옮겨 온 문들 (ADR-181).
//
// **왜 잠그나**: 이번 회차가 옮긴 것이 많다. 옮긴 것은 **없어진 것처럼 보이기 쉽고**,
//   다음 사람이 결손으로 보고 되살리면 **한 화면에서 두 번 말하는 상태로 되돌아간다.**
//   그래서 「사라졌는가」가 아니라 **「새 자리에 있는가」**를 잰다.
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import type { CoreContext, MyCohortSummary } from '@/contracts';
import { buildMemberSheet } from './memberSheet';
import { HOME_DOOR, CONSOLE_DOOR, ADMIN_DOOR, SITE_DOOR } from '@/app/_vocab/doors';
import { JOIN_BY_CODE, MY_REPORT, MY_SEMINARS } from '@/app/_vocab/memberMenu';
import { COHORT_WORD } from '@/core/membershipVocab';

const cohort = (over: Partial<MyCohortSummary> = {}): MyCohortSummary => ({
  cohortId: 'c1', name: '예봄 2기', coachName: null, status: 'active',
  preDone: false, postDone: false, postOpened: false,
  openSessionNo: null, openSessionSubmitted: false, openSessionHasContent: false,
  joinedAt: '2026-06-01', ...over,
});

/** 시트가 부르는 것만 흉내 낸다 — 회차 칩은 이 잠금의 대상이 아니다. */
const ctx = () => ({
  listCohortSessions: vi.fn(async () => []),
  getMyCheckin: vi.fn(async () => null),
}) as unknown as CoreContext;

const hrefs = (groups: { items: { href: string }[] }[]) => groups.flatMap((g) => g.items.map((i) => i.href));
const labels = (groups: { items: { label: string }[] }[]) => groups.flatMap((g) => g.items.map((i) => i.label));

describe('★★ 시트에 출구가 있다 — 언제든 나갈 수 있어야 한다', () => {
  it('★ 참여자: 서비스 현관과 내 홈이 **둘 다** 있다', async () => {
    // 실측으로 확인한 구멍이다 — 전에는 회원 시트에 `/` 도 `/home` 도 없었다.
    const s = await buildMemberSheet(ctx(), [cohort()], { hasFeed: false, now: 0, role: 'user', cohortCount: 1 });
    const h = hrefs(s.groups);
    expect(h, '서비스 현관으로 갈 문이 없다').toContain(SITE_DOOR.href);
    expect(h, '내 홈으로 갈 문이 없다').toContain(HOME_DOOR.href);
    // 참여자에게 콘솔·본부를 주지 않는다 — 갈 수 없는 곳으로 보내지 않는다.
    expect(h, '참여자에게 콘솔을 준다').not.toContain(CONSOLE_DOOR.href);
    expect(h, '참여자에게 본부를 준다').not.toContain(ADMIN_DOOR.href);
  });

  it('★ 인도자는 콘솔이, 운영자는 본부까지 — 겸직자가 현재 홈을 바꿀 수 있다', async () => {
    const coach = await buildMemberSheet(ctx(), [], { hasFeed: false, now: 0, role: 'coach', cohortCount: 0 });
    expect(hrefs(coach.groups)).toContain(CONSOLE_DOOR.href);
    expect(hrefs(coach.groups), '인도자에게 본부를 준다').not.toContain(ADMIN_DOOR.href);

    const admin = await buildMemberSheet(ctx(), [], { hasFeed: false, now: 0, role: 'admin', cohortCount: 0 });
    expect(hrefs(admin.groups)).toContain(CONSOLE_DOOR.href);
    expect(hrefs(admin.groups)).toContain(ADMIN_DOOR.href);
  });

  it('★★ 옮겨 온 문 셋이 시트에 있다 — **이름이 바뀌지 않았다**', async () => {
    const s = await buildMemberSheet(ctx(), [cohort({ preDone: true }), cohort({ cohortId: 'c2' })],
      { hasFeed: true, now: 0, role: 'user', cohortCount: 2, reportCohortId: 'c1' });
    const l = labels(s.groups);
    expect(l, `${MY_SEMINARS} 가 없다`).toContain(MY_SEMINARS);
    expect(l, `${MY_REPORT} 가 없다`).toContain(MY_REPORT);
    expect(l, `${JOIN_BY_CODE} 가 없다`).toContain(JOIN_BY_CODE);
    expect(hrefs(s.groups)).toContain('/my/cohorts/c1/report');
  });

  it('★★ 홈이 곧 그 회기면 「내 회기」를 **또 두지 않는다** — 배포해서 눈으로 잡았다', async () => {
    const dash = await buildMemberSheet(ctx(), [cohort()], { hasFeed: false, now: 0, role: 'user', cohortCount: 1, homeIsDashboard: true });
    expect(labels(dash.groups).filter((l) => l === '내 회기'), '같은 화면으로 가는 문이 둘이다').toHaveLength(0);
    expect(hrefs(dash.groups), '내 홈은 그대로 있어야 한다').toContain(HOME_DOOR.href);

    // 겸직자는 홈이 카드 화면이므로 「내 회기」가 그대로 필요하다.
    const both = await buildMemberSheet(ctx(), [cohort()], { hasFeed: false, now: 0, role: 'coach', cohortCount: 1, homeIsDashboard: false });
    expect(labels(both.groups), '겸직자에게서 내 회기 문이 사라졌다').toContain('내 회기');
  });

  it('★ 갈 곳이 없으면 문을 만들지 않는다 — 없는 곳으로 보내지 않는다', async () => {
    const one = await buildMemberSheet(ctx(), [cohort()], { hasFeed: false, now: 0, role: 'user', cohortCount: 1 });
    // 회기가 하나면 「내 세미나」 목록은 군더더기다 — 위 「내 회기」가 곧 그 회기다.
    expect(labels(one.groups), '회기가 하나인데 목록 문을 냈다').not.toContain(MY_SEMINARS);
    // 리포트가 정해지지 않으면 문을 안 낸다.
    expect(labels(one.groups), '갈 곳 없는 리포트 문을 냈다').not.toContain(MY_REPORT);
    expect(hrefs(one.groups), '피드가 없는데 동행 문을 냈다').not.toContain('/feed');
  });
});

describe('★ 어휘 — 회기 (지휘부 확정 2026-09-02)', () => {
  it('참여자 대면 문안이 **회기**를 쓴다', async () => {
    const s = await buildMemberSheet(ctx(), [cohort()], { hasFeed: false, now: 0, role: 'user', cohortCount: 1 });
    expect(labels(s.groups).some((l) => l.includes(COHORT_WORD)), '시트가 아직 옛 낱말을 쓴다').toBe(true);
    expect(labels(s.groups).some((l) => l.includes('기수')), '옛 낱말이 남았다').toBe(false);
  });

  it('★ 낱말이 **한 곳**에서 온다 — 화면마다 박으면 다음에 반드시 한쪽이 남는다', () => {
    expect(COHORT_WORD).toBe('회기');
    const vocab = readFileSync('src/core/membershipVocab.ts', 'utf8');
    expect(vocab, '왜 바꿨는지·어디까지 바꿨는지가 안 적혀 있다').toContain('회기 소속');
  });

  it('★★ **바꾸지 않은 자리는 일부러 둔 것이다** — 결재 문안과 데이터', () => {
    // 모집 랜딩과 갈무리 문항은 결재 문안이다. 한쪽만 바꾸면 신청 화면과 앱이 달라진다(ADR-171 ② 선례).
    //   이 잠금은 «아직 안 바꿨다» 가 아니라 **«일부러 안 바꿨다»** 를 적어 두는 자리다.
    for (const f of ['src/app/(public)/recruit/intake.ts', 'src/instruments/futurenow/checkin/session6.ts']) {
      expect(readFileSync(f, 'utf8'), `${f} 가 결재 없이 바뀌었다`).toContain('기수');
    }
  });
});

describe('★★ 홈이 곧 대시보드다 — 조립이 하나다', () => {
  it('두 화면이 **같은 함수**를 부른다 — 사본이 아니다', () => {
    const home = readFileSync('src/app/(member)/home/page.tsx', 'utf8');
    const cohortHome = readFileSync('src/app/(member)/my/cohorts/[cohortId]/page.tsx', 'utf8');
    // ★ 「이름이 있는가」로 물었더니 **수입 줄에 남아** 부름을 지워도 초록이었다(⑬).
    //   **부르는가**로 잰다 — 이름은 지우지 않고도 부름만 뺄 수 있다.
    for (const f of [home, cohortHome]) {
      expect(f, '대시보드를 부르지 않는다').toContain('return renderCohortDashboard(');
    }
    // 회기 홈 라우트를 지우지 않았다 — returnTo 화이트리스트가 그 주소를 통과시킨다(ADR-176).
    expect(cohortHome.length, '회기 홈 라우트가 사라졌다').toBeGreaterThan(0);
  });

  it('★ 대시보드가 **버튼 셋**을 든다 — 서가는 회기와 무관해 시트로 갔다', () => {
    const d = readFileSync('src/app/(member)/my/cohorts/[cohortId]/dashboard.tsx', 'utf8');
    expect(d).toContain('되비추기');
    expect(d).toContain('동행 피드');
    expect(d, '마지막 쓴 날을 안 묻는다').toContain('feedMyLastPostAt');
    expect(d, '서가가 아직 회기 화면에 있다').not.toContain('LIBRARY_NAME');
    // ADR-80 순서 규칙 — 사전 미완이면 진단이 오늘 카드보다 먼저다.
    expect(d, '순서 규칙이 사라졌다').toContain('diagnosisFirst');
  });

  it('★★ 같은 문을 두 번 세우지 않는다 — 옛 진단 카드의 중복이 그것이었다', () => {
    const d = readFileSync('src/app/(member)/my/cohorts/[cohortId]/dashboard.tsx', 'utf8');
    // 진단 버튼은 «위로 올리거나 줄에 두거나» 둘 중 하나다. 둘 다면 한 화면에 두 번 선다.
    expect(d).toContain('diagnosisFirst ? null :');
  });
});
