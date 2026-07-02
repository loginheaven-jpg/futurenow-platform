// core/auth — 서버(Server Component · Route Handler · Server Action) Supabase 클라이언트.
// Next 16: cookies() 는 async (await 필수). getAll/setAll 쿠키 규약(@supabase/ssr 0.12).
// 매 요청마다 새 클라이언트를 만든다(요청 간 공유 금지).
import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import type { CoreContext } from '@/contracts';
import { createCoreContext, type CreateCoreContextOptions } from '@/core/context';
import { VERIFIED_UID_HEADER } from '@/core/auth/verifiedIdentity';

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

// proxy(S-1)가 세팅한 검증된 신원 헤더를 읽는다(서버 전용). 없으면 null → CoreContext 가 getUser fallback.
//   요청 스코프 밖(빌드 등)에서 headers() 가 throw 하면 null(안전 폴백).
export async function readVerifiedUserId(): Promise<string | null> {
  try {
    const h = await headers();
    return h.get(VERIFIED_UID_HEADER);
  } catch {
    return null;
  }
}

// 서버 CoreContext 합성(S-1) — createServerSupabase + proxy 검증 신원(verifiedUserId) 주입.
//   서버 컴포넌트·서버 액션 공용. 이 경로의 currentUser 는 getUser(Auth 왕복) 생략(헤더 있을 때) → 요청당 Auth 왕복 2→1.
export async function createServerContext(options: CreateCoreContextOptions = {}): Promise<CoreContext> {
  const sb = await createServerSupabase();
  const verifiedUserId = await readVerifiedUserId();
  return createCoreContext(sb, { ...options, verifiedUserId });
}
