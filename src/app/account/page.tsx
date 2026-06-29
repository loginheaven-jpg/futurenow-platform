// 내 정보(/account, Step 2.5) — 세 페르소나 공통 계정 관리. 서버 게이트(미인증→/login) + force-dynamic.
// 이름(users.name)·전화(user_contacts)·비밀번호(auth.users) 수정. role 쓰기 경로 없음(2.S2 봉쇄).
import { redirect } from 'next/navigation';
import { AppHeader } from '@/app/_screens/AppHeader';
import { MemberHeaderActions } from '@/app/_screens/MemberHeaderActions';
import { createCoreContext } from '@/core/context';
import { createServerSupabase } from '@/core/supabase/server';
import { AccountClient } from './AccountClient';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const ctx = createCoreContext(await createServerSupabase());
  const me = await ctx.currentUser();
  if (!me) redirect('/login');

  const phone = await ctx.getPhone(me.id).catch(() => null); // 본인 — assertContactAccess 통과
  const backHref = me.role === 'user' ? '/home' : '/coach';

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <AppHeader title="내 정보" action={<MemberHeaderActions />} />
      <a
        href={backHref}
        className="t-caption"
        style={{ color: 'var(--color-text-secondary)', display: 'inline-block', marginBottom: 'var(--space-4)' }}
      >
        ← 뒤로
      </a>
      <AccountClient initialName={me.name ?? ''} initialPhone={phone ?? ''} />
    </div>
  );
}
