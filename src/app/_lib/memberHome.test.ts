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
import { primaryCohort } from '@/app/(member)/home/roleTarget';
import { PUBLIC_NAV } from '@/app/_screens/site/publicNav';

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

  it('★★ **전면으로 갔다**(지휘부 확정 2026-09-03 「회기 로 갑니다」)', () => {
    // 옛 잠금은 「모집 랜딩·갈무리 문항은 일부러 안 바꿨다」를 적어 두는 자리였다.
    //   **지휘부가 전면 확정했으므로 그 사실이 뒤집혔다** — 지우지 않고 옮겨 적는다.
    //   갈무리 문항 잠금(`copyRegression`)이 이 변경을 **정확히 잡았고**(늘어남 1·사라짐 1)
    //   `regenCopyBaseline --write` 로 스냅샷을 새 사실로 다시 뽑았다.
    for (const f of ['src/app/(public)/recruit/intake.ts', 'src/instruments/futurenow/checkin/session6.ts',
                     'src/app/_screens/console/consoleNav.ts', 'src/app/admin/memberActions.ts']) {
      const src = readFileSync(f, 'utf8');
      // 주석은 그대로 둔다 — 옛 낱말을 지우면 왜 바뀌었는지 자취가 사라진다. **문안만** 잰다.
      const copy = src.split(String.fromCharCode(10)).filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join(' ');
      expect(copy, `${f} 에 옛 낱말이 남았다`).not.toContain('기수');
    }
  });

  it('★ 회기명 데이터는 문안이 아니다 — 여기서 못 바꾼다', () => {
    // `예봄 2기` 는 DB 의 값이고 `shortCohortName` 이 끝의 `n기` 를 뽑는다(최박사 확정 2026-08-29).
    //   **낱말을 바꿔도 이름은 그대로**다 — 그 사실을 적어 둔다.
    const vocab = readFileSync('src/core/membershipVocab.ts', 'utf8');
    expect(vocab, '회기명 축약 규칙이 사라졌다').toContain('shortCohortName');
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

describe('★★ 회기 선택과 회기 0 (ADR-182 · 지휘부 확정 2026-09-03)', () => {
  it('★★ 「어느 회기인가」를 **한 곳**이 정한다 — 가장 최근 가입한 활성 회기', () => {
    const a = cohort({ cohortId: 'a', joinedAt: '2026-06-01' });
    const b = cohort({ cohortId: 'b', joinedAt: '2026-08-01' });
    expect(primaryCohort([a, b])?.cohortId, '최근 가입이 아니다').toBe('b');
    // 보관된 회기는 세지 않는다 — 그 규칙은 안 바뀌었다.
    expect(primaryCohort([cohort({ status: 'archived' })]), '보관을 골랐다').toBeNull();
    expect(primaryCohort([]), '없는데 골랐다').toBeNull();
  });

  it('★ 시트 칩이 **활성 둘 이상에서도** 선다 — 지금 보고 있을 회기의 것이다', async () => {
    // 옛 사실: 활성이 하나일 때만 칩을 만들었다(「여럿이면 어느 회기인지 말할 수 없다」).
    //   대시보드가 하나를 골라 그리므로 **말할 수 있게 됐다** — 뒤집힌 사실을 옮겨 적는다.
    const src = readFileSync('src/app/_lib/memberSheet.ts', 'utf8');
    expect(src, '시트가 판정을 따로 한다').toContain('primaryCohort(cohorts)');
    expect(src, '옛 판정이 남았다').not.toContain("active.length === 1 ? active[0] : null");
  });

  it('★★ 회기가 0이면 **「참여 신청」**이 그 자리다 — 빈 목록으로 보내지 않는다', async () => {
    const none = await buildMemberSheet(ctx(), [], { hasFeed: false, now: 0, role: 'user', cohortCount: 0 });
    expect(hrefs(none.groups), '참여 신청 문이 없다').toContain('/recruit');
    expect(hrefs(none.groups), '빈 목록으로 보낸다').not.toContain('/my/cohorts');
    // 회기가 있으면 그 문을 내지 않는다 — 필요 없는 사람에게 권하지 않는다.
    const some = await buildMemberSheet(ctx(), [cohort()], { hasFeed: false, now: 0, role: 'user', cohortCount: 1 });
    expect(hrefs(some.groups), '회기가 있는데 참여 신청을 권한다').not.toContain('/recruit');
  });

  it('★ 참여 신청 이름을 **짓지 않았다** — 벨트 메뉴가 든 그 말이다', () => {
    const src = readFileSync('src/app/_lib/memberSheet.ts', 'utf8');
    expect(src, '이름을 손으로 적었다').toContain('PUBLIC_NAV.find');
    expect(PUBLIC_NAV.some((i) => i.href === '/recruit' && i.label === '참여 신청'), '벨트에 그 문이 없다').toBe(true);
  });

  it('★★ 대시보드가 **회기 선택 줄**을 든다 — `/feed` 와 같은 관용구다(새 부품 0)', () => {
    const d = readFileSync('src/app/(member)/my/cohorts/[cohortId]/dashboard.tsx', 'utf8');
    const feed = readFileSync('src/app/(member)/feed/FeedClient.tsx', 'utf8');
    for (const f of [d, feed]) {
      expect(f, '회기 선택 줄이 없다').toContain("aria-label=\"회기 선택\"");
      // 선택은 **면과 테두리**로 가른다 — 색만으로 말하지 않는다.
      expect(f).toContain("'ui-btn--primary' : 'ui-btn--ghost'");
    }
    // 하나뿐이면 줄을 안 그린다 — 고를 것이 없는데 고르라 하지 않는다.
    expect(d).toContain('choices.length > 1');
  });

  it('★ 가독성 — **열린 회차가 잠금과 구분된다**(지휘부 승인 2026-09-03)', () => {
    const css = readFileSync('src/app/_screens/site/site.css', 'utf8');
    expect(css, '열린 회차에 표시가 없다 — 잠금과 구분되지 않는다').toContain('.site-chip.is-open');
    // 의미색을 쓰지 않는다(불변식 9) — 네 단이 전부 네이비/골드/회색이다.
    const chipBlock = css.slice(css.indexOf('.site-chip {'), css.indexOf('.site-chip.is-locked'));
    for (const bad of ['--color-danger', '--color-warn', 'red', 'orange']) {
      expect(chipBlock, `회차 칩에 의미색을 썼다: ${bad}`).not.toContain(bad);
    }
  });
});
