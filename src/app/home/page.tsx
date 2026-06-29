// 멤버 홈(/home, Step 1.1) — 멤버(role='user') 랜딩. 서버 컴포넌트(세션 의존 → force-dynamic).
// 게이트: 미인증 → /login · 코치·운영자 → /coach(자기 콘솔). 멤버만 본문 렌더.
// 셸 헤더(AppHeader) + 로그아웃(LogoutButton) + MemberHome(인사·참여·내 차수 자리). 계약·DB 무변경.
import { redirect } from 'next/navigation';
import { AppHeader } from '@/app/_screens/AppHeader';
import { HeaderActions } from '@/app/_screens/HeaderActions';
import { MemberHome } from '@/app/_screens/MemberHome';
import { createCoreContext } from '@/core/context';
import { createServerSupabase } from '@/core/supabase/server';

export const dynamic = 'force-dynamic';

export default async function MemberHomePage() {
  const ctx = createCoreContext(await createServerSupabase());
  const me = await ctx.currentUser();
  if (!me) redirect('/login');
  if (me.role !== 'user') redirect('/coach'); // 코치·운영자는 콘솔로

  const greetingName = me.name?.trim() || me.email.split('@')[0] || '회원';

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <AppHeader title="퓨처나우" subtitle="내 자리" action={<HeaderActions />} />
      <MemberHome greetingName={greetingName} />
    </div>
  );
}
