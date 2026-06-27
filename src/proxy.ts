// Next.js 16 proxy (구 middleware). nodejs 런타임(edge 미지원). 세션 갱신 책임.
// @supabase/ssr 서버 세션을 매 요청에서 새로고침해 만료 토큰을 갱신하고 응답 쿠키에 기록한다.
// 화면·라우팅 보호 로직은 디자인/인증 흐름 확정 후 추가한다(현재는 세션 갱신만).
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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

  // 중요: getUser() 호출이 만료 토큰을 갱신하고 setAll 로 새 쿠키를 응답에 싣는다.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // 정적 자산·이미지 최적화 경로 제외. 그 외 모든 경로에서 세션 갱신.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
