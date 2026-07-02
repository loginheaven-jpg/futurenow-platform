// 보호 라우트 판정(순수 — next/supabase 의존 없음, 단위테스트 대상). proxy.ts 가 import.
// 보호(세션 필수): /home · /my · /coach · /admin · /account (및 하위). 공개: / · /login · /signup · /join · /reset · 셸 · 정적.
// `=== p || startsWith(p + '/')` 로 '/homex'·'/coaching' 같은 접두 오매칭 방지.
// /account 는 로그인 게이트 라우트 — 미들웨어에서 일원 차단(페이지 게이트만 의존하지 않게, Step 2.2 일관).
export const PROTECTED_PREFIXES = ['/home', '/my', '/coach', '/admin', '/account'];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// ── matcher 불변식(S-1 위조-strip 커버리지·ADR-66) ────────────────────────────────
// proxy 는 인입 검증 신원 헤더(VERIFIED_UID_HEADER)를 strip 하고 자기 검증값만 세팅한다(신뢰 경계). 그 안전은
// **matcher 가 정적 자산 외 전 경로를 덮어 매 요청 strip 이 실행됨**에 달려 있다. matcher 가 빠뜨린 경로에선 strip 이 안 돌아
// 클라이언트가 신원 헤더를 위조 주입할 수 있다(위장 구멍).
//   **불변식: matcher 를 좁히지 말 것.** negative-lookahead 에 라우트 제외를 추가하거나 allowlist(특정 경로만 매칭) 방식으로
//   전환하면 커버리지가 깨진다. 제외는 정적 자산(_next/*·favicon·이미지 확장자)에 한한다 — 신규 라우트는 opt-in 없이 기본 커버되어야 한다.
// proxy.ts config.matcher 와 proxyMatcherCovers(회귀 테스트)가 이 단일 상수를 공유해 드리프트를 막는다.
export const PROXY_MATCHER = '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)';

// 주어진 경로가 matcher 에 매칭되는지(=proxy 가 실행돼 strip 하는지). 순수 — 회귀 테스트용.
export function proxyMatcherCovers(pathname: string): boolean {
  return new RegExp(`^${PROXY_MATCHER}$`).test(pathname);
}
