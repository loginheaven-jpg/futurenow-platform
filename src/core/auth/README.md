# core/auth

인증·세션·현재 사용자. `@supabase/ssr` 서버/브라우저 클라이언트와 세션 게이트.
`CoreContext.currentUser()` / `requireRole()` 의 구현이 여기 자리한다(architecture §7).

> 미해결: 비로그인 허용 여부(plan.md Q1)·참여자 계정 생성 시점(Q2). 결정 전까지
> "로그인 기반" 잠정 가정, 되돌리기 쉽게 느슨히 둔다.
