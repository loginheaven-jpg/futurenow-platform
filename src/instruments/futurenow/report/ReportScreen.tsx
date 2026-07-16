// B③ 종합 리포트 화면(인도자). 배치(§7.2): 돌봄 신호(조건부 최상단) → 헤드라인(활력·나침반)
// → 깊이(간격·GROW+F) → 주관식. 데스크톱 2×2 / 모바일 1열(auto-fit), 위계 순서 동일.
// 코어 import 금지 — 역할 토큰·타이포 클래스만(경계 CLAUDE §1).
import type { CSSProperties, ReactNode } from 'react';
import type { FuturenowScores } from '../scoring';
import { SUBJECTIVE_LABELS } from './labels';
import { CareSignal, CompassDumbbell, GapRadar, GrowBars, VitalityBand } from './visuals';
import { FacilitatorPanel } from './FacilitatorPanel';

const panelStyle: CSSProperties = {
  background: 'var(--color-surface-2)',
  border: 'var(--border-hair) solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--space-4)',
};

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={panelStyle}>
      <h3 className="t-h2" style={{ color: 'var(--color-primary)', fontSize: 17, margin: '0 0 var(--space-4)' }}>
        {title}
      </h3>
      {children}
    </section>
  );
}

export function ReportScreen({ scores, prev }: { scores: FuturenowScores; prev?: FuturenowScores }) {
  const subj = scores.subjective;
  const hasSubjective = !!(subj.E1 || subj.E2 || subj.E3);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <CareSignal scores={scores} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-4)' }}>
        <Panel title="활력의 이동">
          <VitalityBand scores={scores} prev={prev} />
        </Panel>
        <Panel title="나침반 — 바늘의 이동">
          <CompassDumbbell scores={scores} prev={prev} />
        </Panel>
        <Panel title="다섯 영역의 간격">
          <GapRadar scores={scores} prev={prev} />
        </Panel>
        <Panel title="준비도 (GROW+F)">
          <GrowBars scores={scores} prev={prev} />
        </Panel>
      </div>
      {hasSubjective && (
        <Panel title="나에게 묻는 시간">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {(['E1', 'E2', 'E3'] as const).map((k) =>
              subj[k] ? (
                <div key={k}>
                  <div className="t-caption" style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
                    {SUBJECTIVE_LABELS[k]}
                  </div>
                  <p className="t-body" style={{ color: 'var(--color-text)', margin: 0, whiteSpace: 'pre-line' }}>
                    {subj[k]}
                  </p>
                </div>
              ) : null,
            )}
          </div>
        </Panel>
      )}
      {/* 2면 — 인도자 전용 숨은 층(주관식 다음). ADR-77 */}
      <FacilitatorPanel scores={scores} />
    </div>
  );
}
