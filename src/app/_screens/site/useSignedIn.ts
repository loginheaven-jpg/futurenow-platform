'use client';
// 지금 보는 사람이 로그인했는가 — **판독을 한 곳에 둔다**(ADR-176).
//
// 전에는 `PublicGnb` 안에만 있었다. 푸터도 같은 값이 필요해지자 **두 벌이 될 뻔했고**,
//   두 벌이 되면 한쪽만 고쳐지는 날 화면마다 다른 답을 낸다(불변식 23).
//
// **쿠키의 존재만 본다** — 유효성은 서버가 판정한다. 여기서 하는 일은
//   *「버튼을 어느 모양으로 그릴까 · 링크를 미리 받아 둘까」* 뿐이고 **권한 판정이 아니다.**
import { useCallback, useSyncExternalStore } from 'react';
import { isAuthCookieName, parseCookieHeader } from '@/core/supabase/cookiePolicy';

function hasAuthCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return parseCookieHeader(document.cookie).some((c) => isAuthCookieName(c.name));
}

/**
 * 다른 탭에서 로그아웃하고 이 탭으로 돌아오는 경우가 있다. 그때 값이 옛 상태로 남으면
 * **화면이 거짓말을 한다.** 창이 다시 보일 때 한 번 더 읽는다.
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

/** 서버 스냅숏은 언제나 `false` 다 — 서버에서 쿠키를 읽지 않으므로 ISR 이 그대로다. */
export function useSignedIn(): boolean {
  return useSyncExternalStore(subscribe, hasAuthCookie, useCallback(() => false, []));
}
