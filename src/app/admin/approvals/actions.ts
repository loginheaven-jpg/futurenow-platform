'use server';
// 승인/보류 서버 액션 — 가드는 전부 `decide_membership` RPC 안에 있다(운영자·자기 자신 차단·
//   화이트리스트·행잠금). 앱이 앞에서 한 번 더 막지 않는 이유는, 두 곳에서 막으면
//   한 곳만 고쳐질 때 뚫리기 때문이다(단계 2·3 보고 §3 과 같은 판단).
import { revalidatePath } from 'next/cache';
import { createServerContext } from '@/core/supabase/server';
import type { MembershipDecision } from '@/contracts/domain';

export type DecideResult = { ok: true } | { ok: false; error: string };

export async function decideMembershipAction(input: {
  userId: string;
  decision: MembershipDecision;
  validUntil?: string | null;
  note?: string | null;
}): Promise<DecideResult> {
  try {
    const ctx = await createServerContext();
    await ctx.decideMembership({
      userId: input.userId,
      decision: input.decision,
      // 기간은 개인 회원 승인에만 붙는다(RPC 가 그 밖의 조합을 22023 으로 막는다).
      validUntil: input.decision === 'individual' ? (input.validUntil ?? null) : null,
      note: input.note?.trim() ? input.note.trim() : null,
    });
    revalidatePath('/admin/approvals');
    return { ok: true };
  } catch {
    // 실패 사유를 화면에 그대로 옮기지 않는다 — 내부 메시지가 운영자 화면을 통해 새지 않게.
    return { ok: false, error: '처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.' };
  }
}
