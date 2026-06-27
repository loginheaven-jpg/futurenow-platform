'use client';
// §8.1 콘솔 홈 — 돌봄·할 일 중심. 먼저 챙길 분(최상단) → 진행 차수 → 모든 차수/새 차수.
import { Button, ListRow } from '@/core/ui';
import { AppHeader } from '../AppHeader';
import { CohortCard } from './CohortCard';
import type { CohortSummary, RosterMember } from '../types';

export function ConsoleHome({
  coachName,
  careMembers,
  cohorts,
  onOpenCohort,
  onAllCohorts,
  onNewCohort,
  onOpenMember,
}: {
  coachName: string;
  careMembers: RosterMember[];
  cohorts: CohortSummary[];
  onOpenCohort?: (id: string) => void;
  onAllCohorts?: () => void;
  onNewCohort?: () => void;
  onOpenMember?: (id: string) => void;
}) {
  return (
    <div>
      <AppHeader title="코치 콘솔" subtitle={coachName} />

      {careMembers.length > 0 && (
        <section style={{ marginBottom: 'var(--space-6)' }}>
          <h2 className="t-h2" style={{ color: 'var(--care-text)', fontSize: 17, margin: '0 0 var(--space-3)' }}>먼저 챙길 분</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {careMembers.map((m) => (
              <ListRow key={m.id} tone="care" title={m.name} subtitle={m.note} trailing="›" onClick={() => onOpenMember?.(m.id)} />
            ))}
          </div>
        </section>
      )}

      <section style={{ marginBottom: 'var(--space-6)' }}>
        <h2 className="t-h2" style={{ color: 'var(--color-primary)', fontSize: 17, margin: '0 0 var(--space-3)' }}>진행 중 차수</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {cohorts.map((c) => (
            <CohortCard key={c.id} c={c} onOpen={() => onOpenCohort?.(c.id)} />
          ))}
        </div>
      </section>

      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <Button variant="ghost" onClick={onAllCohorts} style={{ flex: 1 }}>모든 차수</Button>
        <Button onClick={onNewCohort} style={{ flex: 1 }}>+ 새 차수</Button>
      </div>
    </div>
  );
}
