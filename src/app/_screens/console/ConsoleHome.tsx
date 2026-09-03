'use client';
// §8.1 콘솔 홈 — 돌봄·할 일 중심. 먼저 챙길 분(최상단) → 진행 회기 → 모든 회기/새 회기.
import { Button, ListRow } from '@/core/ui';
import { CohortCard } from './CohortCard';
import type { CohortSummary, RosterMember } from '../types';

export function ConsoleHome({
  careMembers,
  cohorts,
  isAdmin = false,
  pendingCoachApps = 0,
  onGoAdmin,
  onOpenCohort,
  onAllCohorts,
  onNewCohort,
  onOpenMember,
}: {
  coachName: string;
  careMembers: RosterMember[];
  cohorts: CohortSummary[];
  isAdmin?: boolean; // 운영자 = 모든 인도자 회기 감독 뷰(헤딩·빈 안내 문구 분기). ADR-74
  pendingCoachApps?: number; // 운영자 로그인 알림 — 승인 대기 건수(>0 이면 본부 유도 배너)
  onGoAdmin?: () => void;
  onOpenCohort?: (id: string) => void;
  onAllCohorts?: () => void;
  onNewCohort?: () => void;
  onOpenMember?: (id: string) => void;
}) {
  return (
    <div>
      {/* **헤더는 껍데기가 그린다**(U-3 · §12.3 규칙 1). 제목·뒤로는 `_lib/screenChrome` 표가 든다. */}

      {pendingCoachApps > 0 && (
        <button
          type="button"
          onClick={onGoAdmin}
          className="t-body"
          style={{
            width: '100%',
            textAlign: 'left',
            minHeight: 'var(--tap-min)',
            padding: 'var(--space-3) var(--space-4)',
            marginBottom: 'var(--space-6)',
            borderRadius: 'var(--radius)',
            border: '1.5px solid var(--color-accent)',
            background: 'var(--color-accent-soft)',
            color: 'var(--color-primary)',
            cursor: 'pointer',
          }}
        >
          승인 대기 {pendingCoachApps}건 · 본부에서 확인 ›
        </button>
      )}

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
        <h2 className="t-h2" style={{ color: 'var(--color-primary)', fontSize: 17, margin: '0 0 var(--space-3)' }}>
          {isAdmin ? '모든 인도자 회기' : '진행 중 회기'}
        </h2>
        {cohorts.length === 0 ? (
          <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
            {isAdmin ? '아직 개설된 회기가 없어요.' : '아직 개설한 회기가 없어요. 아래 [+ 새 회기]로 첫 회기를 시작해 보세요.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {cohorts.map((c) => (
              <CohortCard key={c.id} c={c} onOpen={() => onOpenCohort?.(c.id)} />
            ))}
          </div>
        )}
      </section>

      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <Button variant="ghost" onClick={onAllCohorts} style={{ flex: 1 }}>모든 회기</Button>
        <Button onClick={onNewCohort} style={{ flex: 1 }}>+ 새 회기</Button>
      </div>
    </div>
  );
}
