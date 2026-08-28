// 회차 갈무리 카드 미리보기(ADR-92) — 인도자 콘솔. 게이트는 회차 현황 화면과 **동일**하다.
//   운영자 전용으로 좁히지 않는다: 실제로 필요한 사람은 인도자다. 클로징 스크립트를 짜려면
//   카드가 무엇을 묻는지 알아야 하고, 회차 일정을 정하는 것도 인도자다.
//   노출도 늘지 않는다 — 코치는 이미 그 차수 참여자의 답 전체를 본다(ADR-86). 문항 문안은 그보다 덜 민감하다.
//
//   보호 라우트에 둔다. /preview 계열은 스스로 '운영 라우트 아님'이라 선언한 자리이고 인증이 없어,
//   공식 UI 가 링크하면 미확정 회차 문안이 링크만으로 열린다(ADR-89 '미확정 참조는 넣지 않는다'와 같은 계열).
import { redirect } from 'next/navigation';
import { createServerContext } from '@/core/supabase/server';
import { CheckinPreviewClient } from './CheckinPreviewClient';

export const dynamic = 'force-dynamic';

export default async function CheckinPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ cohortId: string }>;
  searchParams: Promise<{ session?: string | string[] }>;
}) {
  const { cohortId } = await params;
  const sp = await searchParams;
  const raw = Array.isArray(sp.session) ? sp.session[0] : sp.session;
  const initialSession = Number.isFinite(Number(raw)) ? Number(raw) : 1;

  const ctx = await createServerContext();
  const me = await ctx.currentUser();
  if (!me) redirect('/login');
  if (me.role === 'user') redirect('/home');

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      {/* **헤더는 껍데기가 그린다**(U-3 · §12.3 규칙 1). 제목·뒤로는 `_lib/screenChrome` 표가 든다. */}
      <CheckinPreviewClient cohortId={cohortId} initialSession={initialSession} />
    </div>
  );
}
