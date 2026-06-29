// 보호 라우트 판정(순수 — next/supabase 의존 없음, 단위테스트 대상). proxy.ts 가 import.
// 보호(세션 필수): /home · /my · /coach · /admin (및 하위). 공개: / · /login · /signup · /join · 셸 · 정적.
// `=== p || startsWith(p + '/')` 로 '/homex'·'/coaching' 같은 접두 오매칭 방지.
export const PROTECTED_PREFIXES = ['/home', '/my', '/coach', '/admin'];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
