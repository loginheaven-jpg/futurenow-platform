'use client';
// §8.3 차수 상세 클라이언트 래퍼 — 라우팅·관리 액션 배선. 데이터는 서버 컴포넌트가 주입.
import { useRouter } from 'next/navigation';
import { CohortDetail } from '@/app/_screens/console/CohortDetail';
import type { CohortSummary, RosterMember } from '@/app/_screens/types';
import { archiveCohortAction, setCohortCapAction } from './actions';

export function CohortDetailClient({
  summary,
  roster,
  status,
  maxMembers,
}: {
  summary: CohortSummary;
  roster: RosterMember[];
  status: 'active' | 'archived';
  maxMembers: number;
}) {
  const router = useRouter();
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <CohortDetail
        cohort={summary}
        roster={roster}
        status={status}
        maxMembers={maxMembers}
        onBack={() => router.push('/coach')}
        onOpenMember={(responseId) => router.push(`/coach/cohort/${summary.id}/report/${responseId}`)}
        onArchive={async () => {
          await archiveCohortAction(summary.id);
          router.refresh();
        }}
        onSetCap={async (n) => {
          await setCohortCapAction(summary.id, n);
          router.refresh();
        }}
      />
    </div>
  );
}
