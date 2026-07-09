'use client';
// §8.1 콘솔 홈 — 돌봄·할 일 중심. 먼저 챙길 분(최상단) → 진행 차수 → 모든 차수/새 차수.
import type { ReactNode } from 'react';
import { Button, ListRow } from '@/core/ui';
import { AppHeader } from '../AppHeader';
import { CohortCard } from './CohortCard';
import type { CohortSummary, RosterMember } from '../types';

export function ConsoleHome({
  coachName,
  careMembers,
  cohorts,
  isAdmin = false,
  pendingCoachApps = 0,
  onGoAdmin,
  onOpenCohort,
  onAllCohorts,
  onNewCohort,
  onOpenMember,
  headerActions,
}: {
  coachName: string;
  careMembers: RosterMember[];
  cohorts: CohortSummary[];
  isAdmin?: boolean; // 운영자 = 모든 인도자 차수 감독 뷰(헤딩·빈 안내 문구 분기). ADR-74
  pendingCoachApps?: number; // 운영자 로그인 알림 — 승인 대기 건수(>0 이면 본부 유도 배너)
  onGoAdmin?: () => void;
  onOpenCohort?: (id: string) => void;
  onAllCohorts?: () => void;
  onNewCohort?: () => void;
  onOpenMember?: (id: string) => void;
  headerActions?: ReactNode; // 셸 헤더 우측(로그아웃·내 정보). 미리보기는 미전달 → 렌더 0.
}) {
  return (
    <div>
      <AppHeader variant="root" title="인도자 콘솔" subtitle={coachName} homeHref="/home" action={headerActions} />

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
          {isAdmin ? '모든 인도자 차수' : '진행 중 차수'}
        </h2>
        {cohorts.length === 0 ? (
          <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
            {isAdmin ? '아직 개설된 차수가 없어요.' : '아직 개설한 차수가 없어요. 아래 [+ 새 차수]로 첫 차수를 시작해 보세요.'}
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
        <Button variant="ghost" onClick={onAllCohorts} style={{ flex: 1 }}>모든 차수</Button>
        <Button onClick={onNewCohort} style={{ flex: 1 }}>+ 새 차수</Button>
      </div>
    </div>
  );
}
