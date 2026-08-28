// core/auth — 브라우저(Client Component) Supabase 클라이언트.
// @supabase/ssr 0.12 규약. 코어는 public 스키마(거점=SAIL 승격)를 기본으로 쓴다.
//
// 중요(Next 인라인 규칙): 클라이언트 번들에는 **정적 참조** `process.env.NEXT_PUBLIC_*` 만 빌드시 인라인된다.
// 동적 접근(`process.env[name]`)은 인라인되지 않아 브라우저에서 undefined → createBrowserClient 가 throw →
// 화면이 "This page couldn't load" 로 깨진다(SSR 은 런타임 env 라 통과하므로 서버는 200, 브라우저만 실패).
// 그래서 두 변수를 반드시 리터럴 멤버 접근으로 읽는다.
import { createBrowserClient } from '@supabase/ssr';
import {
  applyPersistence,
  parseCookieHeader,
  readPersist,
  secureCookies,
  serializeCookie,
} from './cookiePolicy';

export function createBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('환경변수 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 설정되지 않았습니다(.env.local · Vercel env 확인)');
  }
  // 소건 1-라 · 마 — 쿠키 층 둘을 여기서 정한다. 판정은 전부 `cookiePolicy` 의 순수 함수다.
  //
  //   라(`secure`): 라이브러리 기본값에 `Secure` 가 없다. **프로토콜을 보고** 붙인다 —
  //     `http://localhost` 에 붙이면 브라우저가 쿠키를 저장하지 않아 개발 로그인이 통째로 깨진다.
  //
  //   마(로그인 유지): 라이브러리가 `setCookieOptions` 에서 `maxAge` 를 **강제로 덮어쓰므로**
  //     `cookieOptions.maxAge` 로는 세션 쿠키를 만들 수 없다. 그래서 어댑터를 넘겨 **수명 한 칸만** 지운다.
  //     이름·값·나머지 옵션은 **라이브러리가 만들어 건네준 것 그대로**다 — 토큰 형식을 읽지도 만들지도 않는다.
  const secure = secureCookies(typeof location === 'undefined' ? null : location.protocol);
  return createBrowserClient(url, anonKey, {
    cookieOptions: { secure },
    cookies: {
      getAll() {
        if (typeof document === 'undefined') return [];
        return parseCookieHeader(document.cookie);
      },
      setAll(cookiesToSet) {
        if (typeof document === 'undefined') return;
        const persist = readPersist(); // 매 쓰기마다 읽는다 — 스위치를 끈 직후부터 바로 듣는다
        for (const { name, value, options } of cookiesToSet) {
          document.cookie = serializeCookie(name, value, applyPersistence({ ...options }, persist));
        }
      },
    },
  });
}
