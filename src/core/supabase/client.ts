// core/auth — 브라우저(Client Component) Supabase 클라이언트.
// @supabase/ssr 0.12 규약. 코어는 public 스키마(거점=SAIL 승격)를 기본으로 쓴다.
import { createBrowserClient } from '@supabase/ssr';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`환경변수 ${name} 가 설정되지 않았습니다(.env.local 확인)`);
  return v;
}

export function createBrowserSupabase() {
  return createBrowserClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  );
}
