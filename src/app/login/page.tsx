// 인도자 로그인 라우트 — 서버 컴포넌트(라우트 세그먼트 설정 보유). 로그인 전용(가입은 /join).
// force-dynamic: 빌드 정적 프리렌더 제외 → 빌드 시점에 브라우저 Supabase 클라이언트를 만들지 않는다(env 의존 제거).
import { LoginClient } from './LoginClient';

export const dynamic = 'force-dynamic';

// ?returnTo=… : 로그인 후 되돌아갈 내부 경로(QR 왕복). 서버에서 읽어 전달(useSearchParams/Suspense 회피).
//   실제 검증(화이트리스트)은 loginOutcome 이 수행 — 여기선 원문만 넘긴다.
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string | string[] }> }) {
  const sp = await searchParams;
  const returnTo = Array.isArray(sp.returnTo) ? sp.returnTo[0] : sp.returnTo;
  return <LoginClient returnTo={returnTo ?? null} />;
}
