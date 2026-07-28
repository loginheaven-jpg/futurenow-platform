'use server';
// 인도자 회차 일정 시드(ADR-80 · Phase 7). seed_cohort_sessions DEFINER — 담당 인도자·운영자 게이트는 RPC 내부.
//   시작일과 주 간격으로 7행. 개별 행 조정은 후속(upsertCohortSessions). 개설 시 자동 호출 아님(일정 단일 진실=cohort_sessions).
import type { CohortSession } from '@/contracts';
import { createServerContext } from '@/core/supabase/server';

export async function seedSessionsAction(cohortId: string, firstHeldAt: string): Promise<{ ok: boolean; inserted?: number; error?: string }> {
  try {
    const ctx = await createServerContext();
    const inserted = await ctx.seedCohortSessions(cohortId, firstHeldAt);
    return { ok: true, inserted };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '일정 생성에 실패했습니다.' };
  }
}

// 개별 회차 날짜 수정(ORDER Phase 7-2). upsertCohortSessions → cohort_sessions RLS(담당 인도자·운영자) 이중 게이트.
export async function saveScheduleAction(cohortId: string, rows: CohortSession[]): Promise<{ ok: boolean; error?: string }> {
  try {
    const ctx = await createServerContext();
    await ctx.upsertCohortSessions(cohortId, rows);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '일정 저장에 실패했습니다.' };
  }
}

// 편지 사진 삭제(운영자) — storage RLS(본인/운영자)가 강제. 인도자는 삭제 불가(정책상 거부).
export async function deletePhotoAction(path: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const ctx = await createServerContext();
    await ctx.deleteCheckinPhoto(path);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '사진 삭제에 실패했습니다.' };
  }
}
