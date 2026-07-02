// 참여 진입 라우트(§7). 서버 컴포넌트 — 라우트 세그먼트 설정을 보유한다.
// force-dynamic: 빌드 정적 프리렌더에서 제외 → 빌드 시점에 브라우저 Supabase 클라이언트를 만들지 않는다.
// (env 일시 누락이 빌드를 깨뜨리지 않도록. 오케스트레이션은 JoinClient 가 요청 시 수행.)
// ?cohort=… : 가입자 러너 재진입(Step 3.정비) — 서버에서 읽어 클라이언트로 전달(useSearchParams/Suspense 회피).
// ?code=…   : 초대 링크 deep-link(A5) — 코드 입력을 건너뛰고 미리보기로 자동 진입(cohort= 재진입이 우선).
// ?wave=post: 사후 진단 진입(B-2). 기본 'pre'(기존 동작 불변). cohort= 재진입과 함께 실림(파라미터 독립·무충돌).
import { JoinClient } from './JoinClient';

export const dynamic = 'force-dynamic';

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ cohort?: string | string[]; code?: string | string[]; wave?: string | string[] }> }) {
  const sp = await searchParams;
  const cohort = typeof sp.cohort === 'string' ? sp.cohort : null;
  const code = typeof sp.code === 'string' ? sp.code : null;
  const wave = sp.wave === 'post' ? 'post' : 'pre';
  return <JoinClient initialCohortId={cohort} initialCode={code} initialWave={wave} />;
}
