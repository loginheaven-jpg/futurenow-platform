// 코치 콘솔(실데이터) — §8.1. 서버 컴포넌트. 사용자 세션 의존이라 동적 렌더.
// 집계 출처(전부 계약 메서드, RLS 게이트):
//   차수 목록 = listCohortsByCoach(me.id)   먼저 챙길 분 = listAlerts(care/red_flag) — **저장된 출처**(재채점 금지)
//   응답/총원 = listResponses · listEnrollments
//   멤버 이름 = listCohortMembers(cohort_member_directory RPC, 코치/운영자 id+name만 — ADR-24). plan Q6 해소.
// 먼저 챙길 분 이름 경로: alert.responseId → response.userId → member.name. name null 이면 '참여자' 폴백.
import { redirect } from 'next/navigation';
import { CoachInfoGate } from './CoachInfoGate';
import { ConsoleHomeClient } from './ConsoleHomeClient';
import { buildCohortRoster } from './rosterModel';
import { instrumentDisplay, type CohortSummary, type RosterMember } from '@/app/_screens/types';
import { createServerContext } from '@/core/supabase/server';

export const dynamic = 'force-dynamic';

export default async function CoachConsolePage() {
  const ctx = await createServerContext();
  const me = await ctx.currentUser();

  if (!me) redirect('/login');
  if (me.role === 'user') redirect('/home'); // 코치/운영자 전용 — 멤버는 자기 집으로

  // 코치 정보 게이트(S4): 코치가 전화·KPC 미완이면 콘솔 대신 보완 화면. 운영자(admin)는 면제(정보 요건 없음).
  // 강등 아님 — role=coach 유지. 완비 판정을 이 한 곳에 집중(loginOutcome 무변경).
  if (me.role === 'coach') {
    const [phone, kpc] = await Promise.all([ctx.getPhone(me.id).catch(() => null), ctx.getMyCoachKpc().catch(() => null)]);
    if (!phone || !kpc) {
      return <CoachInfoGate userId={me.id} initialPhone={phone ?? ''} initialKpc={kpc ?? ''} />;
    }
  }

  const cohorts = await ctx.listCohortsByCoach(me.id);

  // 차수 간 순차 왕복(구 1+4N wall-clock)을 병렬로 접는다(C-3·ADR-61). 차수 내 4쿼리는 이미 Promise.all.
  // map 결과 배열은 입력(cohorts) 순서를 보존 → summaries·careMembers 순서 불변. 예외는 for 루프와 동일하게 전파(첫 reject → 페이지 error, 조용한 삼킴 없음).
  const perCohort = await Promise.all(
    cohorts.map(async (c) => {
      const [enrollments, responses, alerts, members] = await Promise.all([
        ctx.listEnrollments(c.id),
        ctx.listResponses({ instrumentId: c.instrumentId, cohortId: c.id }),
        ctx.listAlerts(c.id),
        ctx.listCohortMembers(c.id),
      ]);

      const { roster, responded, waiting, careCount } = buildCohortRoster({ enrollments, responses, alerts, members });

      const summary: CohortSummary = {
        id: c.id,
        name: c.name,
        instrumentLabel: instrumentDisplay(c.instrumentId).label,
        responded,
        total: responded + waiting,
        careCount,
        code: c.code,
      };

      // 먼저 챙길 분(차수별). id=`${cohortId}__${responseId}` — 리포트 진입에 cohortId 필요.
      const care: RosterMember[] = roster
        .filter((m) => m.status === 'care')
        .map((m) => ({ id: `${c.id}__${m.id}`, name: m.name, status: 'care', note: `${m.note ?? ''} · ${c.name}` }));

      return { summary, care };
    }),
  );

  const summaries: CohortSummary[] = perCohort.map((r) => r.summary);
  const careMembers: RosterMember[] = perCohort.flatMap((r) => r.care); // 전 차수 합산(차수 순서 보존)

  // 운영자 승인 대기 배너: admin 은 로그인 시 /home 착지(loginOutcome 전원 /home)이나 콘솔 진입 시에도 pending 을 알리도록 배너 유지(홈 '본부' 카드 건수와 병행).
  const isAdmin = me.role === 'admin';
  const pendingCoachApps = isAdmin ? (await ctx.listCoachApplications('pending').catch(() => [])).length : 0;

  return (
    <ConsoleHomeClient
      coachName={me.name ?? me.email}
      careMembers={careMembers}
      cohorts={summaries}
      isAdmin={isAdmin}
      pendingCoachApps={pendingCoachApps}
    />
  );
}
