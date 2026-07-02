'use client';
// 코치 콘솔 홈 클라이언트 래퍼 — 라우팅만(데이터는 서버 컴포넌트가 주입).
// 먼저 챙길 분의 id 는 `${cohortId}__${responseId}` 합성(리포트 진입에 cohortId 필요) — 여기서 분해.
import { useRouter } from 'next/navigation';
import { ConsoleHome } from '@/app/_screens/console/ConsoleHome';
import { HeaderActions } from '@/app/_screens/HeaderActions';
import type { CohortSummary, RosterMember } from '@/app/_screens/types';

export function ConsoleHomeClient({
  coachName,
  careMembers,
  cohorts,
  isAdmin = false,
  pendingCoachApps = 0,
}: {
  coachName: string;
  careMembers: RosterMember[];
  cohorts: CohortSummary[];
  isAdmin?: boolean; // 운영자만 [본부]→/admin 노출
  pendingCoachApps?: number; // 운영자 로그인 알림 — 승인 대기 신청 건수(>0 이면 배너)
}) {
  const router = useRouter();
  return (
    <ConsoleHome
      coachName={coachName}
      careMembers={careMembers}
      cohorts={cohorts}
      pendingCoachApps={pendingCoachApps}
      onGoAdmin={() => router.push('/admin')}
      headerActions={<HeaderActions homeHref="/home" navHref={isAdmin ? '/admin' : undefined} navLabel={isAdmin ? '본부' : undefined} />}
      onOpenCohort={(id) => router.push(`/coach/cohort/${id}`)}
      onAllCohorts={() => router.push('/coach/cohorts')}
      onNewCohort={() => router.push('/coach/new')}
      onOpenMember={(composite) => {
        const [cohortId, responseId] = composite.split('__');
        if (cohortId && responseId) router.push(`/coach/cohort/${cohortId}/report/${responseId}`);
      }}
    />
  );
}
