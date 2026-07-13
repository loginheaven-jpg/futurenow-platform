// 내 정보(/account, Step 2.5) — 세 페르소나 공통 계정 관리. 서버 게이트(미인증→/login) + force-dynamic.
// 이름(users.name)·전화(user_contacts)·비밀번호(auth.users) 수정. role 쓰기 경로 없음(2.S2 봉쇄).
import { redirect } from 'next/navigation';
import { AppHeader } from '@/app/_screens/AppHeader';
import { HeaderActions } from '@/app/_screens/HeaderActions';
import { createServerContext } from '@/core/supabase/server';
import { AccountClient } from './AccountClient';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const ctx = await createServerContext();
  const me = await ctx.currentUser();
  if (!me) redirect('/login');

  const contact = await ctx.getContactDetail(me.id).catch(() => null); // 본인 — 전화·주소·계좌(assertContactAccess 통과)
  const profile = await ctx.getProfile(me.id).catch(() => null); // 본인 프로필(RLS 본인/운영자). 없으면 null → 빈 폼
  // KPC 는 코치만(set_my_coach_kpc RPC 가 role=coach 게이트). 비코치는 조회·섹션 생략.
  const kpc = me.role === 'coach' ? await ctx.getMyCoachKpc().catch(() => null) : null;
  // 홈 복귀 = 통합 홈 /home(A′-2 — 역할 무관 단일 홈. 콘솔·본부는 홈의 운영 카드로 진입).
  const homeHref = '/home';

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <AppHeader variant="root" title="내 정보" homeHref={homeHref} action={<HeaderActions homeHref={homeHref} />} />
      <AccountClient
        initialName={me.name ?? ''}
        initialPhone={contact?.phone ?? ''}
        initialAddress={contact?.address ?? ''}
        initialBankAccount={contact?.bankAccount ?? ''}
        initialProfile={profile}
        initialKpc={kpc ?? ''}
        allowKpc={me.role === 'coach'}
      />
    </div>
  );
}
