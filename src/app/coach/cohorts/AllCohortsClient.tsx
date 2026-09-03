'use client';
// 모든 회기 클라이언트 래퍼 — 라우팅만(데이터는 서버 컴포넌트가 주입). 셸 통일(HeaderActions).
import { useRouter } from 'next/navigation';
import { AllCohorts } from '@/app/_screens/console/AllCohorts';
import type { CohortSummary } from '@/app/_screens/types';

export function AllCohortsClient({ cohorts, isAdmin = false }: { cohorts: CohortSummary[]; isAdmin?: boolean }) {
  const router = useRouter();
  return (
    <>
      <AllCohorts
        cohorts={cohorts}
        isAdmin={isAdmin}
        backHref="/coach"
        onOpenCohort={(id) => router.push(`/coach/cohort/${id}?from=cohorts`)}
        onNewCohort={() => router.push('/coach/new')}
      />
    </>
  );
}
