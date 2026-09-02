'use client';
// 콘솔 껍데기 — **상단바 하나 + 탭 줄 한 단계** (U-3 · 최박사 확정 2026-09-01).
//
// **좌측 세로 사이드메뉴를 없앴다.** 4차 T-4 가 지은 `console-nav` 사이드바를 걷고
//   상단바 하나로 간다 — *PC 콘솔도 예외 없다*(최박사).
//
// ─────────────────────────────────────────────────────────────────────────────
// **두 자리가 무엇을 나눠 갖는가**(지휘부 요구 2026-09-01):
//
//   **탭 줄** — 「이 기수」 문맥이 쓴다. 지금 보고 있는 기수 안에서 오가는 항목이고,
//     차수 밖에서는 탭 줄 자체가 서지 않는다(갈 곳이 없는 탭을 그리지 않는다).
//   **시트** — 콘솔 전역 항목이 든다. 「인도자」·「운영」 묶음이 그것이고,
//     상단바 메뉴 하나로 열린다(공통 규칙 2 — 메뉴는 한 자리에서만 열린다).
//
//   **사라지는 항목이 없다.** 사이드바가 들던 11개가 탭 줄과 시트로 전부 옮겨 간다.
//   실측으로 다섯(가치 카드·동행·본부·가입 승인·서가)이 **사이드바에만** 있었으므로,
//   시트가 없으면 그 다섯이 사라졌을 것이다.
//
// **부품을 두 벌 만들지 않는다** — 시트는 회원 껍데기가 쓰는 것과 **같은 `MenuSheet`** 이고
//   담기는 항목만 다르다(최박사 상위 확정 — *껍데기는 하나이고 방마다 담기는 항목만 다르다*).
//
// **`consoleNav` 는 손대지 않는다** — 경로를 인자로 받는 순수 함수 그대로다(4차 확정).
//   무엇을 어디에 담을지는 여기서 나눈다.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { AppHeader } from '@/app/_screens/AppHeader';
import { MenuSheet } from '@/app/_screens/site/MenuSheet';
import { SiteGnb } from '@/app/_screens/site/SiteGnb';
import { PUBLIC_NAV } from '@/app/_screens/site/publicNav';
import { HeaderActions } from '@/app/_screens/HeaderActions';
import { consoleNav, isCurrent } from './consoleNav';
import { SCREEN_CHROME, patternOf, resolveBack } from '@/app/_lib/screenChrome';
import { useChrome } from '@/app/_screens/shell/chromeContext';

/** 「이 기수」 묶음만 탭 줄이 든다. 나머지는 시트가 든다. */
const TAB_GROUP = '이 기수';

export function ConsoleShell({
  role,
  children,
}: {
  role: 'user' | 'coach' | 'admin';
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? '';
  const params = useParams() as Record<string, string | string[] | undefined>;
  const pattern = patternOf(pathname, params);
  const chrome = SCREEN_CHROME[pattern];
  // **화면이 알려 온 크롬이 표를 이긴다**(U-4 §1) — `/join` 처럼 라우트 하나에 단계가 여럿인 자리다.
  //   통로 밖이면 `null` 이고 표가 그대로 이긴다.
  const override = useChrome();
  const groups = consoleNav({ role, pathname });
  if (groups.length === 0) return <>{children}</>; // 참여자 — 셸 없이 그대로

  const tabs = groups.find((g) => g.title === TAB_GROUP);
  const sheetGroups = groups
    .filter((g) => g.title !== TAB_GROUP)
    .map((g) => ({ title: g.title ?? '콘솔', items: g.items }));

  return (
    <div className="console-shell">
      {/* ★ **벨트를 제목바 위에 얹는다**(ADR-174 · A안). `MemberShell` 과 같은 이유·같은 모양이다 —
          부품도 CSS 도 두 벌 만들지 않는다. **lg↑ 에서만 선다**(`.belt-slot`).
          시트를 넘기지 않는다 — 콘솔은 **자기 시트**를 아래에서 따로 열고, 여기 또 넘기면
          같은 화면에 여는 문이 둘이 된다(U-4 §4 「문은 하나씩이다」). */}
      <div className="belt-slot">
        <SiteGnb
          logo={<>퓨처<b>나우</b></>}
          en="FUTURE NOW"
          items={PUBLIC_NAV}
          currentPath={pathname}
        />
      </div>
      {/* **제목·뒤로는 표가 든다**(§3) — U-2 가 만든 `screenChrome` 을 콘솔도 쓴다. 두 벌 만들지 않는다.
          **콘솔의 홈은 `콘솔` 이다**(공통 규칙 3) — 표의 `/coach` 항목이 그 이름을 든다.
          `root` 인 자리는 뒤로가 없다(홈이 제목을 겸한다) — **홈 어포던스를 둘로 두지 않는다**(규칙 4). */}
      <AppHeader
        variant={chrome?.kind === 'bar' ? chrome.variant : 'sub'}
        title={override?.title ?? (chrome?.kind === 'bar' ? chrome.title : '콘솔')}
        backHref={override?.backHref ?? resolveBack(pattern, params)}
        action={
          <>
            {/* **로그아웃·내 정보를 잃지 않는다.** 사이드바 시절 화면들이 `headerActions` 로
                넘기던 것이 이 자리다 — 회원 껍데기와 같은 부품을 같은 슬롯에 둔다.
                **`homeHref` 를 넘기지 않는다** — `AppHeader` 의 `sub` 가 이미 홈 아이콘을 그린다.
                넘기면 홈 어포던스가 둘이 되고, 규칙 4(문은 한 곳씩)를 어긴다. */}
            <HeaderActions />
            <button
            type="button"
            className="site-gnb__burger"
            onClick={() => setOpen(true)}
            aria-label="전체 메뉴 열기"
            aria-expanded={open}
            style={{ display: 'inline-flex' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="1.8" strokeLinecap="round" aria-hidden focusable="false">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
            </button>
          </>
        }
      />

      {/* **탭 줄은 한 단계다.** 두 단계를 만들지 않는다(최박사 확정). */}
      {tabs && tabs.items.length > 0 ? (
        <nav className="console-tabs" aria-label={TAB_GROUP}>
          {tabs.items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              aria-current={isCurrent(it, pathname, groups) ? 'page' : undefined}
              className={`console-tab${isCurrent(it, pathname, groups) ? ' is-current' : ''}`}
            >
              {it.label}
            </Link>
          ))}
        </nav>
      ) : null}

      <MenuSheet
        open={open}
        onClose={() => setOpen(false)}
        name="콘솔"
        groups={sheetGroups}
      />

      <div className="console-main">{children}</div>
    </div>
  );
}
