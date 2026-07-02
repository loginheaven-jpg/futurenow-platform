// 통합 홈(/home) — 모든 로그인 사용자의 허브(A′-1 역할 감금 해제). 서버 컴포넌트(세션 의존 → force-dynamic).
// 게이트: 미인증 → /login 만. 역할 리다이렉트 제거(홈은 전원 개방 — 콘솔·본부는 자격 게이트가 별도로 방어).
//   코치·운영자에겐 MemberHome 이 '운영' 진입 카드(→/coach·/admin)를 노출. 데이터 접근은 RLS 불변(홈 개방=UX 이득).
// 셸 헤더(AppHeader) + 로그아웃(LogoutButton) + MemberHome(인사·운영 카드·참여·내 차수 자리). 계약·DB 무변경.
import { redirect } from 'next/navigation';
import { AppHeader } from '@/app/_screens/AppHeader';
import { HeaderActions } from '@/app/_screens/HeaderActions';
import { MemberHome } from '@/app/_screens/MemberHome';
import { createServerContext } from '@/core/supabase/server';

export const dynamic = 'force-dynamic';

export default async function MemberHomePage() {
  const ctx = await createServerContext();
  const me = await ctx.currentUser();
  if (!me) redirect('/login');

  const greetingName = me.name?.trim() || me.email.split('@')[0] || '회원';
  const cohorts = await ctx.listMyCohorts(); // my_cohorts DEFINER RPC(본인 차수+진행). 앱은 cohorts·responses 직접 select 안 함.
  // 운영자 로그인 알림(정합 마감): admin 은 /home 착지(loginOutcome 전원 /home)이므로 승인 대기 건수를 '본부' 카드에 노출(A3 배너를 홈에서도).
  const pendingCoachApps = me.role === 'admin' ? (await ctx.listCoachApplications('pending').catch(() => [])).length : 0;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <AppHeader variant="root" title="퓨처나우" subtitle="내 자리" homeHref="/home" action={<HeaderActions homeHref="/home" />} />
      <MemberHome greetingName={greetingName} cohorts={cohorts} role={me.role} pendingCoachApps={pendingCoachApps} />
    </div>
  );
}
