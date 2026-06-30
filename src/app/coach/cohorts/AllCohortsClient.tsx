'use client';
// 모든 차수 클라이언트 래퍼 — 라우팅만(데이터는 서버 컴포넌트가 주입). 셸 통일(HeaderActions).
import { useRouter } from 'next/navigation';
import { AllCohorts } from '@/app/_screens/console/AllCohorts';
import { HeaderActions } from '@/app/_screens/HeaderActions';
import type { CohortSummary } from '@/app/_screens/types';

export function AllCohortsClient({ cohorts }: { cohorts: CohortSummary[] }) {
  const router = useRouter();
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <AllCohorts
        cohorts={cohorts}
        headerActions={<HeaderActions />}
        backHref="/coach"
        onOpenCohort={(id) => router.push(`/coach/cohort/${id}`)}
        onNewCohort={() => router.push('/coach/new')}
      />
    </div>
  );
}
