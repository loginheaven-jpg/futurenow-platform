// 보호 라우트 판정(순수 — next/supabase 의존 없음, 단위테스트 대상). proxy.ts 가 import.
// 보호(세션 필수): /home · /my · /coach · /admin · /account · /preview (및 하위). 공개: / · /login · /signup · /join · /reset · 셸 · 정적.
// `=== p || startsWith(p + '/')` 로 '/homex'·'/coaching' 같은 접두 오매칭 방지.
// /account 는 로그인 게이트 라우트 — 미들웨어에서 일원 차단(페이지 게이트만 의존하지 않게, Step 2.2 일관).
// /preview 는 개발용 미리보기(ADR-93). 스스로 '운영 라우트 아님'이라 선언했으면서 인증이 없어, 사전진단 문항 원문
//   전량(클라이언트 번들)·리포트 구조·콘솔 레이아웃이 공개돼 있었다. 세션은 여기서, 역할은 preview/layout.tsx 에서 막는다.
export const PROTECTED_PREFIXES = ['/home', '/my', '/coach', '/admin', '/account', '/preview'];

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

// ── 미인증 차단 시 로그인 URL 의 쿼리 (S-3 · returnTo 복원) ──────────────────
//
// **원 요청의 `search` 는 절대 복사하지 않는다.** 그것이 `af6576d`(Step 2.2)가 `loginUrl.search = ''`
//   로 세운 근거이고 **지금도 유효하다** — `/my/...?access_token=…` 같은 요청이 오면 통째로 옮길 때
//   토큰이 로그인 URL·브라우저 이력·referrer·로그에 남는다.
//
// 그러나 그 근거는 **"쿼리를 옮기지 마라"이지 "경로를 버려라"가 아니었다.** 경로만 실으면
//   민감 쿼리는 한 글자도 전파되지 않으면서 딥링크 복귀가 산다(IA 설계철학 원칙 1·2).
//
// **여기서 화이트리스트를 검사하지 않는다.** 검증은 소비 쪽(`loginOutcome` → `safeReturnTo`)이
//   이미 한다. 여기서 한 번 더 하면 화이트리스트가 두 곳이 되고, 그것이 이 저장소가 반복해서
//   데인 "사본이 둘"이다. 통과 못 하는 경로는 로그인 뒤 `/home` 으로 떨어진다.
export function loginRedirectSearch(pathname: string): string {
  if (typeof pathname !== 'string' || !pathname.startsWith('/')) return '';
  // 프로토콜 상대(`//`)는 경로가 아니라 호스트로 읽힐 수 있다 — 애초에 싣지 않는다.
  if (pathname.startsWith('//')) return '';
  return `?returnTo=${encodeURIComponent(pathname)}`;
}
