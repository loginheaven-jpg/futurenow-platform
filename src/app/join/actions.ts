'use server';
// 참여 진입 서버 액션 — 코어 CoreContext(서버 supabase) 경유. 진단 채점·알림은 인스트루먼트.
// 응답 저장(B①) 후 채점(B②)→알림(B④) 주입은 **코어 오케스트레이션**이 책임(ADR-19).
import type { Answers, CohortPreviewMeta } from '@/contracts';
import { createCoreContext } from '@/core/context';
import { createServerSupabase } from '@/core/supabase/server';
import { futurenowAlerts } from '@/instruments/futurenow/alerts';
import { participantMirror, type ParticipantMirror } from '@/instruments/futurenow/participantMirror';
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

// cohortId 로 차수 메타(러너 재진입 — Step 3.정비). 코드 재입력 없이 가입자가 진단을 이어서 풀게.
// 권한은 RLS 가 강제: getCohort 의 cohorts_select = 본인(coach)·가입자(is_cohort_member)·운영자만 읽힘 →
// 타 차수 cohortId 주입/비로그인 시 NotFound/예외 → null 반환 → JoinClient 가 코드 흐름으로 안전 폴백.
export async function getCohortMeta(cohortId: string): Promise<CohortPreviewMeta | null> {
  try {
    const c = await ctx();
    const me = await c.currentUser();
    if (!me) return null; // 비로그인 → 폴백
    const cohort = await c.getCohort(cohortId); // RLS 미달이면 NotFound → catch
    return {
      id: cohort.id,
      name: cohort.name,
      coachName: null, // 미리보기 단계를 건너뛰므로 미표시(start/runner 는 id·name 만 사용)
      instrumentId: cohort.instrumentId,
      memberCount: 0,
      status: cohort.status,
      expiresAt: cohort.expiresAt,
    };
  } catch {
    return null; // 미가입·부재 → 폴백
  }
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
// 반환값에 참여자 **갈망 거울**(②방향·③갈망·⑤믿음)을 실어 보낸다 — §7.5 완료 화면용(측정·신호 미노출).
// 앱 액션 시그니처 확장일 뿐 계약(CoreContext/InstrumentModule) 변경 아님(G1 보호).
export async function finalizeResponse(
  responseId: string,
): Promise<{ ok: boolean; alerts: number; mirror?: ParticipantMirror }> {
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
    return { ok: true, alerts: raised, mirror: participantMirror(scores) };
  } catch {
    return { ok: false, alerts: 0 };
  }
}
