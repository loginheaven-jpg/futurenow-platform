// 코치 콘솔(실데이터) — §8.1. 서버 컴포넌트. 사용자 세션 의존이라 동적 렌더.
// 집계 출처(전부 계약 메서드, RLS 게이트):
//   차수 목록 = listCohortsByCoach(me.id)   먼저 챙길 분 = listAlerts(care/red_flag) — **저장된 출처**(재채점 금지)
//   응답/총원 = listResponses · listEnrollments
//   멤버 이름 = listCohortMembers(cohort_member_directory RPC, 코치/운영자 id+name만 — ADR-24). plan Q6 해소.
// 먼저 챙길 분 이름 경로: alert.responseId → response.userId → member.name. name null 이면 '참여자' 폴백.
import { ConsoleHomeClient } from './ConsoleHomeClient';
import { buildCohortRoster } from './rosterModel';
import { instrumentDisplay, type CohortSummary, type RosterMember } from '@/app/_screens/types';
import { createCoreContext } from '@/core/context';
import { createServerSupabase } from '@/core/supabase/server';

export const dynamic = 'force-dynamic';

export default async function CoachConsolePage() {
  const ctx = createCoreContext(await createServerSupabase());
  const me = await ctx.currentUser();

  if (!me || me.role === 'user') {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>코치 전용 화면입니다.</p>
      </div>
    );
  }

  const cohorts = await ctx.listCohortsByCoach(me.id);
  const summaries: CohortSummary[] = [];
  const careMembers: RosterMember[] = [];

  for (const c of cohorts) {
    const [enrollments, responses, alerts, members] = await Promise.all([
      ctx.listEnrollments(c.id),
      ctx.listResponses({ instrumentId: c.instrumentId, cohortId: c.id }),
      ctx.listAlerts(c.id),
      ctx.listCohortMembers(c.id),
    ]);

    const { roster, responded, waiting, careCount } = buildCohortRoster({ enrollments, responses, alerts, members });

    summaries.push({
      id: c.id,
      name: c.name,
      instrumentLabel: instrumentDisplay(c.instrumentId).label,
      responded,
      total: responded + waiting,
      careCount,
      code: c.code,
    });

    // 먼저 챙길 분(전 차수 합산). id=`${cohortId}__${responseId}` — 리포트 진입에 cohortId 필요.
    for (const m of roster) {
      if (m.status !== 'care') continue;
      careMembers.push({ id: `${c.id}__${m.id}`, name: m.name, status: 'care', note: `${m.note ?? ''} · ${c.name}` });
    }
  }

  return <ConsoleHomeClient coachName={me.name ?? me.email} careMembers={careMembers} cohorts={summaries} />;
}
