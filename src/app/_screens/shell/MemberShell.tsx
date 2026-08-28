'use client';
// 회원 껍데기 — **화면은 헤더를 그리지 않는다** (U-2 · `design_system.md` §12).
//
// 제목과 뒤로는 화면이 아니라 **라우트의 성질**이므로 `screenChrome` 표에서 읽는다
//   (지휘부 판정 (다) 2026-08-31). 화면이 자기 제목을 아는 것은 우연이지 필연이 아니다.
//
// **클라이언트 부품인 이유**: 현재 경로와 동적 세그먼트를 `usePathname()`·`useParams()` 로
//   스스로 알아야 표를 찾을 수 있다. 화면이 넘기면 그것이 곧 사본 둘이다(불변식 23).
//
// **`flow` 에는 메뉴를 달지 않는다.** `AppHeader` 정의가 *진입 선형 플로우용, 일부러 출구 없음*
//   이라 못 박았고, 껍데기가 메뉴를 달면 **확정을 코드가 뒤집는다.**
//   규칙 2는 *메뉴는 한 자리에서만 열린다* 이지 *모든 화면에 메뉴가 있다* 가 아니다.
import { usePathname, useParams } from 'next/navigation';
import { AppHeader } from '@/app/_screens/AppHeader';
import { HeaderActions } from '@/app/_screens/HeaderActions';
import { HOME_DOOR } from '@/app/_vocab/doors';
import { useState } from 'react';
import { SiteGnb } from '@/app/_screens/site/SiteGnb';
import { MenuSheet } from '@/app/_screens/site/MenuSheet';
import type { MenuGroup } from '@/app/_screens/site/MenuSheet';
import type { SessionChip } from '@/app/_screens/site/SessionChipStrip';
import { SCREEN_CHROME, patternOf, resolveBack } from '@/app/_lib/screenChrome';
import { useChrome } from './chromeContext';

export interface ShellSheet {
  name: string;
  role: string;
  cohort?: string;
  groups: MenuGroup[];
  chips: SessionChip[];
}

export function MemberShell({ sheet, children }: { sheet: ShellSheet | null; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? '/';
  const params = useParams() as Record<string, string | string[] | undefined>;
  const pattern = patternOf(pathname, params);
  const chrome = SCREEN_CHROME[pattern];
  // **화면이 알려 온 크롬이 표를 이긴다**(U-4 §1) — `/join` 처럼 라우트 하나에 단계가 여럿인 자리다.
  //   통로 밖이면 `null` 이고 표가 그대로 이긴다.
  const override = useChrome();

  // 표에 없거나 «껍데기 없음» 이면 **그리지 않는다.** 빈 제목을 그리면 조용히 이상해지고,
  //   표에 없는 라우트는 `tests/screenChrome.test.ts` 가 이미 레드로 잡는다.
  if (!chrome || chrome.kind === 'none') return <>{children}</>;

  const sheetProp = chrome.menu && sheet ? sheet : undefined;

  if (chrome.kind === 'gnb') {
    return (
      <>
        <SiteGnb logo={<>퓨처<b>나우</b></>} variant="member" currentPath={pathname} sheet={sheetProp} />
        {children}
      </>
    );
  }

  // **제목 바에도 메뉴가 선다.** `AppHeader` 를 고치지 않고 **기존 `action` 슬롯**에 단추를 넣는다 —
  //   부품을 두 벌 만들지 않는다(§3). 시트 자체는 `SiteGnb` 가 쓰는 것과 **같은 `MenuSheet`** 다.
  const menuButton = sheetProp ? (
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
  ) : null;

  return (
    <>
      <AppHeader
        variant={override ? (override.variant ?? (override.onBack || override.backHref ? 'sub' : 'flow')) : chrome.variant}
        title={override?.title ?? chrome.title}
        subtitle={override?.subtitle}
        onBack={override?.onBack}
        backHref={override?.backHref ?? resolveBack(pattern, params)}
        action={
          chrome.actions || menuButton ? (
            <>
              {/* **문은 하나씩이다**(U-4 §4 · 공통 규칙 4). `sub` 는 `AppHeader` 가 이미 홈 아이콘을 그린다 —
                  거기에 홈을 또 넘기면 한 바에 같은 문이 둘이다. **실측으로 잡았다**: `journey`·`report`·
                  `checkin/[session]` 세 화면이 홈 2개였다(`aria-label` 2 · `href="/home"` 2).
                  `HeaderActions` 자신의 주석이 «sub 화면은 homeHref 를 넘기지 않는다» 라고 이미 적고 있었고
                  U-2 가 그 조건을 빠뜨렸다. 규칙이 아니라 **조건**이 막는다. */}
              {chrome.actions ? <HeaderActions homeHref={chrome.variant === 'sub' ? undefined : HOME_DOOR.href} /> : null}
              {menuButton}
            </>
          ) : undefined
        }
      />
      {sheetProp ? (
        <MenuSheet open={open} onClose={() => setOpen(false)} {...sheetProp} />
      ) : null}
      {children}
    </>
  );
}
