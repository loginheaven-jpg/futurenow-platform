// 검증된 신원 헤더(S-1). proxy(미들웨어)가 getUser 로 서명·만료를 검증한 user.id 를 이 헤더로 서버 컴포넌트/액션에 전달한다.
//   → page 의 currentUser 가 getUser(Auth 서버 왕복)를 생략하고 이 id 로 users SELECT 만 한다(요청당 Auth 왕복 2→1).
// **신뢰 경계**: proxy 가 인입 동명 헤더를 먼저 strip 하고, 자기가 검증한 값만 세팅한다. 클라이언트가 이 헤더를 위조 전송해도
//   proxy 가 지우므로 무효 — proxy 만 세팅 가능하다(미들웨어 matcher 가 정적 자산 외 전 경로를 덮어 전수 strip). role·email 은 싣지 않는다(민감·스테일 회피).
// 순수 상수(무-import) — proxy(nodejs)·서버 리더 공용, 클라이언트 번들 무관.
export const VERIFIED_UID_HEADER = 'x-futurenow-verified-uid';
