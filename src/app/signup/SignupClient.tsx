'use client';
// 회원가입 오케스트레이션 — supabase.auth.signUp(트리거가 public.users role='user' 생성).
// loginheaven 이메일은 트리거가 admin 자동(기존). 비밀번호·토큰을 로그·URL에 싣지 않는다.
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/core/supabase/client';
import { SignupForm } from './SignupForm';
import { signupOutcome } from './signupOutcome';

export function SignupClient() {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit() {
    if (!email || !password || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await supabase.auth.signUp({
      email,
      password,
      options: { data: name ? { name } : {} },
    });
    const outcome = signupOutcome({ error: res.error, hasSession: !!res.data.session });
    setBusy(false);
    if (outcome.error) {
      setError(outcome.error);
      return;
    }
    if (outcome.notice) {
      setNotice(outcome.notice);
      return;
    }
    if (outcome.redirect) router.push(outcome.redirect);
  }

  return (
    <SignupForm
      email={email}
      password={password}
      name={name}
      show={show}
      busy={busy}
      error={error}
      notice={notice}
      onEmail={setEmail}
      onPassword={setPassword}
      onName={setName}
      onToggleShow={() => setShow((s) => !s)}
      onSubmit={onSubmit}
    />
  );
}
