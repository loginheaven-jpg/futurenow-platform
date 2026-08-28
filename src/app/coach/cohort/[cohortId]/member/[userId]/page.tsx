// 화면 A — 인도자 세로 보기(ADR-118). 한 사람의 전 회차를 한 화면에 세운다.
//
// 왜 필요한가: 지금 인도자가 한 사람의 5주를 보려면 회차 현황에서 탭을 다섯 번 눌러야 하고,
//   **두 회차를 나란히 놓고 대조하는 순간이 0이다.** 종단 축을 설계해 놓고 그 축을 볼 화면이 없었다.
//
// 게이트는 회차 현황(`../checkin/page.tsx`)과 같다 — 코치/운영자 전용, 멤버는 자기 집으로.
//   데이터 접근은 그 뒤에 온다(게이트-데이터 순서 · CLAUDE §9).
import { redirect } from 'next/navigation';
import { createServerContext } from '@/core/supabase/server';
import { ReportPrintButton } from '@/app/coach/cohort/[cohortId]/report/[responseId]/ReportPrintButton';
import { ReportPrintHeader } from '@/app/coach/cohort/[cohortId]/report/[responseId]/ReportPrintHeader';
import { MemberJourney } from './MemberJourney';

export const dynamic = 'force-dynamic';

export default async function CoachMemberJourneyPage({ params }: { params: Promise<{ cohortId: string; userId: string }> }) {
  const { cohortId, userId } = await params;
  const ctx = await createServerContext();
  const me = await ctx.currentUser();
  if (!me) redirect('/login');
  if (me.role === 'user') redirect('/home'); // 코치/운영자 전용 — 멤버는 자기 집으로

  // 명단은 **참여자만**(ADR-118) — 이 화면은 코칭 대상 화면이다.
  //   그 명단에 없는 userId 면 조회하지 않고 돌려보낸다(타 차수·비참여자 접근 차단).
  const [sessions, members, cohort] = await Promise.all([
    ctx.listCohortSessions(cohortId),
    ctx.listCohortMembers(cohortId, true),
    ctx.getCohort(cohortId).catch(() => null),
  ]);
  const member = members.find((m) => m.userId === userId) ?? null;
  if (!member) redirect(`/coach/cohort/${cohortId}/checkin`);

  // 회차 전체를 **한 번에** 읽는다(ADR-118 계약 확장) — 회차 수만큼 왕복하지 않는다.
  const all = await ctx.listCohortCheckins(cohortId);
  const rows = all.filter((r) => r.userId === userId);

  // 사진은 회차별 RPC 라 있는 회차만 병렬로 부른다(없는 회차를 부를 이유가 없다).
  const withRows = rows.map((r) => r.sessionNo).sort((a, b) => a - b);
  const photoPairs = await Promise.all(
    withRows.map(async (no) => [no, await ctx.listCheckinPhotos(cohortId, no, userId).catch(() => [])] as const),
  );

  // 사전 체크 리포트 왕복(§5-1 ①) — 두 문서가 서로를 알되 섞이지 않는다. 없으면 버튼을 그리지 않는다.
  const responses = await ctx
    .listResponses({ instrumentId: 'futurenow', cohortId, userId, wave: 'pre' })
    .catch(() => []);
  const reportId = responses[0]?.id ?? null;

  const now = new Date();
  const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;

  return (
    <div className="journey-print-root" style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      {/* 앱 크롬 — 화면 전용. PDF 본문에는 브랜드 문서 헤더가 대신 온다(리포트와 같은 선례). */}
      <div className="no-print">
      {/* **헤더는 껍데기가 그린다**(U-3 · §12.3 규칙 1). 제목·뒤로는 `_lib/screenChrome` 표가 든다. */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
          <ReportPrintButton />
        </div>
      </div>
      <ReportPrintHeader
        title="갈무리 기록"
        participantName={member.name ?? '이름 미입력'}
        cohortName={cohort?.name ?? ''}
        waveLabel="인도자 전용"
        dateStr={dateStr}
      />
      <MemberJourney
        cohortId={cohortId}
        userId={userId}
        name={member.name ?? '이름 미입력'}
        cohortName={cohort?.name ?? ''}
        sessions={sessions}
        rows={rows}
        photos={Object.fromEntries(photoPairs)}
        reportId={reportId}
        nowIso={now.toISOString()}
      />
    </div>
  );
}
