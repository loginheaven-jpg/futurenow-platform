'use client';
// 회원가입 오케스트레이션(통합 폼 공유·allowCoachApply=true). UX통합가입 S3.
// 프로필은 metadata 로 트리거 저장(세션 무관). 코치 신청은 세션 확보 후 createCoachApplication RPC(+ setPhone) — client metadata 신뢰 폐기(§3.4).
// 착지는 loginOutcome 재사용(역할별). 비밀번호·토큰을 로그·URL 에 싣지 않는다.
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createCoreContext } from '@/core/context';
import { createBrowserSupabase } from '@/core/supabase/client';
import { loginOutcome } from '@/app/login/loginOutcome';
import { AuthGate, type SignupPayload } from '@/app/_screens/entry/AuthGate';

export function SignupClient() {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const ctx = useMemo(() => createCoreContext(supabase), [supabase]);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function land() {
    const role = (await ctx.currentUser())?.role ?? null;
    router.push(loginOutcome({ error: null, hasSession: true, role }).redirect ?? '/home');
  }

  async function onSignup(p: SignupPayload) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const data: Record<string, unknown> = { name: p.name, gender: p.gender, birth_year: p.birthYear };
      if (p.religion) data.religion = p.religion;
      if (p.faithYears != null) data.faith_years = p.faithYears;
      const res = await supabase.auth.signUp({ email: p.email, password: p.password, options: { data } });
      if (res.error) {
        setError(res.error.message);
        return;
      }
      if (!res.data.session) {
        // 이메일 확인 대기 — 세션이 없어 코치 신청(RPC)은 로그인 후로 미룸(§3.4 metadata 신뢰 폐기의 한계 — 보고).
        setNotice('가입 확인 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요.' + (p.coachApply ? ' 인도자 신청은 로그인 후 이어집니다.' : ''));
        return;
      }
      // 세션 있음 → 코치 신청(선택). 프로필은 트리거가 metadata 로 저장.
      if (p.coachApply) {
        const me = await ctx.currentUser();
        if (me && p.phone) await ctx.setPhone(me.id, p.phone).catch(() => {});
        try {
          await ctx.createCoachApplication({ kpcNumber: p.kpc ?? null });
        } catch {
          setError('인도자 신청 저장에 실패했어요. 로그인 후 다시 시도해 주세요.');
        }
      }
      await land();
    } finally {
      setBusy(false);
    }
  }

  async function onLogin(email: string, password: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await supabase.auth.signInWithPassword({ email, password });
      if (res.error) {
        setError(res.error.message);
        return;
      }
      await land();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      {error ? <p className="t-caption" style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>{error}</p> : null}
      {notice ? <p className="t-body" style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>{notice}</p> : null}
      <AuthGate allowCoachApply title="회원가입" busy={busy} onSignup={onSignup} onLogin={onLogin} />
      {/* 막다른 상태 해소(A′-3) — 로그인 페이지·현관 출구 */}
      <p className="t-caption" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-4)', textAlign: 'center' }}>
        이미 계정이 있으신가요? <a href="/login" style={{ color: 'var(--color-primary)' }}>로그인</a>
        {' · '}
        <Link href="/" style={{ color: 'var(--color-text-secondary)' }}>처음으로</Link>
      </p>
    </div>
  );
}
