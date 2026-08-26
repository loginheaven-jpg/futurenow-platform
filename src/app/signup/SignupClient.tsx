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
import { CONSENT_VERSION } from '@/app/_consent/consent';

export function SignupClient() {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const ctx = useMemo(() => createCoreContext(supabase), [supabase]);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function land() {
    router.push(loginOutcome({ error: null, hasSession: true }).redirect ?? '/home');
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
      // 대조 키를 metadata 에도 싣는다(§4.3 · handle_new_user 가 받아 적는다).
      //   세션 없는 분기(이메일 확인 대기)에서는 아래 RPC 가 돌지 못하는데, 그때도 승인 큐가
      //   **대조 키 없는 행**으로 차면 안 된다. 지금은 확인이 꺼져 있어 발화하지 않지만
      //   켜는 순간 조용히 새는 자리다.
      //   metadata 신뢰 폐기(§3.4)와 충돌하지 않는다 — 그것은 `coachApply` 처럼 **권한을 주는 값**이었고,
      //   대조 키는 운영자가 눈으로 맞춰 볼 재료라 위조하면 승인이 반려될 뿐 권한이 생기지 않는다.
      if (p.forumName) data.forum_name = p.forumName;
      if (p.forumPhone) data.forum_phone = p.forumPhone;
      if (p.signupNote) data.signup_note = p.signupNote;
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
      // 세션 있음 → 연락처(전화·주소·계좌) + 개인정보 동의 저장(전원·ADR-76). 프로필은 트리거가 metadata 로 저장.
      await ctx.setContact({ phone: p.phone ?? null, address: p.address ?? null, bankAccount: p.bankAccount ?? null }).catch(() => {});
      await ctx.recordConsent('privacy_use', CONSENT_VERSION).catch(() => {});
      if (p.consentSensitive) await ctx.recordConsent('sensitive_use', CONSENT_VERSION).catch(() => {});
      // 대조 키 — 정본 경로. metadata 는 세션 없는 분기의 안전망이고 여기가 본선이다.
      //   **PRIVACY_CONSENT 버전은 올리지 않는다.** 새 유형으로 따로 기록해 기존 회원이
      //   재동의 화면을 만나지 않게 한다(경로별 분기 · 메모 §3).
      if (p.forumName || p.forumPhone || p.signupNote) {
        await ctx
          .recordSignupIntake({ forumName: p.forumName ?? null, forumPhone: p.forumPhone ?? null, signupNote: p.signupNote ?? null })
          .catch(() => {});
      }
      if (p.consentForumMatch) await ctx.recordConsent('forum_match', CONSENT_VERSION).catch(() => {});
      // 코치 신청(선택).
      if (p.coachApply) {
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
      <AuthGate allowCoachApply allowForumMatch title="회원가입" busy={busy} onSignup={onSignup} onLogin={onLogin} />
      {/* 막다른 상태 해소(A′-3) — 로그인 페이지·현관 출구 */}
      <p className="t-caption" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-4)', textAlign: 'center' }}>
        이미 계정이 있으신가요? <Link href="/login" style={{ color: 'var(--color-primary)' }}>로그인</Link>
        {' · '}
        <Link href="/" style={{ color: 'var(--color-text-secondary)' }}>처음으로</Link>
      </p>
    </div>
  );
}
