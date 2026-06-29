// 보호 라우트 판정(순수 — next/supabase 의존 없음, 단위테스트 대상). proxy.ts 가 import.
// 보호(세션 필수): /home · /my · /coach · /admin · /account (및 하위). 공개: / · /login · /signup · /join · /reset · 셸 · 정적.
// `=== p || startsWith(p + '/')` 로 '/homex'·'/coaching' 같은 접두 오매칭 방지.
// /account 는 로그인 게이트 라우트 — 미들웨어에서 일원 차단(페이지 게이트만 의존하지 않게, Step 2.2 일관).
export const PROTECTED_PREFIXES = ['/home', '/my', '/coach', '/admin', '/account'];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
