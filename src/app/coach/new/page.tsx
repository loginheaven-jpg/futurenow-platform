// 회기 개설 라우트(§8.2) — 코치/운영자 전용. 사용자 세션 의존이라 동적 렌더.
import { redirect } from 'next/navigation';
import { requestUser } from '@/app/_lib/requestScope';
import { NewCohortClient } from './NewCohortClient';
import { ConsoleTitle } from '@/app/_screens/console/ConsoleTitle';

export const dynamic = 'force-dynamic';

export default async function NewCohortPage() {
  // ★ **한 렌더에 한 번만 묻는다**(ADR-178 · U-6 이 콘솔로 넓혔다) — 껍데기가 이미 물은 것을 다시 묻지 않는다.
  const me = await requestUser();
  if (!me) redirect('/login');
  if (me.role === 'user') redirect('/home'); // 코치/운영자 전용 — 멤버는 자기 집으로

  return (
    <div className="console-body">
      <ConsoleTitle />
      <NewCohortClient />
    </div>
  );
}
