// 코치 콘솔(실데이터) — §8.1. 서버 컴포넌트. 사용자 세션 의존이라 동적 렌더.
// 집계 출처(전부 계약 메서드, RLS 게이트):
//   회기 목록 = listCohortsByCoach(me.id)   먼저 챙길 분 = listAlerts(care/red_flag) — **저장된 출처**(재채점 금지)
//   응답/총원 = listResponses · listEnrollments
//   멤버 이름 = listCohortMembers(cohort_member_directory RPC, 코치/운영자 id+name만 — ADR-24). plan Q6 해소.
// 먼저 챙길 분 이름 경로: alert.responseId → response.userId → member.name. name null 이면 '참여자' 폴백.
import { redirect } from 'next/navigation';
import { CoachInfoGate } from './CoachInfoGate';
import { ConsoleHomeClient } from './ConsoleHomeClient';
import { ConsoleTitle } from '@/app/_screens/console/ConsoleTitle';
import { buildCohortRoster } from './rosterModel';
import { instrumentDisplay, type CohortSummary, type RosterMember } from '@/app/_screens/types';
import { requestContext, requestUser } from '@/app/_lib/requestScope';
import { CONSENT_VERSION } from '@/app/_consent/consent';

export const dynamic = 'force-dynamic';

export default async function CoachConsolePage() {
  // ★ **한 렌더에 한 번만 묻는다**(ADR-178 · U-6 이 콘솔로 넓혔다) — 껍데기가 이미 물은 것을 다시 묻지 않는다.
  const ctx = await requestContext();
  const me = await requestUser();

  if (!me) redirect('/login');
  if (me.role === 'user') redirect('/home'); // 코치/운영자 전용 — 멤버는 자기 집으로

  // 코치 정보 게이트(S4): 코치가 전화·KPC·개인정보 보호 서약(ADR-76) 미완이면 콘솔 대신 보완 화면. 운영자(admin)는 면제.
  // 강등 아님 — role=coach 유지. 완비 판정을 이 한 곳에 집중(loginOutcome 무변경).
  if (me.role === 'coach') {
    const [phone, kpc, consents] = await Promise.all([
      ctx.getPhone(me.id).catch(() => null),
      ctx.getMyCoachKpc().catch(() => null),
      ctx.listMyConsents().catch(() => []),
    ]);
    const pledged = consents.some((c) => c.type === 'coach_pledge' && c.version === CONSENT_VERSION);
    if (!phone || !kpc || !pledged) {
      return <CoachInfoGate userId={me.id} initialPhone={phone ?? ''} initialKpc={kpc ?? ''} needPledge={!pledged} />;
    }
  }

  // 운영자(수퍼바이저)는 모든 인도자 회기를 본다(ADR-74). 인도자는 본인 소유만. RLS 가 이중으로 강제.
  const isAdmin = me.role === 'admin';
  const cohorts = isAdmin ? await ctx.listAllCohorts() : await ctx.listCohortsByCoach(me.id);
  // 운영자 뷰: 각 회기 소유 인도자 이름(누구의 회기인지). listUsers(운영자 전체) 1회 조회 → id→name 맵.
  const coachNameById = new Map<string, string | null>();
  if (isAdmin) {
    const users = await ctx.listUsers().catch(() => []);
    for (const u of users) coachNameById.set(u.id, u.name);
  }

  // 회기 간 순차 왕복(구 1+4N wall-clock)을 병렬로 접는다(C-3·ADR-61). 회기 내 4쿼리는 이미 Promise.all.
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
        coachName: isAdmin ? (coachNameById.get(c.coachId) ?? null) : undefined,
        instrumentLabel: instrumentDisplay(c.instrumentId).label,
        responded,
        total: responded + waiting,
        careCount,
        code: c.code,
      };

      // 먼저 챙길 분(회기별). id=`${cohortId}__${responseId}` — 리포트 진입에 cohortId 필요.
      const care: RosterMember[] = roster
        .filter((m) => m.status === 'care')
        .map((m) => ({ id: `${c.id}__${m.id}`, userId: m.userId, name: m.name, status: 'care', note: `${m.note ?? ''} · ${c.name}` }));

      return { summary, care };
    }),
  );

  const summaries: CohortSummary[] = perCohort.map((r) => r.summary);
  const careMembers: RosterMember[] = perCohort.flatMap((r) => r.care); // 전 회기 합산(회기 순서 보존)

  // 운영자 승인 대기 배너: admin 은 로그인 시 /home 착지(loginOutcome 전원 /home)이나 콘솔 진입 시에도 pending 을 알리도록 배너 유지(홈 '본부' 카드 건수와 병행).
  const pendingCoachApps = isAdmin ? (await ctx.listCoachApplications('pending').catch(() => [])).length : 0;

  // ★ **본문 폭과 화면 이름은 라우트가 든다**(U-6). 표현 부품 안에 두면 그 부품이
  //   라우팅에 매여 단독 렌더가 안 되고, 폭이 부품마다 흩어진다.
  return (
    <div className="console-body">
      <ConsoleTitle />
      <ConsoleHomeClient
        coachName={me.name ?? me.email}
        careMembers={careMembers}
        cohorts={summaries}
        isAdmin={isAdmin}
        pendingCoachApps={pendingCoachApps}
      />
    </div>
  );
}
