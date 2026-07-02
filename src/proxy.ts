// Next.js 16 proxy (구 middleware). nodejs 런타임(edge 미지원).
// 인증 가드 일원화(Step 2.2): ⑴ 세션 갱신(기존) + ⑵ 보호 라우트 미인증 차단(신규).
// @supabase/ssr 서버 세션을 매 요청에서 새로고침해 만료 토큰을 갱신하고 응답 쿠키에 기록한다(server.ts 가 위임한 책임).
// role(인가)은 middleware 가 판정하지 않는다 — edge 매 요청 DB 조회 회피. 미인증→/login 만 일원화, role 게이트는 페이지(심층방어).
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isProtectedPath } from './proxy.guard'; // 순수 판정(테스트 대상)
import { VERIFIED_UID_HEADER } from './core/auth/verifiedIdentity';

export async function proxy(request: NextRequest) {
  // 신뢰 경계(S-1): 인입 신원 헤더를 먼저 strip — 클라이언트 위조를 무효화한다. proxy 만 검증된 값을 세팅한다.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(VERIFIED_UID_HEADER);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // 환경변수 미설정 시 세션 갱신을 건너뛴다(빌드/정적 경로 안전). strip 된 헤더는 그대로 전달.
  if (!url || !key) return NextResponse.next({ request: { headers: requestHeaders } });

  // 세션 갱신 쿠키를 모아 최종 response 를 한 번만 빌드한다(검증 신원 헤더 + refresh 쿠키를 함께 싣기 위해).
  const refreshed: { name: string; value: string; options: CookieOptions }[] = [];
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value)); // 다운스트림 getUser 가 새 토큰을 보게
        cookiesToSet.forEach((c) => refreshed.push(c)); // 브라우저 응답 쿠키는 최종 response 에 적용
      },
    },
  });

  // ⑴ 세션 갱신 + 신원 검증: getUser() 가 만료 토큰을 갱신(refreshed 에 쿠키)하고 JWT(서명·만료)를 Auth 서버로 검증한다.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ⑵ 보호 라우트 미인증 차단(인증 차원만 일원화). 세션 없으면 /login. role 은 페이지가 판정.
  if (!user && isProtectedPath(request.nextUrl.pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = ''; // 토큰·민감 쿼리 미전파
    return NextResponse.redirect(loginUrl);
  }

  // 검증된 신원을 page 로 전달(S-1) — page 의 currentUser 가 getUser 를 생략하고 이 id 로 users SELECT.
  //   proxy 가 방금 서명·만료를 검증했으므로 검증 우회 아님. 위조 헤더는 위 strip 으로 이미 제거됨.
  if (user) requestHeaders.set(VERIFIED_UID_HEADER, user.id);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  refreshed.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); // 세션 갱신 쿠키 보존
  return response;
}

export const config = {
  // 정적 자산·이미지 제외, 그 외 모든 경로에서 실행. 세션 갱신은 공개 경로 포함 전역(로그인 사용자 토큰 유지),
  // 보호 차단은 본문 isProtectedPath 가 한정. 정적/이미지를 빼 불필요한 실행을 줄인다.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
