'use client';
// 콘솔 껍데기 — **벨트 한 겹** (U-5 · 지휘부 결재 2026-09-03).
//
// ─────────────────────────────────────────────────────────────────────────────
// **제목바를 걷었다.** U-3 은 벨트·제목바·탭 줄 **셋**이었다(실측 52+58+52 = 162px).
//   지휘부 지적이 정확했다 — *「2열이 없어도 3열에서 현재 위치가 표시되는데?」*
//   탭이 이미 «지금 어디»를 말하므로 제목바는 같은 말을 두 번 했다.
//
//   제목바가 들던 넷의 행선지:
//     · 제목 → 회기 화면은 **탭**이, 탭이 없는 화면(`/coach`·`/coach/cohorts`·`/coach/new`·
//       `/admin`·`/admin/approvals`)은 **본문 첫 줄**이 든다(결재 물음 2 답).
//       그 한 줄은 아래 `.console-title` 이고, 이름은 여전히 **표**에서만 온다(사본 0).
//     · 뒤로 → **폐지**(결재 「뒤로가기는 불필요」). 벨트와 탭이 갈 곳을 다 든다.
//     · 도구(`HeaderActions`) → 시트로. 「내 정보」는 시트 계정 구획에 있다.
//     · 햄버거 → **벨트 하나로 합쳤다.** 전에는 벨트와 제목바에 각각 있어 한 화면에 문이 둘이었다
//       (U-4 §4 「문은 하나씩이다」를 회원 껍데기에서만 고쳤고 콘솔은 남아 있었다).
//
// **벨트를 `.belt-slot` 에서 꺼냈다.** 그 껍질은 lg↑ 에서만 서므로, 제목바를 걷은 채 두면
//   **폰에서 햄버거가 통째로 사라진다.** 회원 껍데기의 `gnb` 갈래가 같은 이유로 이미
//   `SiteGnb` 를 직접 그린다 — 같은 부품을 같은 모양으로 쓴다(사본이 아니다).
//
// **회기 띠는 여기 없다.** 회기 이름은 서버 데이터라 이 껍데기가 알 수 없다 —
//   `/coach/cohort/[cohortId]/layout.tsx` 가 그린다(`ConsoleBand` 머리 주석에 근거).
// ─────────────────────────────────────────────────────────────────────────────
import { usePathname, useParams } from 'next/navigation';
import { SiteGnb } from '@/app/_screens/site/SiteGnb';
import type { MenuGroup } from '@/app/_screens/site/MenuSheet';
import { PUBLIC_NAV } from '@/app/_screens/site/publicNav';
import { cohortIdOf } from './consoleNav';
import { SCREEN_CHROME, patternOf } from '@/app/_lib/screenChrome';

export function ConsoleShell({
  role,
  sheet,
  children,
}: {
  role: 'user' | 'coach' | 'admin';
  /** 시트 자료 — **서버가 짓는다**(`consoleSheet`). 로그아웃은 레이아웃이 얹는다. */
  sheet: { name: string; role?: string; groups: MenuGroup[] } | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? '';
  const params = useParams() as Record<string, string | string[] | undefined>;
  const chrome = SCREEN_CHROME[patternOf(pathname, params)];
  if (role === 'user') return <>{children}</>; // 참여자 — 셸 없이 그대로(발주 §5)

  // 회기 안이면 띠가 제목을 말한다. 그 밖에서만 본문 첫 줄이 든다.
  const bodyTitle = cohortIdOf(pathname) == null && chrome?.kind === 'bar' ? chrome.title : null;

  return (
    <div className="console-shell">
      {/* ★ **벨트가 유일한 문이다.** 시트를 여기 넘기므로 햄버거도 여기 하나뿐이다.
          이 껍데기 안이면 로그인한 사람이다(껍데기의 정의) — 프리페치를 막지 않는다(ADR-176). */}
      <SiteGnb
        logo={<>퓨처<b>나우</b></>}
        en="FUTURE NOW"
        items={PUBLIC_NAV}
        currentPath={pathname}
        signedIn
        sheet={sheet ?? undefined}
      />
      <div className="console-main">
        {bodyTitle ? <h1 className="console-title t-h1">{bodyTitle}</h1> : null}
        {children}
      </div>
    </div>
  );
}
