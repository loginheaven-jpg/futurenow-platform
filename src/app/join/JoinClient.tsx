'use client';
// 참여 진입 오케스트레이션 — 코드 → 미리보기(실데이터) → 로그인/가입 → 가입 → 시작 → 응답 → 저장+채점+알림.
// 실 라우트. CohortPreview 는 previewCohort 서버 액션(실 DB) 으로 채운다. 참여자 화면 경고색 배제.
// (라우트 세그먼트 설정 force-dynamic 은 서버 컴포넌트 page.tsx 가 보유 — 클라이언트 페이지는 미반영되므로 분리.)
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CohortPreviewMeta } from '@/contracts';
import { createCoreContext } from '@/core/context';
import { createBrowserSupabase } from '@/core/supabase/client';
import { ResponseRunner } from '@/core/response/ResponseRunner';
import { futurenowFlow } from '@/instruments/futurenow/flow';
import { futurenowAnswersSchema, futurenowProfileSchema } from '@/instruments/futurenow/schema';
import { CodeInput } from '@/app/_screens/entry/CodeInput';
import { CohortPreview } from '@/app/_screens/entry/CohortPreview';
import { AuthGate } from '@/app/_screens/entry/AuthGate';
import { StartGuide } from '@/app/_screens/entry/StartGuide';
import { ProfileForm, type ParticipantProfileInput } from '@/app/_screens/entry/ProfileForm';
import { Completion, type ParticipantMirrorView } from '@/app/_screens/entry/Completion';
import { useToast } from '@/app/_toast/ToastProvider';
import { enrollByCode as enrollAction, finalizeResponse, getCohortMeta, previewCohort } from './actions';

type Step = 'resolving' | 'code' | 'preview' | 'auth' | 'start' | 'profile' | 'runner' | 'done';

export function JoinClient({ initialCohortId = null }: { initialCohortId?: string | null }) {
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

  // ?cohort= 진입(가입자 러너 재진입): 코드·미리보기 건너뛰고 메타 확인 후 start 로. 실패 시 code 폴백.
  const [step, setStep] = useState<Step>(initialCohortId ? 'resolving' : 'code');
  const [code, setCode] = useState('');
  const [meta, setMeta] = useState<CohortPreviewMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ParticipantProfileInput | null>(null);
  const [mirror, setMirror] = useState<ParticipantMirrorView | null>(null);
  const [busy, setBusy] = useState(false); // 이중 제출 가드(입장·인증·완료). try/finally 로 해제 — 실패 후 재시도 가능.

  useEffect(() => {
    if (!initialCohortId) return;
    let cancelled = false;
    (async () => {
      const m = await getCohortMeta(initialCohortId); // RLS 미달/비로그인 → null
      if (cancelled) return;
      if (m) {
        setMeta(m);
        setStep('start'); // 이미 가입자 — 코드·미리보기 생략, 바로 시작
      } else {
        setStep('code'); // 안전 폴백(미가입·비로그인·부재) → 기존 코드 흐름
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialCohortId]);

  async function onCode(c: string) {
    setError(null);
    const m = await previewCohort(c);
    if (!m) {
      setError('해당 코드의 차수를 찾지 못했어요. 코드를 다시 확인해 주세요.');
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
      setError(msg); // 인라인(맥락 유지)
      toast.error(msg); // 토스트 피드백(작업 결과가 조용히 사라지지 않게)
      return;
    }
    setStep('start');
  }

  async function onEnter() {
    if (busy) return; // 이중 제출 가드
    setBusy(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (data.user) await enrollThenStart();
      else setStep('auth');
    } finally {
      setBusy(false);
    }
  }

  async function onAuth(mode: 'signup' | 'login', email: string, password: string) {
    if (busy) return; // 이중 제출 가드(signUp/signIn 중복 호출 차단)
    setBusy(true);
    setError(null);
    try {
      const res =
        mode === 'signup'
          ? await supabase.auth.signUp({ email, password })
          : await supabase.auth.signInWithPassword({ email, password });
      if (res.error) {
        setError(res.error.message);
        return;
      }
      if (!res.data.session) {
        setError('이메일 확인이 필요할 수 있어요. 받은 메일의 링크를 누른 뒤 다시 시도해 주세요.');
        return;
      }
      await enrollThenStart();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      {error ? (
        <p className="t-caption" style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
          {error}
        </p>
      ) : null}
      {step === 'resolving' && (
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>불러오는 중…</p>
      )}
      {step === 'code' && <CodeInput onSubmit={onCode} />}
      {step === 'preview' && meta && <CohortPreview meta={meta} onEnter={onEnter} onCancel={() => setStep('code')} busy={busy} />}
      {step === 'auth' && <AuthGate onSubmit={onAuth} busy={busy} />}
      {step === 'start' && meta && <StartGuide cohortName={meta.name} onStart={() => setStep('profile')} />}
      {step === 'profile' && (
        <ProfileForm
          onSubmit={(p) => {
            setProfile(p);
            setStep('runner');
          }}
        />
      )}
      {step === 'runner' && meta && (
        <ResponseRunner
          schema={futurenowFlow.getSchema('pre')}
          context={context}
          cohortId={meta.id}
          wave="pre"
          subjectProfile={profile ?? undefined}
          onComplete={async (responseId) => {
            if (busy) return; // 이중 finalize 가드
            setBusy(true);
            // 즉시 완료 화면으로(러너 기본 done 플래시 회피) → finalize await 후 거울 채움.
            setStep('done');
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
