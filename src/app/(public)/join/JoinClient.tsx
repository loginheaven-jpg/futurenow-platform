'use client';
// 참여 진입 오케스트레이션 — 코드 → 미리보기(실데이터) → 가입/로그인(통합 폼) → 시작 → 프로필/계기 → 응답 → 저장+채점+알림.
// UX통합가입 S3: 가입 시 프로필(성별·생년…)을 metadata 로 트리거 저장. 프로필 단계는 계정값 프리필 후 motivation(계기)만.
//   subjectProfile 박제 = saveResponse 직전 계정(getProfile) 값 복사 + motivation(사전). 참여자 화면 경고색 배제.
import { useEffect, useMemo, useState } from 'react';
import { useSetChrome } from '@/app/_screens/shell/chromeContext';
import { joinChrome } from './joinChrome';
import { useRouter } from 'next/navigation';
import type { CohortPreviewMeta, UserProfile } from '@/contracts';
import { createCoreContext } from '@/core/context';
import { createBrowserSupabase } from '@/core/supabase/client';
import { ResponseRunner } from '@/core/response/ResponseRunner';
// ⚠ 이 import 는 **의도적으로 남겨 둔 것**이다(ADR-95 · 지휘부 판단 2026-08-07). 실수가 아니다.
//   `/join` 은 공개 라우트인데 이 줄 때문에 사전진단 문항 원문 전량(copy.ts itemPrompts 27개)이
//   미인증 방문자에게도 내려가는 클라이언트 청크에 실린다. 러너는 인증 뒤(step==='runner')에야 그려지지만
//   **번들은 첫 로드에 함께 나간다.** ADR-93 이 /preview 를 닫으며 발견했고, 전수 조사에서 공개 라우트 중
//   유일하게 남은 자리다. 노출의 실질은 '코드 없이 누구나'이나, 회기 코드를 가진 사람은 어차피 문항을
//   전부 보므로 **코드 소지자와 동등한 노출**로 보고 감수하기로 했다.
//   **되돌리려 하지 말 것** — next/dynamic 지연 로드는 청크 이름이 매니페스트에 남아 진짜 게이트가 아니고,
//   제대로 닫으려면 스키마를 인가 후 서버에서 내려주는 구조 변경이라 ResponseRunner 의 schema prop 계약에
//   닿는다(§0.3 지휘부 승인 사항). 재검토 조건은 ADR-95 에 적었다.
import { futurenowFlow } from '@/instruments/futurenow/flow';
import { futurenowAnswersSchema, futurenowProfileSchema } from '@/instruments/futurenow/schema';
import { CodeInput } from '@/app/_screens/entry/CodeInput';
import { CohortPreview } from '@/app/_screens/entry/CohortPreview';
import { GENERAL_CODE } from '@/app/_screens/entry/general';
import { AuthGate, type SignupPayload } from '@/app/_screens/entry/AuthGate';
import { StartGuide } from '@/app/_screens/entry/StartGuide';
import { ProfileForm, type ProfileStepResult } from '@/app/_screens/entry/ProfileForm';
import { Completion, type ParticipantMirrorView } from '@/app/_screens/entry/Completion';
import { useToast } from '@/app/_toast/ToastProvider';
import { CONSENT_VERSION } from '@/app/_consent/consent';
import { enrollByCode as enrollAction, finalizeResponse, getCohortMeta, previewCohort } from './actions';

type Step = 'resolving' | 'code' | 'preview' | 'auth' | 'start' | 'profile' | 'runner' | 'done';

