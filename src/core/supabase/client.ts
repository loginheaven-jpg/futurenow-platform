// core/auth — 브라우저(Client Component) Supabase 클라이언트.
// @supabase/ssr 0.12 규약. 코어는 public 스키마(거점=SAIL 승격)를 기본으로 쓴다.
//
// 중요(Next 인라인 규칙): 클라이언트 번들에는 **정적 참조** `process.env.NEXT_PUBLIC_*` 만 빌드시 인라인된다.
// 동적 접근(`process.env[name]`)은 인라인되지 않아 브라우저에서 undefined → createBrowserClient 가 throw →
// 화면이 "This page couldn't load" 로 깨진다(SSR 은 런타임 env 라 통과하므로 서버는 200, 브라우저만 실패).
// 그래서 두 변수를 반드시 리터럴 멤버 접근으로 읽는다.
import { createBrowserClient } from '@supabase/ssr';

export function createBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('환경변수 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 설정되지 않았습니다(.env.local · Vercel env 확인)');
  }
  return createBrowserClient(url, anonKey);
}
