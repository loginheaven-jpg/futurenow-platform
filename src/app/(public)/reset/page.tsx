// 비밀번호 재설정 요청(/reset) — 공개 라우트(잊은 사람이 쓰는 화면, proxy 보호 목록 미포함).
// 서버 컴포넌트 force-dynamic(빌드 env 의존 제거). 비번은 auth.users 소관 — 계약·public.users·RLS 무관.
import { ResetRequestClient } from './ResetRequestClient';

export const dynamic = 'force-dynamic';

export default function ResetPage() {
  return <ResetRequestClient />;
}
