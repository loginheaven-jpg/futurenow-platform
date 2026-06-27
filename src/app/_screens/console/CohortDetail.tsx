'use client';
// §8.3 차수 상세 — 돌봄 우선 명단. 3숫자 요약 + 명단 3묶음(먼저 챙길 분/응답 완료/아직 안 함).
import type { ReactNode } from 'react';
import { ListRow } from '@/core/ui';
import { AppHeader } from '../AppHeader';
import type { CohortSummary, RosterMember } from '../types';

function Stat({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div
      style={{
        flex: 1,
        textAlign: 'center',
        padding: 'var(--space-4) var(--space-2)',
        background: 'var(--color-surface-2)',
        border: 'var(--border-hair) solid var(--color-border)',
        borderRadius: 'var(--radius)',
      }}
    >
      <div className="t-display tnum" style={{ color, fontSize: 28 }}>{n}</div>
      <div className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>{label}</div>
    </div>
  );
}

function Group({ title, color, children }: { title: string; color?: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 'var(--space-6)' }}>
      <h2 className="t-h2" style={{ color: color ?? 'var(--color-primary)', fontSize: 16, margin: '0 0 var(--space-2)' }}>{title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>{children}</div>
    </section>
  );
}

export function CohortDetail({
  cohort,
  roster,
  onBack,
  onOpenMember,
}: {
  cohort: CohortSummary;
  roster: RosterMember[];
  onBack?: () => void;
  onOpenMember?: (id: string) => void;
}) {
  const care = roster.filter((m) => m.status === 'care');
  const done = roster.filter((m) => m.status === 'done');
  const pending = roster.filter((m) => m.status === 'pending');

  return (
    <div>
      <AppHeader title={cohort.name} subtitle="진행 중" onBack={onBack} />

      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <Stat n={done.length} label="응답 완료" color="var(--color-primary)" />
        <Stat n={pending.length} label="대기" color="var(--color-text-muted)" />
        <Stat n={care.length} label="돌봄" color="var(--care-text)" />
      </div>

      {care.length > 0 && (
        <Group title="먼저 챙길 분" color="var(--care-text)">
          {care.map((m) => (
            <ListRow key={m.id} tone="care" title={m.name} subtitle={m.note} trailing="›" onClick={() => onOpenMember?.(m.id)} />
          ))}
        </Group>
      )}

      <Group title="응답 완료">
        {done.length ? (
          done.map((m) => <ListRow key={m.id} title={m.name} trailing="›" onClick={() => onOpenMember?.(m.id)} />)
        ) : (
          <p className="t-caption" style={{ color: 'var(--color-text-muted)' }}>아직 없어요.</p>
        )}
      </Group>

      <Group title="아직 안 함">
        {pending.map((m) => (
          <ListRow key={m.id} title={m.name} subtitle="미응답" />
        ))}
      </Group>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 'var(--space-4)',
          background: 'var(--color-surface-1)',
          borderRadius: 'var(--radius)',
        }}
      >
        <span className="t-body" style={{ color: 'var(--color-text-secondary)' }}>
          참여 코드 <strong className="tnum" style={{ color: 'var(--color-primary)', letterSpacing: 2 }}>{cohort.code}</strong>
        </span>
        <button
          type="button"
          className="t-caption"
          style={{ minHeight: 'var(--tap-min)', padding: '0 var(--space-4)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border-strong)', background: 'transparent', color: 'var(--color-primary)', cursor: 'pointer' }}
        >
          다시 공유
        </button>
      </div>
    </div>
  );
}
