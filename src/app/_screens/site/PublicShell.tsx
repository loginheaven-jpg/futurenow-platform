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
import { useSignedIn } from './useSignedIn';
import { SiteFooter } from './SiteFooter';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { AppHeader } from '@/app/_screens/AppHeader';
import { SCREEN_CHROME, patternOf } from '@/app/_lib/screenChrome';
import { useChrome } from '@/app/_screens/shell/chromeContext';
import {
  PUBLIC_NAV, PUBLIC_FOOTER_LINKS, SITE_ORG, SITE_NAME, PUBLIC_MENU_TITLE,
  FOOTER_NOTE_HREF, FOOTER_NOTE_LEAD, FOOTER_NOTE_LINK,
} from './publicNav';

export function PublicShell({ children }: { children: React.ReactNode }) {
  const signedIn = useSignedIn();
  // **공개 껍데기도 같은 표를 읽는다**(지휘부 판정) — 껍데기가 하나이므로 표도 하나다.
  //   표에 `bar` 로 적힌 공개 라우트(`/signup`)는 상단바 대신 **제목 바**가 선다.
  //   그 항목은 `flow`(출구 없음)라 **푸터도 그리지 않는다** — 푸터의 링크가 곧 출구다.
  const pathname = usePathname() ?? '/';
  const params = useParams() as Record<string, string | string[] | undefined>;
  const chrome = SCREEN_CHROME[patternOf(pathname, params)];
  // **화면이 알려 온 크롬이 표를 이긴다**(U-4 §1) — `/join` 처럼 라우트 하나에 단계가 여럿인 자리다.
  //   통로 밖이면 `null` 이고 표가 그대로 이긴다.
  const override = useChrome();

  // ─────────────────────────────────────────────────────────────────────────────
  // ★★ **트리 모양을 바꾸지 않는다 — 이것이 규약이다**(비상 수정 2026-08-29).
  //
  //   전에는 갈래마다 **다른 모양**을 돌려줬다(`<AppHeader/><main>` · `<main>` · `<PublicGnb/><main><Footer/>`).
  //   React 는 형제 위치로 화해하므로 **모양이 바뀌면 `{children}` 이 언마운트되고 다시 마운트된다.**
  //   그리고 `useSetChrome` 은 **언마운트 때 크롬을 지운다** — 그래서 되먹임이 돌았다:
  //
  //     크롬 설정 → 껍데기가 갈래를 바꿈 → 본문 재마운트 → 언마운트 정리가 크롬을 지움
  //       → 갈래가 되돌아감 → 또 재마운트 → 처음부터 다시 …
  //
  //   **실측(2026-08-29)**: `/join?code=…` 에서 5초에 `<main>` 이 **175회** 교체되고
  //   서버 액션 POST 가 **초당 37회**(운영 6.9회) 나갔다. 화면은 「불러오는 중」에서 못 벗어나고
  //   서버가 503 을 냈다. **모집 중인 화면이 막혀 있었다.**
  //
  //   그래서 갈래를 **슬롯**으로 바꾼다 — 머리와 발만 갈리고 `{children}` 의 자리는 **언제나 같다.**
  //   `null` 도 형제 자리를 차지하므로 위치가 흔들리지 않는다.
  //   **새 라우트를 더할 때 이 모양을 깨지 마라** — `library.shell.test.tsx` 가 그것을 잰다.
  // ─────────────────────────────────────────────────────────────────────────────
  const header = override ? (
    <AppHeader
      variant={override.variant ?? (override.onBack || override.backHref ? 'sub' : 'flow')}
      title={override.title}
      subtitle={override.subtitle}
      backHref={override.backHref}
      onBack={override.onBack}
    />
  ) : chrome?.kind === 'bar' ? (
    <AppHeader variant={chrome.variant} title={chrome.title} />
  ) : chrome?.kind === 'none' ? (
    // 표가 `none` 이면 민무늬다 — GNB 도 푸터도 그리지 않는다(`/join` 의 세 단계가 여기로 온다).
    null
  ) : (
    /* `currentPath` 를 넘기지 않는다 — `PublicGnb` 가 `usePathname()` 으로 스스로 안다.
       껍데기가 화면마다 다른 값을 들고 있으면 그것이 곧 사본 둘이다(불변식 23).
       **모바일 메뉴가 여기서 닫힌다**(최박사 문안 확정 2026-09-01) — 회원 껍데기와 **같은 `MenuSheet`** 이다. */
    <PublicGnb
      logo={<>퓨처<b>나우</b></>}
      en="FUTURE NOW"
      items={PUBLIC_NAV}
      /* ★ **「내 홈」이 시트 맨 위에 선다**(ADR-174). 로그인하면 벨트 우측 버튼이 햄버거가 되어
         그 글자가 사라지므로, **자기 집으로 가는 길**을 시트가 잇는다(지휘부 확정 2026-09-02).
         비로그인에게는 주지 않는다 — 갈 수 없는 곳으로 보내지 않는다(현관과 같은 규율).
         **문안을 새로 짓지 않았다** — `HOME_DOOR` 가 단일 출처다. */
      sheet={{
        name: SITE_NAME,
        groups: [{ title: PUBLIC_MENU_TITLE, items: PUBLIC_NAV }],
        chips: [],
      }}
    />
  );

  // 푸터는 **평상시에만** 선다. 제목 바(`flow`)와 민무늬에는 두지 않는다 — 푸터의 링크가 곧 출구다.
  const footer = override || chrome?.kind === 'bar' || chrome?.kind === 'none' ? null : (
    <SiteFooter
      /* 미인증이면 보호 링크를 미리 받지 않는다(ADR-176) — 푸터도 벨트와 **같은 「진단」**을 그린다.
         첫 판에서 벨트만 고쳤더니 배포 뒤에도 헛 프리페치가 그대로 나갔다. 판독은 훅 하나가 한다. */
      signedIn={signedIn}
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
  );

  return (
    <>
      {header}
      <main>{children}</main>
      {footer}
    </>
  );
}
