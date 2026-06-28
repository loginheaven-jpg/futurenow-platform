// 인도자 로그인 라우트 — 서버 컴포넌트(라우트 세그먼트 설정 보유). 로그인 전용(가입은 /join).
// force-dynamic: 빌드 정적 프리렌더 제외 → 빌드 시점에 브라우저 Supabase 클라이언트를 만들지 않는다(env 의존 제거).
import { LoginClient } from './LoginClient';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return <LoginClient />;
}
