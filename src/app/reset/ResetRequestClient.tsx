'use client';
// 재설정 요청 오케스트레이션 — resetPasswordForEmail. enumeration 방지: 결과(성공/실패/존재여부) 무관 동일 안내.
// redirectTo 는 origin 기반 고정 경로(오픈 리다이렉트 방지 — 사용자 입력으로 만들지 않는다).
import { useMemo, useState } from 'react';
import { createBrowserSupabase } from '@/core/supabase/client';
import { ResetRequestForm } from './ResetRequestForm';

const UNIFORM_NOTICE = '입력하신 주소로 메일을 보냈어요. 받은 링크로 비밀번호를 다시 설정해 주세요.';

export function ResetRequestClient() {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit() {
    if (!email || busy) return;
    setBusy(true);
    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset/confirm`,
      });
    } catch {
      // 결과를 화면에 가르지 않는다 — 항상 동일 안내(enumeration 방지).
    }
    setBusy(false);
    setNotice(UNIFORM_NOTICE);
  }

  return <ResetRequestForm email={email} busy={busy} notice={notice} onEmail={setEmail} onSubmit={onSubmit} />;
}
