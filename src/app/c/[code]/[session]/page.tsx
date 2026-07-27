// QR 짧은 경로(ADR-80 · UI 지시서 Phase 5). 현장 클로징에 열 명이 동시 진입 — UUID 경로는 구두 안내 불가.
//   흐름: 코드→차수 해석 → 미인증 /login?returnTo → 비멤버 /join → 멤버 /my/cohorts/{id}/checkin/{session}.
//   returnTo 는 화이트리스트(safeReturnTo)만 — 여기서 만드는 경로는 그 화이트리스트에 부합한다.
import { redirect } from 'next/navigation';
import { createServerContext } from '@/core/supabase/server';

export const dynamic = 'force-dynamic';

export default async function CheckinShortcutPage({ params }: { params: Promise<{ code: string; session: string }> }) {
  const { code, session } = await params;
  const self = `/c/${code}/${session}`;

  const ctx = await createServerContext();
  const me = await ctx.currentUser();
  if (!me) redirect(`/login?returnTo=${encodeURIComponent(self)}`);

  const cohort = await ctx.resolveCohortByCode(code).catch(() => null);
  if (!cohort) {
    // 코드 해석 실패 — 담담한 안내(홈에서 다시 시도).
    return (
      <div style={{ maxWidth: 420, margin: '0 auto', padding: 'var(--space-8) var(--space-4)', textAlign: 'center' }}>
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>코드를 찾을 수 없어요.</p>
        <a className="ui-btn ui-btn--ghost" href="/home" style={{ textDecoration: 'none', marginTop: 'var(--space-4)', display: 'inline-block' }}>홈으로</a>
      </div>
    );
  }

  const mine = await ctx.listMyCohorts();
  const isMember = mine.some((c) => c.cohortId === cohort.id);
  if (!isMember) redirect(`/join?cohort=${cohort.id}&returnTo=${encodeURIComponent(self)}`);

  redirect(`/my/cohorts/${cohort.id}/checkin/${session}`);
}
