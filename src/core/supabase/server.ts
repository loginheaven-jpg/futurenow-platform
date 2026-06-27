// core/auth — 서버(Server Component · Route Handler · Server Action) Supabase 클라이언트.
// Next 16: cookies() 는 async (await 필수). getAll/setAll 쿠키 규약(@supabase/ssr 0.12).
// 매 요청마다 새 클라이언트를 만든다(요청 간 공유 금지).
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`환경변수 ${name} 가 설정되지 않았습니다(.env.local 확인)`);
  return v;
}

export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Server Component 렌더 중에는 set 이 불가할 수 있다(읽기 전용). 그 경우 무시 —
          // 세션 갱신은 proxy.ts(미들웨어)가 책임진다.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            /* Server Component 컨텍스트: proxy 가 갱신을 처리 */
          }
        },
      },
    },
  );
}
