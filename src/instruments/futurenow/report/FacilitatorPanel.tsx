// 2면 — 인도자 전용 숨은 층 패널(주 함정·믿음의 자리). 코치/운영자 리포트 전용. ADR-77.
//   scoring.ts 가 이미 계산한 trap·faith 를 표시만 한다(채점·AI 입력 불변). 참여자 미노출(ReportScreen 계열에만 산다).
//   톤: 중립·네이비만(care 톤 금지 §2-4) — 경보가 아니라 편성·목회 참고.
import type { CSSProperties } from 'react';
import type { FuturenowScores } from '../scoring';
import { TRAP_AXES, FAITH_LABELS } from './labels';

const panelStyle: CSSProperties = {
  background: 'var(--color-surface-2)',
  border: 'var(--border-hair) solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--space-4)',
};

export function FacilitatorPanel({ scores }: { scores: FuturenowScores }) {
  const { trap, faith } = scores;
  return (
    <section style={panelStyle}>
      {/* 헤더 — 인도자 전용 고지(중립색) */}
      <div className="t-caption" style={{ color: 'var(--color-text-secondary)', letterSpacing: 0.5, marginBottom: 'var(--space-1)' }}>
        인도자 전용 · 참여자에게 보이지 않습니다
      </div>
      <h3 className="t-h2" style={{ color: 'var(--color-primary)', fontSize: 17, margin: '0 0 var(--space-4)' }}>
        숨은 층 — 함정 · 믿음
      </h3>

      {/* 함정 유형 — 주 함정 강조 + D1·D2·D3 원점수 */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <div className="t-body" style={{ color: 'var(--color-text)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>주 함정 유형</div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {TRAP_AXES.map((t) => {
            const primary = trap.primary === t.code;
            const raw = trap[t.code as 'D1' | 'D2' | 'D3'];
            return (
              <div
                key={t.code}
                style={{
                  flex: '1 1 5rem',
                  minWidth: '4.5rem',
                  textAlign: 'center',
                  padding: 'var(--space-3) var(--space-2)',
                  borderRadius: 'var(--radius)',
                  border: `${primary ? 1.5 : 'var(--border-hair)'}px solid ${primary ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: primary ? 'var(--color-surface-1)' : 'transparent',
                }}
              >
                <div className="t-body" style={{ color: primary ? 'var(--color-primary)' : 'var(--color-text-secondary)', fontWeight: primary ? 700 : 400 }}>
                  {t.label}
                </div>
                <div className="t-caption tnum" style={{ color: 'var(--color-text-muted)', marginTop: 2 }}>{raw}</div>
              </div>
            );
          })}
        </div>
        <div className="t-caption" style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
          최고점이 주 함정입니다. 소그룹 편성 참고.
        </div>
      </div>

      {/* 믿음의 자리 — F1·F2, 점수화 안 함(목회적 신호). 무응답 표기 */}
      <div>
        <div className="t-body" style={{ color: 'var(--color-text)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>믿음의 자리</div>
        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
          {(['F1', 'F2'] as const).map((k) => (
            <div key={k}>
              <span className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>{FAITH_LABELS[k]} · </span>
              <span className="t-body" style={{ color: faith[k] == null ? 'var(--color-text-muted)' : 'var(--color-text)' }}>
                {faith[k] == null ? '무응답' : faith[k]}
              </span>
            </div>
          ))}
        </div>
        <div className="t-caption" style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
          점수화하지 않는 목회적 신호입니다.
        </div>
      </div>

      {/* 주의 — 어휘 분리 */}
      <div className="t-caption" style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: 'var(--border-hair) solid var(--color-border)' }}>
        참여자에게 &lsquo;함정&rsquo; 같은 낱말을 그대로 쓰지 않습니다.
      </div>
    </section>
  );
}
