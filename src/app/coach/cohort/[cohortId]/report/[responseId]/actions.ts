'use server';
// 코치 리포트 해석 — 비차단 생성 트리거(B③-A) + 코치 검수(B③-B). 서버 렌더 경로에서 aiChat 동기 await 를 제거(§1)하고,
// 클라이언트가 마운트 후 생성 트리거·검수(수정/되돌리기)를 호출한다. 권한은 전부 RLS 이중(코치/운영자, 참여자 비노출).
import type { Answers } from '@/contracts';
import { createServerContext } from '@/core/supabase/server';
import { futurenowScoring } from '@/instruments/futurenow/scoring';
import { generateInterpretation, type InterpretationContent } from '@/instruments/futurenow/report/interpretation';

// 패널 뷰모델: 유효 문구(effective=coach본 우선) + AI 원문(되돌리기 대상) + 코치 수정 여부(출처 배지·되돌리기 노출).
export interface InterpretationVM {
  effective: InterpretationContent;
  ai: InterpretationContent;
  coachEdited: boolean;
}

// 지연 생성 트리거(B③-A). getResponse RLS(차수 코치·운영자·본인)가 권한 강제 — 비소유 접근은 예외 → 실패 반환(누출 0).
// 멱등: generateInterpretation existing 선확인 + saveInterpretation '없을 때만' + aiChat useCache. 동시 열람 중복은 낭비이나 정합 안전(락 기각).
export async function ensureInterpretationAction(
  responseId: string,
): Promise<{ ok: true; vm: InterpretationVM } | { ok: false; error: string }> {
  try {
    const ctx = await createServerContext();
    const me = await ctx.currentUser();
    if (!me || me.role === 'user') return { ok: false, error: 'forbidden' }; // 코치/운영자 전용
    const resp = await ctx.getResponse<Answers, unknown>(responseId); // RLS 미달 → throw → catch
    const scores = futurenowScoring.score(resp.answers, { wave: resp.wave });
    const view = await generateInterpretation(ctx, responseId, scores, resp.cohortId ?? null);
    const effective = (view.effective ?? null) as InterpretationContent | null;
    const ai = (view.aiContent ?? null) as InterpretationContent | null;
    if (!effective || !ai) return { ok: false, error: 'generation_failed' };
    return { ok: true, vm: { effective, ai, coachEdited: view.coachContent != null } };
  } catch {
    return { ok: false, error: 'generation_failed' }; // 게이트웨이/파싱/타임아웃 — 조용한 실패 아님(패널이 재시도 안내)
  }
}

// 코치 검수 — 수정본 확정(B③-B). 코치가 다듬은 문구 저장(edited_by=본인·edited_at=now). 이후 effective=코치본.
// 권한: setCoachInterpretation → RLS(코치/운영자). 참여자·타 차수 코치는 정책상 차단 → 예외 → 실패 반환.
export async function saveCoachInterpretationAction(
  responseId: string,
  content: InterpretationContent,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const ctx = await createServerContext();
    await ctx.setCoachInterpretation(responseId, content);
    return { ok: true };
  } catch {
    return { ok: false, error: '저장에 실패했어요. 잠시 후 다시 시도해 주세요.' };
  }
}

// 코치 검수 — AI 원문으로 되돌리기(B③-B). coach_content=null → effective=AI 원문. RLS(코치/운영자).
export async function clearCoachInterpretationAction(
  responseId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const ctx = await createServerContext();
    await ctx.clearCoachInterpretation(responseId);
    return { ok: true };
  } catch {
    return { ok: false, error: '되돌리기에 실패했어요. 잠시 후 다시 시도해 주세요.' };
  }
}
