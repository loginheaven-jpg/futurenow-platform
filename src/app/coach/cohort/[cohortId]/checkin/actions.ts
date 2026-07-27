'use server';
// 인도자 회차 일정 시드(ADR-80 · Phase 7). seed_cohort_sessions DEFINER — 담당 인도자·운영자 게이트는 RPC 내부.
//   시작일과 주 간격으로 7행. 개별 행 조정은 후속(upsertCohortSessions). 개설 시 자동 호출 아님(일정 단일 진실=cohort_sessions).
import { createServerContext } from '@/core/supabase/server';

export async function seedSessionsAction(cohortId: string, firstHeldAt: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const ctx = await createServerContext();
    await ctx.seedCohortSessions(cohortId, firstHeldAt);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '일정 생성에 실패했습니다.' };
  }
}
