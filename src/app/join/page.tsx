// 참여 진입 라우트(§7). 서버 컴포넌트 — 라우트 세그먼트 설정을 보유한다.
// force-dynamic: 빌드 정적 프리렌더에서 제외 → 빌드 시점에 브라우저 Supabase 클라이언트를 만들지 않는다.
// (env 일시 누락이 빌드를 깨뜨리지 않도록. 오케스트레이션은 JoinClient 가 요청 시 수행.)
import { JoinClient } from './JoinClient';

export const dynamic = 'force-dynamic';

export default function JoinPage() {
  return <JoinClient />;
}
