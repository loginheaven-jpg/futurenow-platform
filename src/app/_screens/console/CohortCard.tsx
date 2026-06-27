'use client';
// 차수 요약 카드(콘솔 홈·모든 차수 공용). 진행률·돌봄 수. 의미색은 돌봄에만.
import { Card, ProgressBar } from '@/core/ui';
import type { CohortSummary } from '../types';

export function CohortCard({ c, onOpen }: { c: CohortSummary; onOpen?: () => void }) {
  return (
    <button type="button" onClick={onOpen} style={{ all: 'unset', display: 'block', cursor: 'pointer' }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-1)' }}>
          <span className="t-h2" style={{ color: 'var(--color-primary)', fontSize: 17 }}>{c.name}</span>
          {c.careCount > 0 ? (
            <span className="t-caption" style={{ color: 'var(--care-text)', fontWeight: 600 }}>먼저 챙길 분 {c.careCount}</span>
          ) : null}
        </div>
        <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-3)' }}>{c.instrumentLabel}</p>
        <ProgressBar value={c.responded} max={c.total} />
        <p className="t-caption tnum" style={{ color: 'var(--color-text-muted)', margin: 'var(--space-2) 0 0' }}>
          응답 {c.responded}/{c.total}
        </p>
      </Card>
    </button>
  );
}
