'use server';
// 회차 갈무리 카드 서버 액션(ADR-80). 코어 경유 — 쓰기는 전량 DEFINER RPC(checkin_*). 권한·게이트는 RPC 내부.
import { createServerContext } from '@/core/supabase/server';

type Flags = { suggestionAnon?: boolean; contactRequest?: boolean; deepOpened?: boolean };

// 자동 저장(upsert). has_content 는 서버(checkin_save)가 계산.
export async function saveCheckinAction(
  cohortId: string,
  sessionNo: number,
  answers: Record<string, unknown>,
  flags?: Flags,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const ctx = await createServerContext();
    await ctx.saveMyCheckin({ cohortId, sessionNo, answers, flags });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '저장에 실패했습니다.' };
  }
}

// 제출 — 반드시 save 선행(행 존재 전제). 최초 submitted_at 고정, 재제출 edit_count+1.
export async function submitCheckinAction(
  cohortId: string,
  sessionNo: number,
  answers: Record<string, unknown>,
  flags?: Flags,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const ctx = await createServerContext();
    await ctx.saveMyCheckin({ cohortId, sessionNo, answers, flags }); // R2: save → submit 순서 보장
    await ctx.submitMyCheckin(cohortId, sessionNo);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '제출에 실패했습니다.' };
  }
}

// 카드 최초 진입 표식(first_opened_at 1회). 실패는 무해(계측만) — 조용히 삼킨다.
export async function markCheckinOpenedAction(cohortId: string, sessionNo: number): Promise<void> {
  try {
    const ctx = await createServerContext();
    await ctx.markCheckinOpened(cohortId, sessionNo);
  } catch {
    /* 계측 실패 무해 */
  }
}
