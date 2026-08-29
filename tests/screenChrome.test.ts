import { describe, expect, it } from 'vitest';
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { SCREEN_CHROME, nearestAncestor, resolveBack, patternOf, type ChromeKind } from '@/app/_lib/screenChrome';

// 크롬 표 잠금 — **표에 없는 라우트가 생기면 운다** (U-2 · 지휘부 조건 ①).
//
// 제목은 **얼어야 하는 값**이고, 얼어야 하는 값에는 잠금을 함께 둔다는 규율이 그대로 걸린다
//   (`CLAUDE.md` §11). 이 잠금이 없으면 라우트가 늘 때 **빈 제목이 조용히 나온다.**

/** 회원 껍데기가 덮는 최상위 자리. 라우트 그룹이 서면 경로만 바뀌고 목록은 그대로다. */
const MEMBER_ROOTS = ['home', 'account', 'feed', 'pending', 'my'];
/** 껍데기가 안 서는 자리도 **표에는 있어야 한다** — 예외가 규약 밖에 살면 다음 사람이 못 본다. */
const ALSO_IN_TABLE: { root: string; base: string }[] = [
  { root: 'c', base: 'src/app/c' },
  { root: 'signup', base: 'src/app/(public)/signup' },
  // **`/join` 이 U-4 에서 들어왔다** — 표는 `none`(표가 들지 않는다)이고 단계 크롬은 통로가 든다.
  //   여기 없으면 «실재하지 않는 라우트» 로 잡힌다 — 실재하는데도.
  { root: 'join', base: 'src/app/(public)/join' },
  // **서가(A)** — 목록은 `gnb`(로고가 서야 한다), 자료 화면은 `none`(제목을 통로가 든다).
  { root: 'library', base: 'src/app/(public)/library' },
  // **콘솔도 같은 표를 쓴다**(U-3) — 두 벌 만들지 않는다.
  { root: 'coach', base: 'src/app/coach' },
  { root: 'admin', base: 'src/app/admin' },
];

/** `src/app` 아래 실제 라우트를 센다 — 주석이 아니라 **디렉터리 구조**가 정본이다. */
function routesUnder(root: string, base = `src/app/(member)/${root}`, acc: string[] = []): string[] {
  for (const e of readdirSync(base)) {
    const p = `${base}/${e}`;
    if (statSync(p).isDirectory()) routesUnder(root, p, acc);
    else if (e === 'page.tsx') acc.push(base.replace('src/app', '').replace(/\/\([^/]+\)/g, ''));
  }
  return acc;
}

describe('화면 크롬 표 — 회원 껍데기 아래 모든 라우트가 표에 있다', () => {
  const routes = [
    ...MEMBER_ROOTS.flatMap((r) => routesUnder(r)),
    ...ALSO_IN_TABLE.flatMap((x) => routesUnder(x.root, x.base)),
  ].sort();

  it('**빠진 라우트가 없다** — 없으면 빈 제목이 조용히 나온다', () => {
    const missing = routes.filter((r) => !SCREEN_CHROME[r]);
    expect(missing, `표에 없는 라우트: ${missing.join(' · ')}`).toEqual([]);
  });

  it('**죽은 항목이 없다** — 라우트가 사라졌으면 표에서도 지운다', () => {
    const stale = Object.keys(SCREEN_CHROME).filter((k) => !routes.includes(k));
    expect(stale, `실재하지 않는 라우트가 표에 있다: ${stale.join(' · ')}`).toEqual([]);
  });

  it('제목이 비어 있지 않다 — 제목 바에 한해', () => {
    for (const [route, c] of Object.entries(SCREEN_CHROME)) {
      if (c.kind !== 'bar') continue;
      expect(c.title.trim().length, `${route} 의 제목이 비었다`).toBeGreaterThan(0);
    }
  });

  it('**껍데기 없음에는 사유가 붙어 있다** — 목록만 있는 예외는 다음 사람이 못 판단한다', () => {
    const none = Object.entries(SCREEN_CHROME).filter(([, c]) => c.kind === 'none');
    // 셋이다 — `/c/[code]/*` 둘과 `/join`(U-4). **수를 박되 사유와 함께 잠근다.**
    // 넷이다 — `/c/[code]/*` 둘 · `/join`(U-4) · `/library/[id]`(서가 A).
    expect(none.length, '없어졌으면 이 잠금도 다시 봐야 한다').toBe(4);
    for (const [route, c] of none) {
      expect(c.kind === 'none' && c.why.length, `${route} 에 사유가 없다`).toBeGreaterThan(20);
    }
  });
});

