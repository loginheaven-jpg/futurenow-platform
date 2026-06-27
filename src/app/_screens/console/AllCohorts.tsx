'use client';
// §8.4 모든 차수 — 차수 목록(홈 요약 카드와 동일 양식). 카드 탭 → 차수 상세.
import { AppHeader } from '../AppHeader';
import { CohortCard } from './CohortCard';
import type { CohortSummary } from '../types';

export function AllCohorts({
  cohorts,
  onBack,
  onOpenCohort,
}: {
  cohorts: CohortSummary[];
  onBack?: () => void;
  onOpenCohort?: (id: string) => void;
}) {
  return (
    <div>
      <AppHeader title="모든 차수" onBack={onBack} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {cohorts.map((c) => (
          <CohortCard key={c.id} c={c} onOpen={() => onOpenCohort?.(c.id)} />
        ))}
      </div>
    </div>
  );
}
