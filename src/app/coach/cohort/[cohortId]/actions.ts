'use server';
// 차수 관리(마감·정원) — 기존 updateCohort 위 배선. 계약 변경 0. 권한은 앱 게이트 + cohorts_update RLS 이중.
import { createCoreContext } from '@/core/context';
import { createServerSupabase } from '@/core/supabase/server';

async function ctx() {
  return createCoreContext(await createServerSupabase());
}

export async function archiveCohortAction(cohortId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await (await ctx()).updateCohort(cohortId, { status: 'archived' });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '마감에 실패했습니다.' };
  }
}

export async function setCohortCapAction(cohortId: string, maxMembers: number): Promise<{ ok: boolean; error?: string }> {
  try {
    await (await ctx()).updateCohort(cohortId, { maxMembers });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '정원 변경에 실패했습니다.' };
  }
}
