'use server';
// 본부 멤버 역할 변경 — 기존 setUserRole(set_user_role RPC) 위 배선. 권한·가드는 RPC 내부에서 강제.
import type { ContactDetail, MemberActivity, Role, UserProfile } from '@/contracts';
import { createServerContext } from '@/core/supabase/server';

export async function setUserRoleAction(userId: string, role: Role): Promise<{ ok: boolean; error?: string }> {
  try {
    const ctx = await createServerContext();
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
    const ctx = await createServerContext();
    await ctx.decideCoachApplication({ applicationId, decision });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '신청 처리에 실패했습니다.' };
  }
}

// 멤버 세부(신원+활동) — 전화(getPhone 게이트)·프로필(getProfile)·활동(getMemberActivity) 병렬 수집. 전부 운영자 게이트(RLS·RPC).
//   전화/프로필은 부재 시 null(throw 아님) — 방어적 catch 로 활동만 있어도 표시. 활동 실패는 액션 실패로.
export type MemberDetail = { contact: ContactDetail | null; profile: UserProfile | null; activity: MemberActivity };
export async function memberDetailAction(
  userId: string,
): Promise<{ ok: true; detail: MemberDetail } | { ok: false; error?: string }> {
  try {
    const ctx = await createServerContext();
    const [contact, profile, activity] = await Promise.all([
      ctx.getContactDetail(userId).catch(() => null), // 전화·주소·계좌(운영자 전용)
      ctx.getProfile(userId).catch(() => null),
      ctx.getMemberActivity(userId),
    ]);
    return { ok: true, detail: { contact, profile, activity } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '세부정보 조회에 실패했습니다.' };
  }
}

// 멤버 하드삭제(운영자 임의) — delete_user(DEFINER) 위 배선. 권한(admin)·자기삭제 금지는 RPC 내부.
export async function deleteMemberAction(userId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const ctx = await createServerContext();
    await ctx.deleteMember(userId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '멤버 삭제에 실패했습니다.' };
  }
}
