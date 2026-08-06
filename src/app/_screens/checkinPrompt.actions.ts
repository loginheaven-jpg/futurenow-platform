'use server';
// 복귀 안내 노출 기록(ADR-91 B). checkin_mark 'prompt' — 상한 2는 RPC 안에 있다(회차당 두 번).
//   ADR-80 이 계측을 만들어 두고 호출부가 없어 prompt_count 가 전부 0이었다. 그 구멍을 메운다.
//   기록 실패가 화면을 막지 않는다 — 안내는 보여 주고 기록만 조용히 놓친다.
import { createServerContext } from '@/core/supabase/server';

export async function markCheckinPromptedAction(cohortId: string, sessionNo: number): Promise<void> {
  try {
    const ctx = await createServerContext();
    await ctx.markCheckinPrompted(cohortId, sessionNo);
  } catch {
    /* 계측 실패는 무해 */
  }
}
