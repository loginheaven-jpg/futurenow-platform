// 새 비밀번호 설정(/reset/confirm) — 재설정 링크 진입점. 공개 라우트(proxy 보호 목록 미포함).
// 서버 컴포넌트 force-dynamic(빌드 env 의존 제거). 복구 세션 게이트는 ResetConfirmClient.
import { ResetConfirmClient } from './ResetConfirmClient';

export const dynamic = 'force-dynamic';

export default function ResetConfirmPage() {
  return <ResetConfirmClient />;
}
