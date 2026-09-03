// 회차 갈무리 카드 미리보기(ADR-92) — 인도자 콘솔. 게이트는 회차 현황 화면과 **동일**하다.
//   운영자 전용으로 좁히지 않는다: 실제로 필요한 사람은 인도자다. 클로징 스크립트를 짜려면
//   카드가 무엇을 묻는지 알아야 하고, 회차 일정을 정하는 것도 인도자다.
//   노출도 늘지 않는다 — 코치는 이미 그 회기 참여자의 답 전체를 본다(ADR-86). 문항 문안은 그보다 덜 민감하다.
//
//   보호 라우트에 둔다. /preview 계열은 스스로 '운영 라우트 아님'이라 선언한 자리이고 인증이 없어,
//   공식 UI 가 링크하면 미확정 회차 문안이 링크만으로 열린다(ADR-89 '미확정 참조는 넣지 않는다'와 같은 계열).
import { redirect } from 'next/navigation';
import { requestUser } from '@/app/_lib/requestScope';
import { CheckinPreviewClient } from './CheckinPreviewClient';
import { ConsoleTitle } from '@/app/_screens/console/ConsoleTitle';

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

  // ★ **한 렌더에 한 번만 묻는다**(ADR-178 · U-6 이 콘솔로 넓혔다) — 껍데기가 이미 물은 것을 다시 묻지 않는다.
  const me = await requestUser();
  if (!me) redirect('/login');
  if (me.role === 'user') redirect('/home');

  return (
    <div className="console-body">
      {/* ★ **이 화면은 이름이 어디에도 없었다**(U-6 실측) — 탭에도 본문에도 없었다.
          띠는 최장일치로 「회차 갈무리」를 켠 채 두어 사용자가 자기 위치를 오해했다. */}
      <ConsoleTitle />
      <CheckinPreviewClient cohortId={cohortId} initialSession={initialSession} />
    </div>
  );
}
