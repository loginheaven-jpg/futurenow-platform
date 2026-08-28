'use client';
// §8.4 모든 차수 — 차수 목록(홈 요약 카드와 동일 양식). 카드 탭 → 차수 상세.
// Step 3.1 셸 통일 → **U-3 에서 헤더가 껍데기로 갔다**(로그아웃·내 정보는 ConsoleShell 이 든다). Step 3.2: 빈 상태(+새 차수) + /coach/cohorts 배선.
import { Button } from '@/core/ui';
import { CohortCard } from './CohortCard';
import type { CohortSummary } from '../types';

export function AllCohorts({
  cohorts,
  isAdmin = false,
  onOpenCohort,
  onNewCohort,
}: {
  cohorts: CohortSummary[];
  backHref?: string; // 셸 sub 뒤로 경로(→/coach). X2b 모드 셸 전환
  isAdmin?: boolean; // 운영자 = 모든 인도자 차수 감독(제목·빈 안내 분기). ADR-74
  onOpenCohort?: (id: string) => void;
  onNewCohort?: () => void;
}) {
  return (
    <div>
      {/* **헤더는 껍데기가 그린다**(U-3 · §12.3 규칙 1). 제목·뒤로는 `_lib/screenChrome` 표가 든다. */}
      {cohorts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-4)' }}>
          <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-4)' }}>
            {isAdmin ? '아직 개설된 차수가 없어요.' : '아직 만든 차수가 없어요.'}
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
