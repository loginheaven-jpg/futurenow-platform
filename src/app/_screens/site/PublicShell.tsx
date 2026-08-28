'use client';
// **클라이언트 부품이다**(U-2) — 현재 경로로 크롬 표를 찾아야 하기 때문이다.
//   서버에서 쿠키를 읽지 않으므로 ISR 은 그대로다(아래 주 참조).
// 공개 껍데기 — **화면은 헤더를 그리지 않는다** (U-1 · `design_system.md` §12).
//
// 상단바와 푸터가 여기 **한 곳**에 선다. 화면은 자기가 어느 껍데기에 사는지만 선언하고
//   (= `(public)/` 아래에 사는 것으로 선언이 끝난다) 본문만 그린다.
//   **경로가 곧 선언이므로 화면이 잊어버릴 수가 없다**(§12.2).
//
// ─────────────────────────────────────────────────────────────────────────────
// **ISR 을 깨지 않는다 — 옮기는 것이지 새로 짜는 것이 아니다.**
//
//   `/`(revalidate 300)와 `/recruit`(300)은 정적으로 캐시된다. 서버 컴포넌트에서
//   `cookies()` 를 부르는 순간 라우트가 **동적**이 되고 4차의 게이트가 깨진다.
//   그래서 이 껍데기는 **서버에서 세션을 읽지 않는다.** 세션 판정은 `PublicGnb` 가
//   브라우저에서 쿠키 **이름 접두사만** 보고 한다(ADR-138 · 그 파일 머리에 근거가 있다).
//   **이미 배포되어 돌고 있는 방식을 자리만 옮겼다.**
//
//   ⚠ **한 프레임 깜빡임이 함께 옮겨진다.** 정적 HTML 은 `로그인` 으로 그려지고
//     로그인한 사람에게만 마운트 뒤 `내 홈` 으로 바뀐다. **새 결함이 아니다** —
//     ADR-138 로 배포되어 최박사 실기기에서 확인된 동작이고, ISR 을 지키는 값이다.
//     **적어 두지 않으면 다음 사람이 새 결함으로 오해한다.**
// ─────────────────────────────────────────────────────────────────────────────
//
// **로고는 처음 화면(`/`)으로 이동만 한다 — 로그아웃이 아니다**(§12.3 규칙 3).
//   그 동작은 `SiteGnb` 가 이미 갖고 있고 여기서 바꾸지 않는다.
import { PublicGnb } from './PublicGnb';
import { SiteFooter } from './SiteFooter';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { AppHeader } from '@/app/_screens/AppHeader';
import { SCREEN_CHROME, patternOf } from '@/app/_lib/screenChrome';
import {
  PUBLIC_NAV, PUBLIC_FOOTER_LINKS, SITE_ORG, SITE_NAME, PUBLIC_MENU_TITLE,
  FOOTER_NOTE_HREF, FOOTER_NOTE_LEAD, FOOTER_NOTE_LINK,
} from './publicNav';

export function PublicShell({ children }: { children: React.ReactNode }) {
  // **공개 껍데기도 같은 표를 읽는다**(지휘부 판정) — 껍데기가 하나이므로 표도 하나다.
  //   표에 `bar` 로 적힌 공개 라우트(`/signup`)는 상단바 대신 **제목 바**가 선다.
  //   그 항목은 `flow`(출구 없음)라 **푸터도 그리지 않는다** — 푸터의 링크가 곧 출구다.
  const pathname = usePathname() ?? '/';
  const params = useParams() as Record<string, string | string[] | undefined>;
  const chrome = SCREEN_CHROME[patternOf(pathname, params)];
  if (chrome?.kind === 'bar') {
    return (
      <>
        <AppHeader variant={chrome.variant} title={chrome.title} />
        <main>{children}</main>
      </>
    );
  }

  return (
    <>
      {/* `currentPath` 를 넘기지 않는다 — `PublicGnb` 가 `usePathname()` 으로 스스로 안다.
          껍데기가 화면마다 다른 값을 들고 있으면 그것이 곧 사본 둘이다(불변식 23). */}
      {/* **모바일 메뉴가 여기서 닫힌다**(최박사 문안 확정 2026-09-01).
          768 미만에서 내비가 푸터만 들던 자리다 — 최박사가 모바일로 쓰시고 첫 관찰이 그것이었다.
          **부품을 두 벌 만들지 않는다** — 회원 껍데기가 쓰는 것과 **같은 `MenuSheet`** 이고
          담기는 항목만 다르다. 머리 이름과 묶음 제목은 **이미 있는 말**을 쓴다:
          `SITE_NAME` 은 `SITE_ORG` 의 앞부분이고, `PUBLIC_MENU_TITLE` 은 푸터 내비의 이름이다. */}
      <PublicGnb
        logo={<>퓨처<b>나우</b></>}
        en="FUTURE NOW"
        items={PUBLIC_NAV}
        sheet={{ name: SITE_NAME, groups: [{ title: PUBLIC_MENU_TITLE, items: PUBLIC_NAV }], chips: [] }}
      />
      <main>{children}</main>
      <SiteFooter
        org={SITE_ORG}
        links={PUBLIC_FOOTER_LINKS}
        note={
          <>
            {FOOTER_NOTE_LEAD}
            <Link
              href={FOOTER_NOTE_HREF}
              style={{ color: 'var(--color-accent-strong)', textDecoration: 'underline' }}
            >
              {FOOTER_NOTE_LINK}
            </Link>
          </>
        }
      />
    </>
  );
}
