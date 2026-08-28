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
  // KPC 는 코치·운영자(set_my_coach_kpc RPC 가 coach|admin 게이트 — 2026-07-09). 멤버(user)는 조회·섹션 생략.
  const canKpc = me.role === 'coach' || me.role === 'admin';
  const kpc = canKpc ? await ctx.getMyCoachKpc().catch(() => null) : null;
  // 5차 T-4 — **값만** 읽어 내린다. 문자열 조립은 화면이 한다(최박사 지시).
  //   실패하면 구획을 통째로 안 그린다 — 등급이 안 보이는 것과 내 정보가 안 열리는 것은
  //   심각도가 전혀 다르다(피드 사진 서명 실패와 같은 계열).
  const membership = await ctx.getMyMembershipView().catch(() => undefined);
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
        allowKpc={canKpc}
        membership={membership}
      />
    </div>
  );
}
