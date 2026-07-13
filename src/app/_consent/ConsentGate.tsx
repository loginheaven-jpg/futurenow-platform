'use client';
// 개인정보 동의 소급 게이트(ADR-76) — 미동의(또는 구버전) 사용자가 /home 진입 시 표시. 동의 기록 후 refresh 로 통과.
//   필수(privacy_use) 미체크 시 진행 불가. 민감(sensitive_use)은 선택. 동의를 원치 않으면 로그아웃(헤더).
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCoreContext } from '@/core/context';
import { createBrowserSupabase } from '@/core/supabase/client';
import { Button } from '@/core/ui';
import { AppHeader } from '@/app/_screens/AppHeader';
import { HeaderActions } from '@/app/_screens/HeaderActions';
import { ConsentBlock } from './ConsentBlock';
import { PRIVACY_CONSENT, SENSITIVE_CONSENT, CONSENT_VERSION } from './consent';

export function ConsentGate() {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const ctx = useMemo(() => createCoreContext(supabase), [supabase]);
  const router = useRouter();
  const [privacy, setPrivacy] = useState(false);
  const [sensitive, setSensitive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!privacy || busy) return;
    setBusy(true);
    setError(null);
    try {
      await ctx.recordConsent('privacy_use', CONSENT_VERSION);
      if (sensitive) await ctx.recordConsent('sensitive_use', CONSENT_VERSION);
      router.refresh();
    } catch {
      setError('저장에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <AppHeader variant="root" title="개인정보 동의" subtitle="계속하려면 확인해 주세요" homeHref="/home" action={<HeaderActions homeHref="/home" />} />
      <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-5)' }}>
        서비스 이용을 위해 개인정보 수집·이용 동의가 필요해요. 동의하지 않으시려면 로그아웃해 주세요.
      </p>
      {error ? <p className="t-caption" style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>{error}</p> : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <ConsentBlock text={PRIVACY_CONSENT} checked={privacy} onChange={setPrivacy} />
        <ConsentBlock text={SENSITIVE_CONSENT} checked={sensitive} onChange={setSensitive} />
      </div>
      <Button onClick={submit} disabled={!privacy || busy} style={{ width: '100%', marginTop: 'var(--space-5)' }}>
        {busy ? '저장 중…' : '동의하고 계속'}
      </Button>
    </div>
  );
}