export function JoinClient({ initialCohortId = null, initialCode = null, initialWave = 'pre' }: { initialCohortId?: string | null; initialCode?: string | null; initialWave?: 'pre' | 'post' }) {
  const toast = useToast();
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const context = useMemo(
    () =>
      createCoreContext(supabase, {
        validators: { futurenow: { answersSchema: futurenowAnswersSchema, profileSchema: futurenowProfileSchema } },
      }),
    [supabase],
  );

  const [step, setStep] = useState<Step>(initialCohortId || initialCode ? 'resolving' : 'code');
  const [code, setCode] = useState('');
  const [meta, setMeta] = useState<CohortPreviewMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accountProfile, setAccountProfile] = useState<UserProfile | null>(null);
  const [subjectProfile, setSubjectProfile] = useState<Record<string, unknown> | null>(null);
  const [mirror, setMirror] = useState<ParticipantMirrorView | null>(null);
  const [busy, setBusy] = useState(false); // 이중 제출 가드. try/finally 로 해제 — 실패 후 재시도 가능.

  useEffect(() => {
    if (!initialCohortId) return;
    let cancelled = false;
    (async () => {
      const m = await getCohortMeta(initialCohortId); // RLS 미달/비로그인 → null
      if (cancelled) return;
      if (m) {
        setMeta(m);
        setStep('start'); // 이미 가입자 — 코드·미리보기 생략
      } else {
        setStep('code'); // 안전 폴백
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialCohortId]);

  // 초대 링크 deep-link(A5): ?code= 있으면 코드 입력을 건너뛰고 미리보기로 자동 진입(cohort= 재진입이 우선).
  useEffect(() => {
    if (initialCohortId || !initialCode) return;
    let cancelled = false;
    (async () => {
      const m = await previewCohort(initialCode);
      if (cancelled) return;
      if (m) {
        setCode(initialCode);
        setMeta(m);
        setStep('preview');
      } else {
        setStep('code'); // 코드 무효 → 수동 입력 폴백
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialCohortId, initialCode]);

  async function onCode(c: string) {
    setError(null);
    const m = await previewCohort(c);
    if (!m) {
      setError('해당 코드의 회기를 찾지 못했어요. 코드를 다시 확인해 주세요.');
      return;
    }
    setCode(c);
    setMeta(m);
    setStep('preview');
  }

  async function enrollThenStart() {
    const r = await enrollAction(code);
    if (!r.ok) {
      const msg = r.error === 'auth_required' ? '로그인이 필요해요.' : '가입에 실패했어요. 잠시 후 다시 시도해 주세요.';
      setError(msg);
      toast.error(msg);
      return;
    }
    setStep('start');
  }

  async function onEnter() {
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (data.user) await enrollThenStart();
      else setStep('auth');
    } finally {
      setBusy(false);
    }
  }

  // 가입: 프로필 필드만 metadata 로(트리거가 users.name·user_profiles 저장). 코치 신청은 /join 비노출(allowCoachApply=false).
  async function onSignup(p: SignupPayload) {
    if (busy) return;
    setBusy(true);
    setError(null);
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
        setError('이메일 확인이 필요할 수 있어요. 받은 메일의 링크를 누른 뒤 다시 시도해 주세요.');
        return;
      }
      // 연락처(전화 필수·주소/계좌 선택) 저장 + 개인정보 동의 기록(ADR-75·76). 세션=본인. 실패해도 진입은 계속.
      await context.setContact({ phone: p.phone ?? null, address: p.address ?? null, bankAccount: p.bankAccount ?? null }).catch(() => {});
      await context.recordConsent('privacy_use', CONSENT_VERSION).catch(() => {});
      if (p.consentSensitive) await context.recordConsent('sensitive_use', CONSENT_VERSION).catch(() => {});
      await enrollThenStart();
    } finally {
      setBusy(false);
    }
  }

  async function onLogin(email: string, password: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await supabase.auth.signInWithPassword({ email, password });
      if (res.error) {
        setError(res.error.message);
        return;
      }
      if (!res.data.session) {
        setError('이메일 확인이 필요할 수 있어요.');
        return;
      }
      await enrollThenStart();
    } finally {
      setBusy(false);
    }
  }

  // 시작 → 계정 프로필 조회(프리필 판단) 후 프로필 단계.
  async function onStart() {
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await supabase.auth.getUser();
      const prof = data.user ? await context.getProfile(data.user.id).catch(() => null) : null;
      setAccountProfile(prof);
      setStep('profile');
    } finally {
      setBusy(false);
    }
  }

  // 프로필 단계 제출 → (구계정이면) 계정 반영 + subjectProfile 박제(계정값 복사 + motivation).
  async function onProfileSubmit(r: ProfileStepResult) {
    if (busy) return;
    setBusy(true);
    try {
      let acct = accountProfile;
      if (r.profile) {
        await context.setProfile(r.profile).catch(() => {}); // 계정 반영(실패해도 스냅샷은 진행 — 우아한 저하)
        acct = { gender: r.profile.gender, birthYear: r.profile.birthYear, religion: r.profile.religion ?? null, faithYears: r.profile.faithYears ?? null };
      }
      const sp: Record<string, unknown> = {}; // NULL 계정값은 담지 않음(zod optional — 관찰 하나)
      if (acct?.gender != null) sp.gender = acct.gender;
      if (acct?.birthYear != null) sp.birthYear = acct.birthYear;
      if (acct?.religion != null) sp.religion = acct.religion;
      if (acct?.faithYears != null) sp.faithYears = acct.faithYears;
      if (r.motivation) sp.motivation = r.motivation;
      setSubjectProfile(sp);
      setStep('runner');
    } finally {
      setBusy(false);
    }
  }

  // **단계 크롬을 껍데기에 알린다**(U-4 §1) — 제목·부제·뒤로가 여기서 한 번에 선다.
  //   표는 값만 들고(`joinChrome`) 뒤로의 **동작**은 화면이 든다 — 단계 전환은 상태이기 때문이다.
  const c = joinChrome(step, { isGeneral: code === GENERAL_CODE, cohortName: meta?.name, hasMeta: !!meta });
  const backStep = c?.back;
  useSetChrome(
    c ? { variant: c.variant, title: c.title, subtitle: c.subtitle, onBack: backStep ? () => setStep(backStep) : undefined } : null,
  );

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      {error ? (
        <p className="t-caption" style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
          {error}
        </p>
      ) : null}
      {step === 'resolving' && (
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>불러오는 중…</p>
      )}
      {step === 'code' && <CodeInput onSubmit={onCode} onExperience={() => onCode(GENERAL_CODE)} />}
      {step === 'preview' && meta && <CohortPreview meta={meta} onEnter={onEnter} onCancel={() => setStep('code')} busy={busy} isGeneral={code === GENERAL_CODE} />}
      {step === 'auth' && <AuthGate onSignup={onSignup} onLogin={onLogin} busy={busy} />}
      {step === 'start' && meta && <StartGuide onStart={onStart} />}
      {step === 'profile' && <ProfileForm accountProfile={accountProfile} onSubmit={onProfileSubmit} busy={busy} />}
      {step === 'runner' && meta && (
        <ResponseRunner
          schema={futurenowFlow.getSchema(initialWave)}
          context={context}
          cohortId={meta.id}
          wave={initialWave}
          subjectProfile={subjectProfile ?? undefined}
          onComplete={async (responseId) => {
            if (busy) return; // 이중 finalize 가드
            setBusy(true);
            setStep('done'); // 즉시 완료 화면(러너 기본 done 플래시 회피)
            try {
              const res = await finalizeResponse(responseId);
              setMirror(res.ok ? res.mirror ?? null : null); // 실패 시 null → ①+④만(우아한 저하)
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
      {/* 완료 후 착지 — 코드 입력 복귀(재제출 유발) 대신 자기 홈으로(진입-3 완료 반영). A-2 */}
      {step === 'done' && <Completion mirror={mirror} onFinish={() => router.push('/home')} />}
    </div>
  );
}
