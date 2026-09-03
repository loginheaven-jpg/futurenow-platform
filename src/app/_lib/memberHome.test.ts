// 참여자 홈 정비 — 시트의 출구와 옮겨 온 문들 (ADR-181).
//
// **왜 잠그나**: 이번 회차가 옮긴 것이 많다. 옮긴 것은 **없어진 것처럼 보이기 쉽고**,
//   다음 사람이 결손으로 보고 되살리면 **한 화면에서 두 번 말하는 상태로 되돌아간다.**
//   그래서 「사라졌는가」가 아니라 **「새 자리에 있는가」**를 잰다.
import { describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';

/** 디렉터리 아래 `.ts`·`.tsx` 전부. **글롭을 쓰지 않는다** — 글롭이 그 자리를 안 덮는 사고를 이미 겪었다. */
function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = `${dir}/${e}`;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}
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
    // ★ **금지 낱말은 옛 낱말이다** — U-6 의 일괄 치환이 이 줄까지 바꿔 앞줄과 모순을 만들었다.
    //   되돌리면서 **둘 다** 잰다(「차수」도 옛 낱말이다 — U-6 이 62자리를 마저 옮겼다).
    for (const old of ['기수', '차수']) {
      expect(labels(s.groups).some((l) => l.includes(old)), `옛 낱말 「${old}」 가 남았다`).toBe(false);
    }
  });

  it('★ 낱말이 **한 곳**에서 온다 — 화면마다 박으면 다음에 반드시 한쪽이 남는다', () => {
    expect(COHORT_WORD).toBe('회기');
    const vocab = readFileSync('src/core/membershipVocab.ts', 'utf8');
    expect(vocab, '왜 바꿨는지·어디까지 바꿨는지가 안 적혀 있다').toContain('회기 소속');
  });

  // ★ **네 파일 잠금은 걷었다**(U-6). ADR-182 가 세운 그 잠금은
  //   `recruit/intake.ts`·`checkin/session6.ts`·`console/consoleNav.ts`·`admin/memberActions.ts`
  //   **넷만** 봤고, 그 좁은 창 위에서 「어휘 전면」이 선언됐다. 아래 전수 잠금이 그것을 삼킨다 —
  //   같은 것을 두 자로 재면 언젠가 둘이 갈리고, 그때 어느 쪽이 참인지 알 수 없다(불변식 23).

  // ★★★ **네 파일이 아니라 저장소를 잰다**(U-6).
  //
  //   윗 잠금은 **네 파일만** 봤고, ADR-182 는 그것을 근거로 「어휘 전면 · 화면 문안 24건」이라 적었다.
  //   U-6 이 실측하니 화면에 나가는 옛 낱말이 **111자리**였다 — **판정의 창이 판정하려는 것보다 좁았고**,
  //   초록은 「막았다」가 아니라 **「그 자리를 안 봤다」**였다(§11 ⑨-a).
  //
  //   **얼린 자리는 하나뿐이다.** 갈무리 익명 고지문은 최박사 문장 대체표 §8 「변경하지 않는 자리」에
  //   유지로 박혀 있다(`docs/tasks/futurenow_copy_replacement_final (1).md`). 예외를 **여기 한 줄로**
  //   적어 두는 것이 규율이다 — 별도 문서에 두면 다음 사람이 본문만 읽고 판단한다(§12.1).
  const FROZEN = '이름 없이 전달합니다. 다만 인원이 적은 차수에서는 글의 결로 짐작될 수 있습니다.';

  /** 주석을 걷고 얼린 문장을 뺀 뒤 옛 낱말이 남았는지 본다. **순수 함수라 물려 볼 수 있다.** */
  function oldWordsIn(src: string): string[] {
    const noBlock = src.replace(/\/\*[\s\S]*?\*\//g, '');
    const body = noBlock
      .split(String.fromCharCode(10))
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      // 줄 끝 주석도 걷는다 — `https://` 를 자르지 않도록 앞에 공백을 요구한다.
      .map((l) => l.replace(/\s\/\/.*$/, ''))
      .join(String.fromCharCode(10))
      .split(FROZEN)
      .join('');
    return ['기수', '차수'].filter((w) => body.includes(w));
  }

  it('**자가 문다** — 옛 낱말을 심으면 잡히고, 주석·얼린 문장은 안 잡힌다', () => {
    expect(oldWordsIn("const a = '내 차수';"), '심은 변이를 놓쳤다').toEqual(['차수']);
    expect(oldWordsIn("const a = '어느 기수의 자료인가요';")).toEqual(['기수']);
    expect(oldWordsIn('// 옛 이름은 차수였다')).toEqual([]);
    expect(oldWordsIn('const a = 1; // 옛 이름은 기수였다')).toEqual([]);
    expect(oldWordsIn('/* 차수 */ const a = 1;')).toEqual([]);
    expect(oldWordsIn(`const l = '${FROZEN}';`), '얼린 문장을 잡았다').toEqual([]);
    expect(oldWordsIn("const u = 'https://x/y'; const a = '회기';")).toEqual([]);
  });

  it('★★ **화면에 옛 낱말이 없다** — `src/app`·`src/instruments` 전수', () => {
    const files = walk('src/app').concat(walk('src/instruments')).filter((f) => !/\.test\.tsx?$/.test(f));
    // ⑦ **잴 것이 실재하는가** — 창이 비면 초록은 아무 말도 하지 않는다.
    expect(files.length, '읽은 파일이 0이다 — 도구가 고장 났다').toBeGreaterThan(100);
    const offenders = files
      .map((f) => [f, oldWordsIn(readFileSync(f, 'utf8'))] as const)
      .filter(([, w]) => w.length > 0)
      .map(([f, w]) => `${f} :: ${w.join(',')}`);
    expect(offenders, '지휘부 확정 2026-09-03 「회기 로 갑니다」 — 얼린 고지문 말고는 남지 않는다').toEqual([]);
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
    // ★★ **CSS 만 보고 초록이었다.** 부품이 그 클래스를 **안 내보내고** 있었는데
    //   잠금이 CSS 쪽만 봐서 못 잡았고 **배포해서 값으로** 잡았다(계열 ⑦ — 물 것이 없었다).
    //   그래서 **양쪽을 함께** 잰다: 부품이 내보내는가 · CSS 가 받는가.
    const chip = readFileSync('src/app/_screens/site/SessionChipStrip.tsx', 'utf8');
    expect(chip, '부품이 열림 표시를 안 내보낸다 — CSS 만 있으면 헛돈다').toContain("open: 'site-chip is-open'");
    const css = readFileSync('src/app/_screens/site/site.css', 'utf8');
    expect(css, '열린 회차에 표시가 없다 — 잠금과 구분되지 않는다').toContain('.site-chip.is-open');
    // 의미색을 쓰지 않는다(불변식 9) — 네 단이 전부 네이비/골드/회색이다.
    const chipBlock = css.slice(css.indexOf('.site-chip {'), css.indexOf('.site-chip.is-locked'));
    for (const bad of ['--color-danger', '--color-warn', 'red', 'orange']) {
      expect(chipBlock, `회차 칩에 의미색을 썼다: ${bad}`).not.toContain(bad);
    }
  });
});

