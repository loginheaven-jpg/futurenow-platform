import { describe, expect, it } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import { SCREEN_CHROME, nearestAncestor, resolveBack, patternOf, type ChromeKind } from '@/app/_lib/screenChrome';

// 크롬 표 잠금 — **표에 없는 라우트가 생기면 운다** (U-2 · 지휘부 조건 ①).
//
// 제목은 **얼어야 하는 값**이고, 얼어야 하는 값에는 잠금을 함께 둔다는 규율이 그대로 걸린다
//   (`CLAUDE.md` §11). 이 잠금이 없으면 라우트가 늘 때 **빈 제목이 조용히 나온다.**

/** 회원 껍데기가 덮는 최상위 자리. 라우트 그룹이 서면 경로만 바뀌고 목록은 그대로다. */
const MEMBER_ROOTS = ['home', 'account', 'feed', 'pending', 'my'];
/** 껍데기가 안 서는 자리도 **표에는 있어야 한다** — 예외가 규약 밖에 살면 다음 사람이 못 본다. */
const ALSO_IN_TABLE = ['c', 'signup'];

/** `src/app` 아래 실제 라우트를 센다 — 주석이 아니라 **디렉터리 구조**가 정본이다. */
function routesUnder(root: string, base = `src/app/${root}`, acc: string[] = []): string[] {
  for (const e of readdirSync(base)) {
    const p = `${base}/${e}`;
    if (statSync(p).isDirectory()) routesUnder(root, p, acc);
    else if (e === 'page.tsx') acc.push(base.replace('src/app', '').replace(/\/\([^/]+\)/g, ''));
  }
  return acc;
}

describe('화면 크롬 표 — 회원 껍데기 아래 모든 라우트가 표에 있다', () => {
  const routes = [...MEMBER_ROOTS, ...ALSO_IN_TABLE].flatMap((r) => routesUnder(r)).sort();

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
    expect(none.length, '없어졌으면 이 잠금도 다시 봐야 한다').toBe(2);
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
    expect(pinned.sort()).toEqual(['/feed', '/my/cohorts/[cohortId]/report', '/pending']);
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
