'use client';
// 새 비밀번호 설정 오케스트레이션 — 복구 세션 게이트 + updateUser.
// 재설정 링크 진입 시 @supabase/ssr 가 URL 코드를 세션으로 교환(detectSessionInUrl). 그 세션이 있을 때만 변경 허용.
// 성공 시 복구 세션이 정규 세션이 됨 → 역할별 랜딩. raw 에러는 화면에 노출하지 않고 정제 메시지로 갈음.
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/core/supabase/client';
import { loginOutcome } from '@/app/login/loginOutcome';
import { ResetConfirmForm, type ResetPhase } from './ResetConfirmForm';

export function ResetConfirmClient() {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const router = useRouter();

  const [phase, setPhase] = useState<ResetPhase>('checking');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    // 복구 세션 확인. 코드 교환이 늦게 끝날 수 있어 onAuthStateChange 로도 ready 승격.
    supabase.auth.getSession().then(({ data }) => {
      if (active) setPhase(data.session ? 'ready' : 'expired');
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session) setPhase((p) => (p === 'done' ? p : 'ready'));
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  async function onSubmit() {
    if (pw1.length < 6) {
      setError('비밀번호는 6자 이상이어야 해요.');
      return;
    }
    if (pw1 !== pw2) {
      setError('두 비밀번호가 일치하지 않아요.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.auth.updateUser({ password: pw1 });
    setBusy(false);
    if (e) {
      // raw 원문 비노출 — 정제 메시지.
      setError('비밀번호를 바꾸지 못했어요. 링크가 만료됐을 수 있어요. 다시 요청해 주세요.');
      return;
    }
    setPhase('done');
  }

  async function onContinue() {
    router.push(loginOutcome({ error: null, hasSession: true }).redirect ?? '/home');
  }

  return (
    <ResetConfirmForm
      phase={phase}
      pw1={pw1}
      pw2={pw2}
      busy={busy}
      error={error}
      onPw1={setPw1}
      onPw2={setPw2}
      onSubmit={onSubmit}
      onContinue={onContinue}
    />
  );
}
