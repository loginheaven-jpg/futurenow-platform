'use client';
// 공개 헤더 오케스트레이터 — **세션 유무만 알아내고 판정은 순수 함수에 맡긴다** (5차 소건 1-바).
//
// 부품(`SiteGnb`)은 여전히 계산하지 않는다. 여기가 화면 층이고, 여기가 세션을 한 번 읽어
// `publicHeaderAction()` 에 넘긴 결과를 prop 으로 내려준다.
//
// ─────────────────────────────────────────────────────────────────────────────
// **왜 서버가 아니라 브라우저에서 읽는가 — ISR 을 깨지 않기 위해서다.**
//
//   `/`(revalidate 300)와 `/about`(정적)은 **카톡으로 수십 명이 동시에 여는 링크**라
//   정적으로 캐시된다. 서버 컴포넌트에서 `cookies()` 를 부르는 순간 라우트가 **동적**이 되고
//   4차의 게이트(*ISR 무손상*)가 깨진다. 그래서 세션 판정을 **클라이언트로 내린다.**
//
//   대가: 정적 HTML 은 `로그인` 으로 그려지고, 로그인한 사람에게만 마운트 뒤 `내 홈` 으로 바뀐다.
//   **한 프레임 깜빡인다.** 이것이 ISR 을 지키는 값이고, 감추지 않고 적어 둔다.
//   서버 스냅샷을 비로그인으로 두었으므로 **하이드레이션 불일치는 없다**(정적 HTML 과 같다).
//
// **왜 `supabase.auth.getSession()` 이 아니라 쿠키 존재인가.**
//
//   ⑴ 공개 현관 번들에 `supabase-js` 를 끌어들이지 않는다. 이 링크는 처음 만나는 사람이
//      모바일 데이터로 여는 자리다.
//   ⑵ 쿠키 **값**을 해석하지 않는다. 값 안의 만료 시각을 읽으려면 토큰 형식(base64url·청크)에
//      결합돼야 하는데, 그것이 하네스 머리가 경고한 **자가제작 우회**다 — 형식이 바뀌면 조용히 깨진다.
//      여기서는 **이름 접두사만** 본다(`isAuthCookieName`).
//
//   **한계와 그 크기**: 만료된 쿠키가 남아 있으면 `내 홈` 이 보이고, 눌렀을 때 미들웨어가
//   `/login` 으로 보낸다 — **지금과 같은 결과이고 더 나빠지지 않는다.**
//   게다가 `proxy` 가 **매 요청**에서 `getUser()` 로 검증·갱신하며 공개 경로도 그 matcher 안이라
//   (불변식 17 — 좁히지 않는다) 현관을 여는 그 요청에서 이미 정리된다. 어긋나는 창이 좁다.
import { usePathname } from 'next/navigation';
import { useSignedIn } from './useSignedIn';
import { SiteGnb, type GnbItem } from './SiteGnb';
import { ACCOUNT_DOOR, HOME_DOOR } from '@/app/_vocab/doors';
import { ACCOUNT_GROUP } from '@/app/_lib/memberSheet';
import { LogoutButton } from '@/app/_screens/LogoutButton';
import { PUBLIC_SHEET_MINE, publicHeaderAction } from './publicNav';


export function PublicGnb({
  logo,
  en,
  items,
  sheet,
}: {
  logo: React.ReactNode;
  en?: string;
  items: GnbItem[];
  /** 모바일 전체 메뉴(U-2 §3). **회원 껍데기와 같은 부품**이고 담기는 항목만 다르다. */
  sheet?: React.ComponentProps<typeof SiteGnb>['sheet'];
}) {
  // **현재 경로를 prop 으로 받지 않는다**(U-1). 껍데기가 화면마다 다른 값을 들고 있으면
  //   그것이 곧 사본 둘이고, 화면이 하나를 잊으면 현재 표시가 조용히 틀린다.
  //   이 부품은 이미 클라이언트라 `usePathname()` 으로 스스로 안다.
  const currentPath = usePathname() ?? '/';
  // 서버 스냅샷은 **비로그인**이다 — 정적 HTML 이 그렇게 캐시되므로 그것과 같아야 한다.
  const signedIn = useSignedIn();

  // ★ **「내 홈」을 시트 맨 위에 얹는다**(ADR-174). 로그인하면 벨트 우측 글자가 햄버거가 되어
  //   그 문이 사라지므로 시트가 잇는다. **비로그인에게는 주지 않는다** — 갈 수 없는 곳으로
  //   보내지 않는다(현관과 같은 규율). **문안은 `HOME_DOOR` 단일 출처**이고 여기서 짓지 않는다.
  //   ★ **계정 구획도 함께 준다**(지휘부 결재 2026-09-03 「가」). 공개 화면에서도 나갈 수 있어야 한다 —
  //   전에는 로그인한 사람이 `/about`·`/library` 에서 나가려면 「내 홈」을 한 번 거쳐야 했다.
  //   **구획 이름과 문안은 회원 시트가 쓰는 것을 그대로 읽는다**(불변식 23) — 여기서 짓지 않는다.
  const sheetWithHome = sheet && signedIn
    ? {
        ...sheet,
        groups: [
          { title: PUBLIC_SHEET_MINE, items: [HOME_DOOR] },
          ...sheet.groups,
          { title: ACCOUNT_GROUP, items: [ACCOUNT_DOOR], action: <LogoutButton variant="sheet" /> },
        ],
      }
    : sheet;

  return (
    // **홈에서만 띠를 투명하게 둔다**(ADR-171) — 히어로 장면이 위까지 이어진다.
    //   다른 공개 화면은 배경 이미지가 없어 투명하면 흰 바탕에 흰 글자가 된다.
    //   판정은 여기(화면 층)가 하고 부품은 받아 그린다.
    <SiteGnb
      logo={logo} en={en} items={items} currentPath={currentPath}
      // ★ **로그인하면 버튼이 햄버거로 바뀐다**(ADR-174 · 지휘부 확정 2026-09-02).
      //   로그인한 사람에게는 `login` 을 주지 않는다 — 그러면 그 자리를 시트 여는 문이 잇고,
      //   메뉴 여섯은 그대로 남는다(지시 「벨트는 유지되고 버튼만 바뀐다」).
      //   **「내 홈」은 사라지지 않고 시트 맨 위로 옮겨 간다** — 아래 `sheet` 가 그것을 든다.
      login={signedIn ? undefined : publicHeaderAction(false)} sheet={sheetWithHome}
      signedIn={signedIn}
      transparent={currentPath === '/'}
    />
  );
}