describe('★ 시트의 로그아웃이 **보인다** (ADR-188 후속)', () => {
  it('시트에서는 아이콘이 아니라 **글자**다 — 흰 바탕에 흰 아이콘이라 안 보였다', () => {
    const btn = readFileSync('src/app/_screens/LogoutButton.tsx', 'utf8');
    // 아이콘 변형은 네이비 제목바 위의 것이다. 시트는 흰 바탕이라 색이 반대다.
    expect(btn, '시트 변형이 없다').toContain("variant === 'sheet'");
    expect(btn, '시트에서 글자로 안 그린다').toContain('site-sheet__logout');
    for (const f of ['src/app/(member)/layout.tsx', 'src/app/_screens/site/PublicGnb.tsx']) {
      expect(readFileSync(f, 'utf8'), `${f} 가 아이콘 변형을 시트에 넣는다`).toContain('variant="sheet"');
    }
  });

  it('★ 공개 시트도 로그인하면 계정 구획을 준다 — 공개 화면에서도 나갈 수 있다', () => {
    const pub = readFileSync('src/app/_screens/site/PublicGnb.tsx', 'utf8');
    expect(pub).toContain('ACCOUNT_GROUP');
    expect(pub).toContain('ACCOUNT_DOOR');
    // 비로그인에게는 주지 않는다 — 갈 수 없는 곳으로 보내지 않는다.
    expect(pub, '로그인 여부를 안 본다').toContain('sheet && signedIn');
    // 문패를 손으로 적지 않는다(불변식 23).
    expect(pub, '이름을 손으로 적었다').not.toContain("label: '내 정보'");
  });
});
