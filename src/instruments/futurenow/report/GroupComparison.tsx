import type { AverageScores } from './groupModel';
import { Panel } from './ReportScreen';
import { CompassDumbbell, GapRadar } from './visuals';

// 같은 사람의 사전·사후 평균만 받는다. 개인 판정이나 준비도 카드를 그리지 않는다(ADR-205).
export function GroupComparison({ before, after }: { before: AverageScores; after: AverageScores }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <p className="t-caption tnum" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
        {`활력 평균 · 사전 ${before.vitality.score.toFixed(1)} → 사후 ${after.vitality.score.toFixed(1)}`}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 'var(--space-4)' }}>
        <Panel title="나침반 — 마음이 향하는 쪽">
          <CompassDumbbell scores={after} prev={before} />
        </Panel>
        <Panel title="다섯 영역의 간격">
          <GapRadar scores={after} prev={before} />
        </Panel>
      </div>
    </div>
  );
}
