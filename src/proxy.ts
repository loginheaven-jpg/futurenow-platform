// Next.js 16 proxy (구 middleware). nodejs 런타임(edge 미지원).
// 인증 가드 일원화(Step 2.2): ⑴ 세션 갱신(기존) + ⑵ 보호 라우트 미인증 차단(신규).
// @supabase/ssr 서버 세션을 매 요청에서 새로고침해 만료 토큰을 갱신하고 응답 쿠키에 기록한다(server.ts 가 위임한 책임).
// role(인가)은 middleware 가 판정하지 않는다 — edge 매 요청 DB 조회 회피. 미인증→/login 만 일원화, role 게이트는 페이지(심층방어).
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isProtectedPath } from './proxy.guard'; // 순수 판정(테스트 대상)

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // 환경변수 미설정 시 세션 갱신을 건너뛴다(빌드/정적 경로 안전).
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // ⑴ 세션 갱신: getUser() 가 만료 토큰을 갱신하고 setAll 로 새 쿠키를 응답에 싣는다.
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

  return response;
}

export const config = {
  // 정적 자산·이미지 제외, 그 외 모든 경로에서 실행. 세션 갱신은 공개 경로 포함 전역(로그인 사용자 토큰 유지),
  // 보호 차단은 본문 isProtectedPath 가 한정. 정적/이미지를 빼 불필요한 실행을 줄인다.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
