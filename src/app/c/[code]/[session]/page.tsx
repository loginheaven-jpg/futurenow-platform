// QR 짧은 경로(ADR-80 · UI 지시서 Phase 5). 현장 클로징에 열 명이 동시 진입 — UUID 경로는 구두 안내 불가.
//   흐름: 코드→회기 해석 → 미인증 /login?returnTo → 비멤버 안내(정지) → 멤버 /my/cohorts/{id}/checkin/{session}.
//   ADR-89: 비멤버를 /join 으로 보내던 것을 안내로 바꿨다(목적지-의도 불일치 + 링크 유출 시 무단 자기등록 차단).
//   returnTo 는 화이트리스트(safeReturnTo)만 — 여기서 만드는 경로는 그 화이트리스트에 부합한다.
import Link from 'next/link';
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
        <Link className="ui-btn ui-btn--ghost" href="/home" style={{ textDecoration: 'none', marginTop: 'var(--space-4)', display: 'inline-block' }}>홈으로</Link>
      </div>
    );
  }

  const mine = await ctx.listMyCohorts();
  const isMember = mine.some((c) => c.cohortId === cohort.id);
  // 비멤버는 담담한 안내로 멈춘다(ADR-89 — ADR-81 개정).
  //   이 링크의 목적지는 '그 회차 갈무리'다. 가입자 러너(/join?cohort=)로 보내면 갈무리를 쓰러 온 사람 앞에
  //   사전진단이 열려 목적지와 의도가 어긋난다. 그리고 링크만 있으면 누구나 실명제 회기에 자기등록하게 된다
  //   — 갈무리 링크는 카톡으로 옮겨 다니므로 그 표면을 열어 둘 이유가 없다.
  //   늦게 합류하는 참여자는 인도자가 등록하거나 기존 코드 참여 경로(/join)를 쓴다.
  if (!isMember) {
    return (
      <div style={{ maxWidth: 420, margin: '0 auto', padding: 'var(--space-8) var(--space-4)', textAlign: 'center' }}>
        <p className="t-body" style={{ color: 'var(--color-text)', margin: 0 }}>{cohort.name} 참여자 명단에 없어요.</p>
        <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: 'var(--space-2) 0 0' }}>
          인도자에게 문의해 주세요.
        </p>
        <Link className="ui-btn ui-btn--ghost" href="/home" style={{ textDecoration: 'none', marginTop: 'var(--space-4)', display: 'inline-block' }}>홈으로</Link>
      </div>
    );
  }

  redirect(`/my/cohorts/${cohort.id}/checkin/${session}`);
}
