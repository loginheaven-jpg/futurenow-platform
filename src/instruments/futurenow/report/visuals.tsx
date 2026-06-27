// B③ 리포트 시각물(인도자 화면) — design_system §5 v2. 덤벨·레이더·충전막대·띠·돌봄배너.
// 경계(CLAUDE §1): 인스트루먼트는 코어를 import 하지 않는다. 공유 디자인 토큰(var(--color-*)·--care-*·
// --*-soft)과 전역 타이포 클래스(t-*)만 사용. **본문 시각물은 네이비·회색 차분 톤, 의미색은 돌봄 배너에만**(§5).
import type { FuturenowScores } from '../scoring';
import {
  COMPASS_AXES,
  GAP_AXES,
  GROW_AXES,
  VITALITY_RANGE,
  VITALITY_ZONES,
  careBanner,
  vitalityZone,
} from './labels';

// ── 공유 파트 (사전=회색 빈 점 / 사후=네이비 찬 점 / 연결선) ──
function Dot({ pct, filled }: { pct: number; filled: boolean }) {
  return (
    <span
      style={{
        position: 'absolute',
        left: `${pct}%`,
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 14,
        height: 14,
        borderRadius: 'var(--radius-pill)',
        background: filled ? 'var(--color-primary)' : 'var(--color-surface-2)',
        border: `2px solid ${filled ? 'var(--color-primary)' : 'var(--color-border-strong)'}`,
      }}
    />
  );
}
function MoveLine({ a, b }: { a: number; b: number }) {
  const left = Math.min(a, b);
  const w = Math.abs(b - a);
  return (
    <span
      style={{
        position: 'absolute',
        left: `${left}%`,
        top: '50%',
        height: 2,
        width: `${w}%`,
        transform: 'translateY(-50%)',
        background: 'var(--color-primary)',
        opacity: 0.5,
      }}
    />
  );
}

// ── 돌봄 신호 배너 (조건부 최상단, 저채도 의미색) ─────────
export function CareSignal({ scores }: { scores: FuturenowScores }) {
  const banner = careBanner(scores);
  if (!banner) return null;
  return (
    <div
      style={{
        background: 'var(--care-fill)',
        borderLeft: '3px solid var(--care-line)',
        borderRadius: 'var(--radius)',
        padding: 'var(--space-4)',
      }}
    >
      <div className="t-h2" style={{ color: 'var(--care-text)', fontSize: 17, margin: 0 }}>
        {banner.title}
      </div>
      <p className="t-body" style={{ color: 'var(--care-text)', margin: 'var(--space-2) 0 0', opacity: 0.85 }}>
        {banner.body}
      </p>
    </div>
  );
}

// ── 활력 = 띠 이동 (구간 띠 시들음/중간/번성 + 사전→사후, 사전 단독 폴백) ─
export function VitalityBand({ scores, prev }: { scores: FuturenowScores; prev?: FuturenowScores }) {
  const { min, max } = VITALITY_RANGE;
  const post = scores.vitality.score;
  const pre = prev?.vitality.score ?? null;
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const zone = vitalityZone(post);
  const badgeColor = zone.tone === 'care' ? 'var(--care-text)' : 'var(--color-text-secondary)';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-2)' }}>
        <span className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>활력 지수</span>
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
          <span className="t-h2 tnum" style={{ color: 'var(--color-primary)', margin: 0 }}>{post}</span>
          <span className="t-caption" style={{ color: badgeColor, fontWeight: 600 }}>{zone.name}</span>
        </span>
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', height: 12, borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
          {VITALITY_ZONES.map((z) => (
            <div key={z.name} style={{ flex: z.to - z.from + 1, background: z.color }} />
          ))}
        </div>
        {pre !== null && <MoveLine a={pct(pre)} b={pct(post)} />}
        {pre !== null && <Dot pct={pct(pre)} filled={false} />}
        <Dot pct={pct(post)} filled />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-1)' }}>
        <span className="t-micro" style={{ color: 'var(--color-text-muted)' }}>{min}</span>
        <span className="t-micro" style={{ color: badgeColor }}>
          {pre !== null ? `사전 ${pre} → 사후 ${post}` : '구간 게이지(사전 단독)'} · {zone.name} 신호
          {zone.tone === 'care' ? ' · 개별 안부 권장' : ''}
        </span>
        <span className="t-micro" style={{ color: 'var(--color-text-muted)' }}>{max}</span>
      </div>
    </div>
  );
}

