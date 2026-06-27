// B③ 그룹 평균 뷰(1주차 오프닝). GROW 오프닝 = 단계 사슬(§7.1). + 그룹 평균 간격 레이더·활력 평균.
// 코어 import 금지 — 역할 토큰·타이포 클래스만.
import type { CSSProperties } from 'react';
import type { FuturenowScores } from '../scoring';
import { GAP_AXES, GROW_AXES } from './labels';
import { GapRadar } from './visuals';

const avg = (nums: number[]): number => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);

const panelStyle: CSSProperties = {
  background: 'var(--color-surface-2)',
  border: 'var(--border-hair) solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--space-4)',
};

// 단계 사슬 — G·R·O·W·F 노드를 선으로 연결, 각 단계 그룹 평균.
function GrowChain({ grow }: { grow: Record<'G' | 'R' | 'O' | 'W' | 'F', number> }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
      {GROW_AXES.map((ax, i) => (
        <div key={ax.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
          {i < GROW_AXES.length - 1 && (
            <div style={{ position: 'absolute', top: 18, left: '50%', width: '100%', height: 2, background: 'var(--color-border)' }} />
          )}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-pill)',
              border: '2px solid var(--color-accent)',
              background: 'var(--color-accent-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <span className="t-caption" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
              {ax.key}
            </span>
          </div>
          <span className="t-caption" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
            {ax.label}
          </span>
          <span className="t-micro tnum" style={{ color: 'var(--color-text-muted)' }}>
            {grow[ax.key as 'G' | 'R' | 'O' | 'W' | 'F'].toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function GroupView({ all }: { all: FuturenowScores[] }) {
  if (!all.length) {
    return (
      <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>
        아직 응답이 없습니다.
      </p>
    );
  }
  const grow = {
    G: avg(all.map((s) => s.grow.G)),
    R: avg(all.map((s) => s.grow.R)),
    O: avg(all.map((s) => s.grow.O)),
    W: avg(all.map((s) => s.grow.W)),
    F: avg(all.map((s) => s.grow.F)),
  };
  const gap = Object.fromEntries(
    GAP_AXES.map((a) => [a.code, avg(all.map((s) => s.gap[a.code as keyof FuturenowScores['gap']]))]),
  ) as FuturenowScores['gap'];
  const vitalityAvg = avg(all.map((s) => s.vitality.score));
  // GapRadar 는 scores.gap 만 읽으므로 그룹 평균 gap 만 채운 합성 객체 전달(prev 없음).
  const groupScores = { gap } as FuturenowScores;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <section style={panelStyle}>
        <h3 className="t-h2" style={{ color: 'var(--color-primary)', fontSize: 17, margin: '0 0 var(--space-2)' }}>
          준비도 단계 — 그룹 평균
        </h3>
        <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-6)' }}>
          참여자 {all.length}명 · 활력 평균 {vitalityAvg.toFixed(1)}
        </p>
        <GrowChain grow={grow} />
      </section>
      <section style={panelStyle}>
        <h3 className="t-h2" style={{ color: 'var(--color-primary)', fontSize: 17, margin: '0 0 var(--space-4)' }}>
          다섯 영역의 간격 — 그룹 평균
        </h3>
        <GapRadar scores={groupScores} />
      </section>
    </div>
  );
}
