'use client';
// 코치 콘솔 미리보기(개발용) — §8. 돌봄 우선·의미색 절제·정렬 확인용.
import type { ReactNode } from 'react';
import { ConsoleHome } from '@/app/_screens/console/ConsoleHome';
import { CreateCohort } from '@/app/_screens/console/CreateCohort';
import { CohortDetail } from '@/app/_screens/console/CohortDetail';
import { AllCohorts } from '@/app/_screens/console/AllCohorts';
import type { CohortSummary, RosterMember } from '@/app/_screens/types';

const cohorts: CohortSummary[] = [
  { id: 'co1', name: '2026 봄 미래의 나 1기', instrumentLabel: '퓨처나우 사전', responded: 7, total: 10, careCount: 1, code: 'RSTUV' },
  { id: 'co2', name: '청년부 2기', instrumentLabel: '퓨처나우 사전', responded: 12, total: 12, careCount: 0, code: 'KMNPQ' },
];

const roster: RosterMember[] = [
  { id: 'm1', userId: 'u1', name: '이참여', status: 'care', note: '활력 시들음 · 개별 안부 권장' },
  { id: 'm2', userId: 'u2', name: '박응답', status: 'done' },
  { id: 'm3', userId: 'u3', name: '최완료', status: 'done' },
  { id: 'm4', userId: 'u4', name: '정대기', status: 'pending' },
  { id: 'm5', userId: 'u5', name: '한아직', status: 'pending' },
];

const careMembers = roster.filter((m) => m.status === 'care');

function Frame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ width: 380 }}>
      <div className="t-caption" style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>{label}</div>
      <div style={{ background: 'var(--color-bg)', border: 'var(--border-hair) solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
        {children}
      </div>
    </div>
  );
}

export default function ConsolePreviewPage() {
  return (
    <div style={{ padding: 'var(--space-6)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-6)', alignItems: 'flex-start' }}>
      <Frame label="§8.1 콘솔 홈">
        <ConsoleHome coachName="김인도 인도자" careMembers={careMembers} cohorts={cohorts} />
      </Frame>
      <Frame label="§8.3 차수 상세">
        <CohortDetail cohort={cohorts[0]} roster={roster} />
      </Frame>
      <Frame label="§8.2 차수 개설(3스텝)">
        <CreateCohort />
      </Frame>
      <Frame label="§8.4 모든 차수">
        <AllCohorts cohorts={cohorts} />
      </Frame>
    </div>
  );
}