// ── 나침반 = 덤벨 (4축, 사전 회색→사후 네이비) ────────────
export function CompassDumbbell({ scores, prev }: { scores: FuturenowScores; prev?: FuturenowScores }) {
  const pct = (v: number) => ((v - 1) / 4) * 100; // 1~5
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {COMPASS_AXES.map((ax) => {
        const post = scores.compass[ax.code as keyof FuturenowScores['compass']];
        const pre = prev ? prev.compass[ax.code as keyof FuturenowScores['compass']] : null;
        return (
          <div key={ax.code}>
            <div className="t-caption" style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
              {ax.label}
            </div>
            <div style={{ position: 'relative', height: 16 }}>
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, background: 'var(--color-surface-sunken)', transform: 'translateY(-50%)' }} />
              {pre !== null && <MoveLine a={pct(pre)} b={pct(post)} />}
              {pre !== null && <Dot pct={pct(pre)} filled={false} />}
              <Dot pct={pct(post)} filled />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 간격 = 레이더 (5축, 사후 네이비 13% 면 + 사전 회색 점선) ─
const RAD = 84;
const CXY = 110;
function radarPoint(i: number, value: number): [number, number] {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
  const r = (value / 10) * RAD;
  return [CXY + r * Math.cos(angle), CXY + r * Math.sin(angle)];
}
const radarPolygon = (values: number[]): string => values.map((v, i) => radarPoint(i, v).join(',')).join(' ');
export function GapRadar({ scores, prev }: { scores: FuturenowScores; prev?: FuturenowScores }) {
  const post = GAP_AXES.map((a) => scores.gap[a.code as keyof FuturenowScores['gap']]);
  const pre = prev ? GAP_AXES.map((a) => prev.gap[a.code as keyof FuturenowScores['gap']]) : null;
  return (
    <svg viewBox="0 0 220 220" width="100%" style={{ maxWidth: 260, display: 'block', margin: '0 auto' }} role="img" aria-label="다섯 영역의 간격 레이더">
      {[2.5, 5, 7.5, 10].map((t, k) => (
        <polygon key={k} points={radarPolygon([t, t, t, t, t])} fill="none" stroke="var(--color-border)" strokeWidth={1} />
      ))}
      {GAP_AXES.map((a, i) => {
        const [x, y] = radarPoint(i, 10);
        return <line key={a.code} x1={CXY} y1={CXY} x2={x} y2={y} stroke="var(--color-border)" strokeWidth={1} />;
      })}
      {pre && <polygon points={radarPolygon(pre)} fill="none" stroke="var(--color-text-muted)" strokeWidth={1.5} strokeDasharray="4 3" />}
      <polygon points={radarPolygon(post)} fill="var(--color-primary)" fillOpacity={0.13} stroke="var(--color-primary)" strokeWidth={2} />
      {GAP_AXES.map((a, i) => {
        const [x, y] = radarPoint(i, 12.6);
        return (
          <text key={a.code} x={x} y={y} fontSize={11} fill="var(--color-text-secondary)" textAnchor="middle" dominantBaseline="middle">
            {a.label}
          </text>
        );
      })}
    </svg>
  );
}

// ── GROW+F = 충전 막대 (사전 회색·사후 네이비 나란히) ─────
function Bar({ widthPct, color }: { widthPct: number; color: string }) {
  return (
    <div style={{ height: 8, borderRadius: 'var(--radius-pill)', background: 'var(--color-surface-sunken)' }}>
      <div style={{ height: '100%', width: `${widthPct}%`, background: color, borderRadius: 'var(--radius-pill)' }} />
    </div>
  );
}
export function GrowBars({ scores, prev }: { scores: FuturenowScores; prev?: FuturenowScores }) {
  const w = (v: number) => (v / 5) * 100;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {GROW_AXES.map((ax) => {
        const post = scores.grow[ax.key as 'G' | 'R' | 'O' | 'W' | 'F'];
        const pre = prev ? prev.grow[ax.key as 'G' | 'R' | 'O' | 'W' | 'F'] : null;
        return (
          <div key={ax.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
              <span className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>{ax.label}</span>
              <span className="t-micro tnum" style={{ color: 'var(--color-text-muted)' }}>
                {post.toFixed(1)}
                {pre !== null ? ` ← ${pre.toFixed(1)}` : ''}
              </span>
            </div>
            <Bar widthPct={w(post)} color="var(--color-primary)" />
            {pre !== null && (
              <div style={{ marginTop: 'var(--space-1)' }}>
                <Bar widthPct={w(pre)} color="var(--color-border-strong)" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
