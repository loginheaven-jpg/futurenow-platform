// 운영자 본부 레이아웃 — 사이드바 셸(3차 T-4).
//   역할만 읽어 셸에 넘긴다. 미인증이면 셸 없이 통과시킨다 — 차단은 페이지·미들웨어가 한다.
import { createServerContext } from '@/core/supabase/server';
import { ChromeProvider } from '@/app/_screens/shell/chromeContext';
import { ConsoleShell } from '@/app/_screens/console/ConsoleShell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await (await createServerContext()).currentUser().catch(() => null);
  if (!me) return <>{children}</>;
  return (
    <ChromeProvider>
      <ConsoleShell role={me.role}>{children}</ConsoleShell>
    </ChromeProvider>
  );
}
