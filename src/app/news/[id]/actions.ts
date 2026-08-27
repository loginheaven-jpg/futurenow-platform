'use server';
// 소식 댓글 서버 액션(2차 · ADR-124).
//   가드는 전부 RPC 안이다 — 발행 여부·길이·보류·삭제 권한. 여기서 다시 판정하지 않는다.
import { createServerContext } from '@/core/supabase/server';
import type { NewsComment } from '@/contracts';

export type NewsCommentResult =
  | { ok: true; value: NewsComment[] }
  | { ok: false; error: string };

function surface(e: unknown, fallback: string): string {
  const m = e instanceof Error ? e.message : '';
  return /[가-힣]/.test(m) && !m.includes('실패:') ? m : fallback;
}

export async function createNewsCommentAction(postId: string, body: string): Promise<NewsCommentResult> {
  try {
    const ctx = await createServerContext();
    await ctx.createNewsComment(postId, body.trim());
    return { ok: true, value: await ctx.listNewsComments(postId) };
  } catch (e) {
    return { ok: false, error: surface(e, '남기지 못했습니다. 잠시 뒤 다시 시도해 주세요.') };
  }
}

export async function deleteNewsCommentAction(commentId: string, postId: string): Promise<NewsCommentResult> {
  try {
    const ctx = await createServerContext();
    await ctx.deleteNewsComment(commentId);
    return { ok: true, value: await ctx.listNewsComments(postId) };
  } catch (e) {
    return { ok: false, error: surface(e, '지우지 못했습니다.') };
  }
}