describe('뒤로는 값이 아니라 규칙이다 (지휘부 조건 ③)', () => {
  it('**기본은 가장 가까운 조상 라우트**', () => {
    expect(nearestAncestor('/my/cohorts/[cohortId]/journey')).toBe('/my/cohorts/[cohortId]');
    expect(nearestAncestor('/my/cohorts/[cohortId]/checkin/[session]')).toBe('/my/cohorts/[cohortId]');
    expect(nearestAncestor('/my/cohorts')).toBeUndefined(); // `/my` 는 라우트가 아니다
  });

  it('**값으로 박은 것은 규칙이 안 통하는 자리뿐이다** — 셋을 넘지 않는다', () => {
    const pinned = Object.entries(SCREEN_CHROME)
      .filter(([, c]) => c.kind === 'bar' && c.back)
      .map(([k]) => k);
    // 늘어나면 규칙을 다시 봐야 한다는 뜻이다. 조용히 늘지 않게 수를 잠근다.
    // 늘어나면 규칙을 다시 봐야 한다는 뜻이다. **콘솔 넷이 U-3 에서 더해졌다** —
    //   전부 조상 규칙이 다른 곳을 가리키는 자리다(격자·기록은 갈무리 현황으로, 개설은 목록으로).
    // **집합을 잠그고 순서는 재지 않는다** — 순서는 이 잠금이 말하려는 것이 아니다.
    //   (한 번 순서에 매달려 세 번 헛돌았다. 재려는 것보다 좁지도 넓지도 않게.)
    expect(pinned.sort()).toEqual([
      '/admin/approvals',
      '/coach/cohort/[cohortId]/matrix',
      '/coach/cohort/[cohortId]/member/[userId]',
      '/coach/cohort/[cohortId]/values',
      '/coach/cohort/[cohortId]',
      '/coach/cohorts',
      '/coach/new',
      '/feed',
      '/my/cohorts/[cohortId]/report',
      '/pending',
    ].sort());
  });

  it('동적 세그먼트를 지금 값으로 되돌린다', () => {
    expect(resolveBack('/my/cohorts/[cohortId]/journey', { cohortId: 'abc' })).toBe('/my/cohorts/abc');
    expect(resolveBack('/my/cohorts/[cohortId]/report', { cohortId: 'abc' })).toBe('/my/cohorts');
    expect(resolveBack('/feed', {})).toBe('/home');
  });

  it('실제 경로 → 라우트 패턴', () => {
    expect(patternOf('/my/cohorts/abc/journey', { cohortId: 'abc' })).toBe('/my/cohorts/[cohortId]/journey');
  });
});

describe('flow 둘은 메뉴를 달지 않는다 (지휘부 판정)', () => {
  // `AppHeader` 정의가 *진입 선형 플로우용, 일부러 출구 없음* 이라 못 박았다.
  //   껍데기가 메뉴를 달면 **확정을 코드가 뒤집는다.**
  it('`flow` 인 항목은 전부 `menu: false`', () => {
    // 셋이다 — `/my/values` · `/my/cohorts/[cohortId]/values` · `/signup`.
    //   `/signup` 도 원래 `onBack` 이 없어 `flow` 였다(실측). 표가 그 사실을 이어받는다.
    const flow = Object.entries(SCREEN_CHROME).filter(
      (e): e is [string, Extract<ChromeKind, { kind: 'bar' }>] => e[1].kind === 'bar' && e[1].variant === 'flow');
    expect(flow.length, 'flow 화면 수가 바뀌었다면 이 잠금도 다시 봐야 한다').toBe(3);
    for (const [route, c] of flow) {
      expect(c.menu, `${route} 에 메뉴가 달렸다 — 일부러 없앤 출구가 되살아난다`).toBe(false);
    }
  });

  it('**그 밖에는 메뉴가 있다** — 대조군. 없으면 위 단언이 «전부 false» 여도 통과한다', () => {
    const withMenu = Object.values(SCREEN_CHROME).filter((c) => c.kind !== 'none' && c.menu);
    expect(withMenu.length).toBeGreaterThan(3);
  });
});

describe('★ 「예상 시간」은 진입 화면에서 걷혔다 (최박사 결재 ⑪ · 2026-08-30)', () => {
  // **10분 하나로 통일한다.** `/recruit` 의 「약 10분」은 **신청 절차 전체**이고
  //   진입 화면의 「약 5분」은 **진단 자체**였다 — 값이 틀린 것이 아니라
  //   **무엇의 시간인지가 안 적혀** 참여자에게 같게 들렸다.
  it('진입 화면이 「예상 시간」 줄을 그리지 않는다', () => {
    const src = readFileSync('src/app/_screens/entry/CohortPreview.tsx', 'utf8');
    // 주석은 이 결정을 설명하므로 뺀다 — 세면 자가 넓어진다(⑨-b).
    const code = src.split(String.fromCharCode(10))
      .filter((l) => !l.trim().startsWith('{/*') && !l.trim().startsWith('*') && !l.trim().startsWith('//'))
      .join(String.fromCharCode(10));
    expect(code, '「예상 시간」 줄이 되살아났다').not.toContain('예상 시간');
    expect(code, '진단 소요 분을 화면에 다시 그린다').not.toContain('inst.minutes');
  });

  it('★ 그러나 `minutes` **값은 지우지 않았다** — 타입을 쓰는 화면이 깨진다', () => {
    // 「안 보이게 하라」를 「지워라」로 읽으면 `instrumentDisplay` 를 쓰는 세 화면이 깨진다.
    const types = readFileSync('src/app/_screens/types.ts', 'utf8');
    expect(types, 'minutes 를 지웠다 — 결재는 「안 보이게」였다').toContain('minutes: number');
  });

  it('갈무리의 「약 5분」은 **다른 것**이라 그대로다', () => {
    // 갈무리 소요 시간이지 진단 시간이 아니다. 결재 ⑪ 의 대상이 아니었다.
    const s2 = readFileSync('src/instruments/futurenow/checkin/session2.ts', 'utf8');
    expect(s2, '갈무리 소요 안내까지 걷었다 — 결재 범위 밖이다').toContain('약 5분');
  });
});
