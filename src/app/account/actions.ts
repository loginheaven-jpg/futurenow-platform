'use server';
// 계정 수정 서버 액션 — 이름(users.name)·전화(user_contacts). 본인 전용(currentUser/RLS·컬럼권한 보장).
// role 은 절대 쓰지 않는다(2.S2 봉쇄·set_user_role 전용). 비번 변경은 클라이언트 supabase.auth.updateUser.
import { createCoreContext } from '@/core/context';
import { createServerSupabase } from '@/core/supabase/server';

async function ctx() {
  return createCoreContext(await createServerSupabase());
}

export async function setNameAction(name: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await (await ctx()).setName(name);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '이름 저장에 실패했습니다.' };
  }
}

export async function setPhoneAction(phone: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const c = await ctx();
    const me = await c.currentUser();
    if (!me) return { ok: false, error: 'auth_required' };
    await c.setPhone(me.id, phone); // 본인 — assertContactAccess 통과
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '전화번호 저장에 실패했습니다.' };
  }
}
