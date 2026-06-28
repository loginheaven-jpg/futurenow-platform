'use client';
// 참여 진입 오케스트레이션 — 코드 → 미리보기(실데이터) → 로그인/가입 → 가입 → 시작 → 응답 → 저장+채점+알림.
// 실 라우트. CohortPreview 는 previewCohort 서버 액션(실 DB) 으로 채운다. 참여자 화면 경고색 배제.
// (라우트 세그먼트 설정 force-dynamic 은 서버 컴포넌트 page.tsx 가 보유 — 클라이언트 페이지는 미반영되므로 분리.)
import { useMemo, useState } from 'react';
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
import { Completion, type ParticipantMirrorView } from '@/app/_screens/entry/Completion';
import { enrollByCode as enrollAction, finalizeResponse, previewCohort } from './actions';

type Step = 'code' | 'preview' | 'auth' | 'start' | 'runner' | 'done';

export function JoinClient() {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const context = useMemo(
    () =>
      createCoreContext(supabase, {
        validators: { futurenow: { answersSchema: futurenowAnswersSchema, profileSchema: futurenowProfileSchema } },
      }),
    [supabase],
  );

  const [step, setStep] = useState<Step>('code');
  const [code, setCode] = useState('');
  const [meta, setMeta] = useState<CohortPreviewMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mirror, setMirror] = useState<ParticipantMirrorView | null>(null);

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
      setError(r.error === 'auth_required' ? '로그인이 필요해요.' : '가입에 실패했어요. 잠시 후 다시 시도해 주세요.');
      return;
    }
    setStep('start');
  }

  async function onEnter() {
    const { data } = await supabase.auth.getUser();
    if (data.user) await enrollThenStart();
    else setStep('auth');
  }

  async function onAuth(mode: 'signup' | 'login', email: string, password: string) {
    setError(null);
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
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      {error ? (
        <p className="t-caption" style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
          {error}
        </p>
      ) : null}
      {step === 'code' && <CodeInput onSubmit={onCode} />}
      {step === 'preview' && meta && <CohortPreview meta={meta} onEnter={onEnter} onCancel={() => setStep('code')} />}
      {step === 'auth' && <AuthGate onSubmit={onAuth} />}
      {step === 'start' && meta && <StartGuide cohortName={meta.name} onStart={() => setStep('runner')} />}
      {step === 'runner' && meta && (
        <ResponseRunner
          schema={futurenowFlow.getSchema('pre')}
          context={context}
          cohortId={meta.id}
          wave="pre"
          onComplete={async (responseId) => {
            // 즉시 완료 화면으로(러너 기본 done 플래시 회피) → finalize await 후 거울 채움.
            setStep('done');
            const res = await finalizeResponse(responseId);
            setMirror(res.ok ? res.mirror ?? null : null); // 실패 시 null → ①+④만(우아한 저하)
          }}
        />
      )}
      {step === 'done' && <Completion mirror={mirror} onFinish={() => setStep('code')} />}
    </div>
  );
}
