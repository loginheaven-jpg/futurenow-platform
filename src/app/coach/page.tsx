// 코치 콘솔(실데이터) — §8.1. 서버 컴포넌트. 사용자 세션 의존이라 동적 렌더.
// 집계 출처(전부 계약 메서드, RLS 게이트):
//   차수 목록 = listCohortsByCoach(me.id)   먼저 챙길 분 = listAlerts(care/red_flag) — **저장된 출처**(재채점 금지)
//   응답/총원 = listResponses · listEnrollments
//   멤버 이름 = listCohortMembers(cohort_member_directory RPC, 코치/운영자 id+name만 — ADR-24). plan Q6 해소.
// 먼저 챙길 분 이름 경로: alert.responseId → response.userId → member.name. name null 이면 '참여자' 폴백.
import { ConsoleHome } from '@/app/_screens/console/ConsoleHome';
import { instrumentDisplay, type CohortSummary, type RosterMember } from '@/app/_screens/types';
import { createCoreContext } from '@/core/context';
import { createServerSupabase } from '@/core/supabase/server';

export const dynamic = 'force-dynamic';

export default async function CoachConsolePage() {
  const sb = await createServerSupabase();
  const ctx = createCoreContext(sb);
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

    const respondedUsers = new Set(responses.map((r) => r.userId).filter(Boolean));
    const careAlerts = alerts.filter((a) => a.severity === 'care' || a.severity === 'red_flag');

    // 이름 경로: responseId → userId → member.name (없으면 '참여자' 폴백).
    const responseUser = new Map(responses.map((r) => [r.id, r.userId] as const));
    const memberName = new Map(members.map((m) => [m.userId, m.name] as const));
    const nameFor = (responseId: string): string => {
      const uid = responseUser.get(responseId);
      return (uid ? memberName.get(uid) : null) ?? '참여자';
    };

    // 먼저 챙길 분: 응답(사람) 단위로 묶고, 더 강한 신호(red_flag)를 우선. note=사유들.
    const byResponse = new Map<string, { severity: 'care' | 'red_flag'; reasons: string[] }>();
    for (const a of careAlerts) {
      const sev = a.severity as 'care' | 'red_flag';
      const e = byResponse.get(a.responseId) ?? { severity: sev, reasons: [] };
      e.reasons.push(a.reason);
      if (sev === 'red_flag') e.severity = 'red_flag';
      byResponse.set(a.responseId, e);
    }

    summaries.push({
      id: c.id,
      name: c.name,
      instrumentLabel: instrumentDisplay(c.instrumentId).label,
      responded: respondedUsers.size,
      total: enrollments.length,
      careCount: byResponse.size,
      code: c.code,
    });

    for (const [responseId, e] of byResponse) {
      careMembers.push({ id: responseId, name: nameFor(responseId), status: 'care', note: `${e.reasons.join(' · ')} · ${c.name}` });
    }
  }

  return <ConsoleHome coachName={me.name ?? me.email} careMembers={careMembers} cohorts={summaries} />;
}
