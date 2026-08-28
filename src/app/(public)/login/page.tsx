// 인도자 로그인 라우트 — 서버 컴포넌트(라우트 세그먼트 설정 보유). 로그인 전용(가입은 /join).
// force-dynamic: 빌드 정적 프리렌더 제외 → 빌드 시점에 브라우저 Supabase 클라이언트를 만들지 않는다(env 의존 제거).
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/core/supabase/server';
import { LoginClient } from './LoginClient';
import { loginOutcome } from './loginOutcome';

export const dynamic = 'force-dynamic';

// ?returnTo=… : 로그인 후 되돌아갈 내부 경로(QR 왕복). 서버에서 읽어 전달(useSearchParams/Suspense 회피).
//   실제 검증(화이트리스트)은 loginOutcome 이 수행 — 여기선 원문만 넘긴다.
// **소건 1-가 — 이미 로그인한 사람을 여기 세워 두지 않는다.**
//   4차 F-5 B행에서 최박사가 *"뒤로가기 연타에 로그아웃이 일어난다"* 고 하셨는데,
//   운영 실측 결과 로그아웃이 아니었다: `/feed → /home → **/login** → / → 이탈` 이었고
//   그 시점에 세션 쿠키가 그대로 살아 있었다. **로그인 화면을 본 것이 로그아웃으로 읽힌 것**이다.
//   (`signOut()` 호출 지점은 저장소 전체에 `LogoutButton` 하나뿐이고 뒤로가기는 그것을 부르지 않는다.)
//
//   그래서 소건 1 은 "구 세션 건"과 "뒤로가기 건"을 **한 뿌리**로 묶었다 —
//   세션이 있으면 여기서 돌려보낸다. 착지 판정은 `loginOutcome` 을 재사용한다(사본 둘 방지).
//
//   **게이트-데이터 순서를 지킨다**(§9 · 불변식 19) — 세션 판정이 먼저이고,
//   돌려보낼 때는 화면을 그리지 않는다. `redirect()` 는 200 + `__NEXT_REDIRECT` 로 서빙될 수 있으므로
//   판정 근거는 상태코드가 아니라 **본문에 로그인 폼이 없다는 것**이다.
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string | string[] }> }) {
  const sp = await searchParams;
  const returnTo = Array.isArray(sp.returnTo) ? sp.returnTo[0] : sp.returnTo;

  const sb = await createServerSupabase();
  const { data } = await sb.auth.getUser();
  if (data.user) {
    // returnTo 검증은 loginOutcome 안의 화이트리스트가 한다 — 여기서 다시 판정하지 않는다.
    redirect(loginOutcome({ error: null, hasSession: true, returnTo: returnTo ?? null }).redirect ?? '/home');
  }

  return <LoginClient returnTo={returnTo ?? null} />;
}
