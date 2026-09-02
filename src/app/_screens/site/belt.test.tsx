// 벨트 일관성 잠금 — A안 (ADR-174 · 지휘부 확정 2026-09-02).
//
// **지시는 「메뉴 벨트를 일관되게 유지한다」였다.** 그런데 로그인하면 셋으로 갈렸다 —
//   `/` 는 메뉴 6, `/home` 은 메뉴 0, `/coach`·`/my/*` 는 벨트가 통째로 없었다(라이브 실측).
//   A안은 **벨트를 늘 두고 제목바를 그 아래**에 둔다. **lg↑ 에서만** 겹친다.
//
// ★ **여기서는 마크업이 사는 사실만 잰다.** 「lg↑ 에서만 보이는가」는 CSS 라
//   배포 뒤 **실행으로** 잰다(⑨-c 창의 층이 다르다).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { SiteGnb } from './SiteGnb';
import { PUBLIC_NAV, PUBLIC_SHEET_MINE } from './publicNav';
import { HOME_DOOR } from '@/app/_vocab/doors';

const read = (f: string) => readFileSync(f, 'utf8');
const MEMBER = 'src/app/_screens/shell/MemberShell.tsx';
const CONSOLE = 'src/app/_screens/console/ConsoleShell.tsx';
const PUBLIC = 'src/app/_screens/site/PublicGnb.tsx';
const CSS = 'src/app/_screens/site/site.css';

describe('★ 벨트가 제목바 화면에도 선다 (A안)', () => {
  it('두 껍데기가 **같은 슬롯 이름**을 쓴다 — 부품도 CSS 도 두 벌 만들지 않는다', () => {
    for (const f of [MEMBER, CONSOLE]) {
      expect(read(f), `${f} 에 벨트가 없다`).toContain('belt-slot');
      expect(read(f), `${f} 가 메뉴를 안 준다`).toContain('PUBLIC_NAV');
    }
    expect(read(CSS), 'CSS 에 슬롯이 없다').toContain('.belt-slot');
  });

  it('★★ 폭 가르기를 **CSS 로** 한다 — 트리를 폭에 따라 바꾸지 않는다', () => {
    // 트리를 갈래로 바꾸면 껍데기의 「트리 모양을 바꾸지 않는다」 규약이 깨진다(U-4 재마운트 사고).
    //   늘 그리고 CSS 가 감춘다 — 트리가 한 벌이므로 JS 가 0 이다.
    for (const f of [MEMBER, CONSOLE]) {
      const src = read(f);
      for (const bad of ['matchMedia', 'innerWidth', 'useMediaQuery']) {
        expect(src, `${f} 가 폭을 JS 로 잰다: ${bad}`).not.toContain(bad);
      }
    }
    // §3.1 브레이크포인트 안에서만 가른다.
    expect(read(CSS)).toMatch(/@media \(min-width: 1024px\) \{ \.belt-slot/);
  });

  it('★ `{children}` 의 자리가 안 움직인다 — 벨트는 `head` **안**에 있다', () => {
    const src = read(MEMBER);
    // 껍데기 반환은 `{head}{children}` 두 칸 그대로여야 한다.
    expect(src).toMatch(/\{head\}\s*\n\s*\{children\}/);
    // 벨트가 그 밖으로 나가면 형제 수가 바뀌어 재마운트가 난다.
    expect(src, '벨트가 head 밖으로 나갔다').not.toMatch(/\{belt\}\s*\n\s*\{head\}/);
  });

  it('콘솔 벨트는 시트를 **안 든다** — 한 화면에 여는 문을 둘 두지 않는다', () => {
    const src = read(CONSOLE);
    const belt = src.slice(src.indexOf('belt-slot'), src.indexOf('belt-slot') + 400);
    expect(belt, '콘솔 벨트가 시트를 든다').not.toContain('sheet=');
  });
});

describe('★ 로그인하면 버튼이 햄버거로 바뀐다', () => {
  it('로그인한 사람에게는 `login` 을 주지 않는다', () => {
    const src = read(PUBLIC);
    expect(src).toContain('signedIn ? undefined : publicHeaderAction(false)');
  });

  it('★ 시트를 받으면 여는 문이 md↑ 에서도 보인다 — 마크업과 CSS 가 짝이다', () => {
    const withSheet = renderToStaticMarkup(
      <SiteGnb logo="로고" items={PUBLIC_NAV} sheet={{ name: 'n', groups: [] }} />,
    );
    const without = renderToStaticMarkup(<SiteGnb logo="로고" items={PUBLIC_NAV} />);
    expect(withSheet).toContain('has-sheet');
    expect(without, '시트가 없는데 클래스가 붙었다').not.toContain('has-sheet');
    expect(read(CSS)).toContain('.site-gnb__right.has-sheet .site-gnb__burger');
  });

  it('★★ 「내 홈」이 **시트 맨 위**에 선다 — 로그인한 사람에게만', () => {
    const src = read(PUBLIC);
    // 앞에 붙여야 맨 위다. 뒤에 붙이면 「이용 안내」 아래로 내려간다.
    //   정규식으로 재려다 `items: [HOME_DOOR]` 의 대괄호에 걸렸다 — **자리로 잰다.**
    const mine = src.indexOf('PUBLIC_SHEET_MINE, items:');
    const rest = src.indexOf('...sheet.groups');
    expect(mine, '내 자리 구획이 없다').toBeGreaterThan(-1);
    expect(rest, '기존 구획을 이어 붙이지 않는다').toBeGreaterThan(-1);
    expect(mine, '내 홈이 맨 위가 아니다').toBeLessThan(rest);
    expect(src, '비로그인에게도 준다').toContain('sheet && signedIn');
    // 문안을 새로 짓지 않았다 — 단일 출처를 읽는다.
    expect(src).toContain('HOME_DOOR');
    expect(HOME_DOOR.label).toBe('내 홈');
    expect(PUBLIC_SHEET_MINE).toBe('내 자리');
  });
});

describe('★ 회원 벨트가 메뉴 여섯을 든다 — 로그인해도 안 사라진다', () => {
  it('`gnb` 갈래가 `PUBLIC_NAV` 를 넘긴다', () => {
    const src = read(MEMBER);
    // 전에는 `variant="member"` 라 로고+햄버거뿐이었다 — 그것이 지시가 고치라 한 자리다.
    expect(src).toContain('items={PUBLIC_NAV}');
  });

  it('메뉴가 있으면 실제로 그려진다 — 부품 층에서 확인', () => {
    const html = renderToStaticMarkup(<SiteGnb logo="로고" items={PUBLIC_NAV} />);
    for (const it of PUBLIC_NAV) expect(html, it.label).toContain(it.label);
    // 메뉴를 안 주면 nav 를 만들지 않는다(빈 자리를 남기지 않는다).
    expect(renderToStaticMarkup(<SiteGnb logo="로고" />)).not.toContain('site-gnb__nav');
  });
});
