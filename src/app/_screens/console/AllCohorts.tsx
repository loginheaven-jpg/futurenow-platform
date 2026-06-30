'use client';
// §8.4 모든 차수 — 차수 목록(홈 요약 카드와 동일 양식). 카드 탭 → 차수 상세.
// Step 3.1 셸 통일: headerActions(로그아웃·내 정보). Step 3.2: 빈 상태(+새 차수) + /coach/cohorts 배선.
import type { ReactNode } from 'react';
import { Button } from '@/core/ui';
import { AppHeader } from '../AppHeader';
import { CohortCard } from './CohortCard';
import type { CohortSummary } from '../types';

export function AllCohorts({
  cohorts,
  backHref,
  onOpenCohort,
  onNewCohort,
  headerActions,
}: {
  cohorts: CohortSummary[];
  backHref?: string; // 셸 sub 뒤로 경로(→/coach). X2b 모드 셸 전환
  onOpenCohort?: (id: string) => void;
  onNewCohort?: () => void;
  headerActions?: ReactNode; // 셸 헤더 우측(로그아웃·내 정보). 미리보기는 미전달 → 렌더 0.
}) {
  return (
    <div>
      <AppHeader variant="sub" title="모든 차수" backHref={backHref} homeHref="/coach" action={headerActions} />
      {cohorts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-4)' }}>
          <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-4)' }}>
            아직 만든 차수가 없어요.
          </p>
          {onNewCohort ? <Button onClick={onNewCohort}>+ 새 차수 만들기</Button> : null}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {cohorts.map((c) => (
            <CohortCard key={c.id} c={c} onOpen={() => onOpenCohort?.(c.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
