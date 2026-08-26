'use server';
// 문의 제출 — 비로그인도 보낼 수 있다(공개 화면). 길이·빈도 가드는 RPC 안에 있고
//   **그것이 anon 이 부를 수 있는 유일한 쓰기 통로라 유일한 방벽이다.**
import { createServerContext } from '@/core/supabase/server';

export type ContactResult = { ok: true } | { ok: false; error: string };

export async function submitContactAction(input: {
  name?: string;
  email?: string;
  body: string;
}): Promise<ContactResult> {
  try {
    const ctx = await createServerContext();
    await ctx.submitContact({
      name: input.name?.trim() || null,
      email: input.email?.trim() || null,
      body: input.body.trim(),
    });
    return { ok: true };
  } catch (e) {
    // RPC 가 사용자 문안을 그대로 던진다(길이·빈도). 그 밖은 일반 문구로 덮는다.
    const m = e instanceof Error ? e.message : '';
    const known = m.includes('적어 주세요') || m.includes('다시 보내');
    return { ok: false, error: known ? m : '보내지 못했습니다. 잠시 뒤 다시 시도해 주세요.' };
  }
}
