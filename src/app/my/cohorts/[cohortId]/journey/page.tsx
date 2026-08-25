// 화면 C — 참여자 세로 보기(ADR-118). `/my/cohorts/[cohortId]/journey`.
//
// **7주 내내 열어 둔다.** 갈무리 카드는 회차 창이 닫히면 열람만 되지만, 자기 점검은 언제나 되어야 한다.
// 게이트는 차수 홈과 같다 — 내 차수 목록에 없으면 돌려보낸다(타인 차수 접근 차단).
//   데이터 접근은 그 뒤에 온다(게이트-데이터 순서 · CLAUDE §9).
//
// 조회가 회차별인 이유: `listCohortCheckins` 는 담당 인도자·운영자 RLS 다. 참여자는 `getMyCheckin` 으로만 읽는다.
//   회차 수만큼 부르되 `Promise.all` 로 묶는다 — 직렬이면 응답 시간이 그만큼 는다.
import { redirect } from 'next/navigation';
import { AppHeader } from '@/app/_screens/AppHeader';
import { HeaderActions } from '@/app/_screens/HeaderActions';
import { createServerContext } from '@/core/supabase/server';
import { ReportPrintButton } from '@/app/coach/cohort/[cohortId]/report/[responseId]/ReportPrintButton';
import { ReportPrintHeader } from '@/app/coach/cohort/[cohortId]/report/[responseId]/ReportPrintHeader';
import { MyJourney } from './MyJourney';

export const dynamic = 'force-dynamic';

export default async function MyJourneyPage({ params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;
  const ctx = await createServerContext();
  const me = await ctx.currentUser();
  if (!me) redirect('/login');

  const mine = await ctx.listMyCohorts();
  const c = mine.find((x) => x.cohortId === cohortId);
  if (!c) redirect('/my/cohorts');

  const sessions = await ctx.listCohortSessions(cohortId);
  const rows = (
    await Promise.all(sessions.map((s) => ctx.getMyCheckin(cohortId, s.sessionNo).catch(() => null)))
  ).filter((r): r is NonNullable<typeof r> => r !== null);

  // 사진은 행이 있는 회차만.
  const photoPairs = await Promise.all(
    rows.map(async (r) => [r.sessionNo, await ctx.listCheckinPhotos(cohortId, r.sessionNo, me.id).catch(() => [])] as const),
  );

  const now = new Date();
  const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;

  return (
    <div className="journey-print-root" style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <div className="no-print">
        <AppHeader variant="sub" title="나의 기록" backHref={`/my/cohorts/${cohortId}`} homeHref="/home" action={<HeaderActions />} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
          <ReportPrintButton />
        </div>
      </div>
      <ReportPrintHeader
        title="나의 기록"
        participantName={me.name ?? ''}
        cohortName={c.name ?? ''}
        waveLabel="회차 갈무리"
        dateStr={dateStr}
      />
      <MyJourney
        cohortId={cohortId}
        cohortName={c.name ?? ''}
        sessions={sessions}
        rows={rows}
        photos={Object.fromEntries(photoPairs)}
        reportHref={`/my/cohorts/${cohortId}/report`}
        nowIso={now.toISOString()}
      />
    </div>
  );
}
