'use client';
// 코치 정보 보완 게이트(S4). role=coach 이나 전화·KPC 미완이면 /coach 가 콘솔 대신 이 화면을 렌더.
// 강등 아님 — role=coach 유지. [나중에 할게요]→/home(참여자로 활동). 저장 후 refresh → 완비면 콘솔 개방.
import { useMemo, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { createCoreContext } from '@/core/context';
import { createBrowserSupabase } from '@/core/supabase/client';
import { Button } from '@/core/ui';
import { AppHeader } from '@/app/_screens/AppHeader';

const KPC_RE = /^KPC\d{5}$/;

const inputStyle: CSSProperties = {
  width: '100%',
  minHeight: 'var(--tap-min)',
  padding: '0 var(--space-3)',
  borderRadius: 'var(--radius)',
  border: 'var(--border-hair) solid var(--color-border)',
  background: 'var(--color-surface-2)',
  color: 'var(--color-text)',
  font: 'inherit',
  fontSize: 15,
  marginTop: 'var(--space-1)',
};
const labelStyle: CSSProperties = { color: 'var(--color-text-secondary)', display: 'block' };

export function CoachInfoGate({ userId, initialPhone, initialKpc }: { userId: string; initialPhone: string; initialKpc: string }) {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const ctx = useMemo(() => createCoreContext(supabase), [supabase]);
  const router = useRouter();
  const [phone, setPhone] = useState(initialPhone);
  const [kpc, setKpc] = useState(initialKpc);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kpcFormatBad = kpc.trim() !== '' && !KPC_RE.test(kpc.trim());
  // 부분 저장 허용: 전화 또는 (형식 통과한)KPC 중 하나라도 채우면 저장. 콘솔은 둘 다 완비 시 refresh 로 열림.
  const canSave = !busy && (phone.trim() !== '' || (kpc.trim() !== '' && KPC_RE.test(kpc.trim())));

  async function save() {
    if (!canSave) return;
    setBusy(true);
    setError(null);
    try {
      if (phone.trim()) await ctx.setPhone(userId, phone.trim());
      if (kpc.trim() && KPC_RE.test(kpc.trim())) await ctx.setMyCoachKpc(kpc.trim());
      router.refresh(); // 게이트 재평가 — 완비면 콘솔, 아니면 보완 유지
    } catch {
      setError('저장에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <AppHeader variant="flow" title="인도자 정보 확인" subtitle="인도자 콘솔을 열기 전에 몇 가지만 확인할게요" />

      {error ? <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-4)' }}>{error}</p> : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        <label className="t-caption" style={labelStyle}>
          전화번호
          <input style={inputStyle} type="tel" autoComplete="tel" placeholder="010-0000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className="t-caption" style={labelStyle}>
          KPC 인증번호
          <input style={inputStyle} type="text" placeholder="KPC12345" value={kpc} onChange={(e) => setKpc(e.target.value)} aria-label="KPC 인증번호" />
          {kpcFormatBad ? (
            <span className="t-caption" style={{ color: 'var(--color-text-secondary)', display: 'block', marginTop: 'var(--space-1)' }}>KPC + 숫자 5자리 (예: KPC12345)</span>
          ) : null}
        </label>
      </div>

      <Button onClick={save} disabled={!canSave} style={{ width: '100%', marginTop: 'var(--space-6)' }}>
        {busy ? '저장 중…' : '저장하고 콘솔 열기'}
      </Button>
      <Button variant="ghost" onClick={() => router.push('/home')} disabled={busy} style={{ width: '100%', marginTop: 'var(--space-3)' }}>
        나중에 할게요
      </Button>
      <p className="t-caption" style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-4)', textAlign: 'center' }}>
        나중에 하면 참여자 홈으로 가요. 언제든 다시 인도자 콘솔에서 채울 수 있어요.
      </p>
    </div>
  );
}
