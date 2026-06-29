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
