'use server';
// 본부 멤버 역할 변경 — 기존 setUserRole(set_user_role RPC) 위 배선. 권한·가드는 RPC 내부에서 강제.
import type { Role } from '@/contracts';
import { createCoreContext } from '@/core/context';
import { createServerSupabase } from '@/core/supabase/server';

export async function setUserRoleAction(userId: string, role: Role): Promise<{ ok: boolean; error?: string }> {
  try {
    const ctx = createCoreContext(await createServerSupabase());
    await ctx.setUserRole(userId, role);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '역할 변경에 실패했습니다.' };
  }
}

// 코치 신청 결정(승인/거절) — decide_coach_application RPC 위 배선. 권한(is_admin)·원자 승격·이중결정 가드는 RPC 내부.
export async function decideCoachApplicationAction(
  applicationId: string,
  decision: 'approved' | 'rejected',
): Promise<{ ok: boolean; error?: string }> {
  try {
    const ctx = createCoreContext(await createServerSupabase());
    await ctx.decideCoachApplication({ applicationId, decision });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '신청 처리에 실패했습니다.' };
  }
}
