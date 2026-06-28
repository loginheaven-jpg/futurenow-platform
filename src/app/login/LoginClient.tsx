'use client';
// 인도자 로그인 오케스트레이션 — supabase.auth.signInWithPassword → 역할별 리다이렉트.
// 로그인 전용(가입은 /join). 비밀번호·토큰을 로그·URL에 싣지 않는다. 폼은 LoginForm(프레젠테이션).
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCoreContext } from '@/core/context';
import { createBrowserSupabase } from '@/core/supabase/client';
import { LoginForm } from './LoginForm';
import { loginOutcome } from './loginOutcome';

export function LoginClient() {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const ctx = useMemo(() => createCoreContext(supabase), [supabase]);
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    if (!email || !password || busy) return;
    setBusy(true);
    setError(null);
    const res = await supabase.auth.signInWithPassword({ email, password });
    const role = res.error || !res.data.session ? null : (await ctx.currentUser())?.role ?? null;
    const outcome = loginOutcome({ error: res.error, hasSession: !!res.data.session, role });
    setBusy(false);
    if (outcome.error) {
      setError(outcome.error); // 원시 에러(자격 정보 누출 가능)는 싣지 않는다
      return;
    }
    if (outcome.redirect) router.push(outcome.redirect);
  }

  return (
    <LoginForm
      email={email}
      password={password}
      show={show}
      busy={busy}
      error={error}
      onEmail={setEmail}
      onPassword={setPassword}
      onToggleShow={() => setShow((s) => !s)}
      onSubmit={onSubmit}
    />
  );
}
