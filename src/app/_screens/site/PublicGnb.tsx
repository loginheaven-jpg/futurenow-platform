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
import { useCallback, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { isAuthCookieName, parseCookieHeader } from '@/core/supabase/cookiePolicy';
import { SiteGnb, type GnbItem } from './SiteGnb';
import { publicHeaderAction } from './publicNav';

function hasAuthCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return parseCookieHeader(document.cookie).some((c) => isAuthCookieName(c.name));
}

/**
 * 다른 탭에서 로그아웃하고 이 탭으로 돌아오는 경우가 있다. 그때 버튼이 옛 상태로 남으면
 * **버튼이 거짓말을 한다** — 이 조항의 목적과 정반대다. 창이 다시 보일 때 한 번 더 읽는다.
 * (폴링하지 않는다. 끝이 없는 기다림을 만들지 않는다 · §11.)
 */
function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('focus', onChange);
  window.addEventListener('pageshow', onChange);
  return () => {
    window.removeEventListener('focus', onChange);
    window.removeEventListener('pageshow', onChange);
  };
}

export function PublicGnb({
  logo,
  en,
  items,
}: {
  logo: React.ReactNode;
  en?: string;
  items: GnbItem[];
}) {
  // **현재 경로를 prop 으로 받지 않는다**(U-1). 껍데기가 화면마다 다른 값을 들고 있으면
  //   그것이 곧 사본 둘이고, 화면이 하나를 잊으면 현재 표시가 조용히 틀린다.
  //   이 부품은 이미 클라이언트라 `usePathname()` 으로 스스로 안다.
  const currentPath = usePathname() ?? '/';
  // 서버 스냅샷은 **비로그인**이다 — 정적 HTML 이 그렇게 캐시되므로 그것과 같아야 한다.
  const signedIn = useSyncExternalStore(subscribe, hasAuthCookie, useCallback(() => false, []));

  return (
    <SiteGnb logo={logo} en={en} items={items} currentPath={currentPath} login={publicHeaderAction(signedIn)} />
  );
}
