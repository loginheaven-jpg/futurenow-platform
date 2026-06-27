'use server';
// 참여 진입 서버 액션 — 코어 CoreContext(서버 supabase) 경유. 진단 채점·알림은 인스트루먼트.
// 응답 저장(B①) 후 채점(B②)→알림(B④) 주입은 **코어 오케스트레이션**이 책임(ADR-19).
import type { Answers, CohortPreviewMeta } from '@/contracts';
import { createCoreContext } from '@/core/context';
import { createServerSupabase } from '@/core/supabase/server';
import { futurenowAlerts } from '@/instruments/futurenow/alerts';
import { futurenowScoring } from '@/instruments/futurenow/scoring';
import { futurenowAnswersSchema, futurenowProfileSchema } from '@/instruments/futurenow/schema';

async function ctx() {
  const sb = await createServerSupabase();
  return createCoreContext(sb, {
    validators: { futurenow: { answersSchema: futurenowAnswersSchema, profileSchema: futurenowProfileSchema } },
  });
}

// 코드의 차수 공개 메타(미가입·비로그인 가능 — SECURITY DEFINER RPC).
export async function previewCohort(code: string): Promise<CohortPreviewMeta | null> {
  return (await ctx()).previewCohortByCode(code);
}

// 코드로 현재 사용자를 가입(인증 필요 — auth.uid()).
export async function enrollByCode(code: string): Promise<{ ok: boolean; cohortId?: string; error?: string }> {
  try {
    const c = await ctx();
    const me = await c.currentUser();
    if (!me) return { ok: false, error: 'auth_required' };
    const enrollment = await c.enrollByCode(code);
    return { ok: true, cohortId: enrollment.cohortId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'enroll_failed' };
  }
}

// 응답 저장 후 채점→알림 주입. responseId 로 봉투를 다시 읽어 채점·알림 평가.
// 응답 가시성·알림 권한은 **RLS 가 강제**한다(본인 응답만 getResponse·raiseAlert 통과). 타인/부재 responseId 면
// RLS 가 차단해 예외 → 조용히 실패 반환(500 누출 방지). raiseAlert 는 멱등(중복 신호 무시).
export async function finalizeResponse(responseId: string): Promise<{ ok: boolean; alerts: number }> {
  try {
    const c = await ctx();
    const resp = await c.getResponse<Answers, unknown>(responseId);
    const scores = futurenowScoring.score(resp.answers, { wave: resp.wave });
    const signals = futurenowAlerts.evaluate(scores, resp.answers);
    let raised = 0;
    if (resp.cohortId) {
      for (const sig of signals) {
        await c.raiseAlert({ ...sig, responseId, cohortId: resp.cohortId });
        raised += 1;
      }
    }
    return { ok: true, alerts: raised };
  } catch {
    return { ok: false, alerts: 0 };
  }
}
