'use server';
// 동행 피드 서버 액션(2차 · ADR-124).
//
// **가드를 여기에 두지 않는다.** 회기 자격은 `feed_can_access`, 보류는 `feed_assert_writable`
//   가 SQL 한 곳에서 본다. 여기서 한 번 더 판정하면 판정이 두 곳이 되고 언젠가 갈린다(IA §5.8).
//
// **RPC 가 던지는 문안을 그대로 나른다.** 보류 계정에게 입력창을 감추지 말고 게시 시도에
//   사실 문장으로 답하라는 것이 발주 §9.1 의 단서다. 오류 코드나 빈 화면으로 답하지 않는다.
import { createServerContext } from '@/core/supabase/server';
import type { FeedComment, FeedEmoji, FeedPost } from '@/contracts';

export type FeedResult<T> = { ok: true; value: T } | { ok: false; error: string };

// RPC 안의 한국어 문안은 그대로 보이고, 그 밖(권한·연결 등)은 일반 문구로 덮는다.
//   '지금은 글을 올릴 수 없어요'(보류)·'한 글자 또는 사진 한 장'(빈 글) 등이 사용자 문안이다.
function surface(e: unknown, fallback: string): string {
  const m = e instanceof Error ? e.message : '';
  return /[가-힣]/.test(m) && !m.includes('실패:') ? m : fallback;
}

/** 사진 경로는 클라이언트가 업로드한 뒤 넘긴다. 위조는 RPC 가 접두사로 막는다. */
export async function createFeedPostAction(input: {
  cohortId: string;
  body: string;
  photoPath?: string | null;
}): Promise<FeedResult<FeedPost[]>> {
  try {
    const ctx = await createServerContext();
    await ctx.createFeedPost({
      cohortId: input.cohortId,
      body: input.body.trim(),
      photoPath: input.photoPath ?? null,
    });
    // **게시 후 화면이 이동하지 않는다**(발주 §3.1) — 첫 장을 돌려주면 그 자리에서 맨 위에 붙는다.
    const posts = await ctx.listFeed({ cohortId: input.cohortId, limit: 20 });
    return { ok: true, value: posts };
  } catch (e) {
    return { ok: false, error: surface(e, '올리지 못했습니다. 잠시 뒤 다시 시도해 주세요.') };
  }
}

/** 더 보기 — 키셋. 무한 스크롤이 아니다(발주 §7-7). */
export async function loadFeedAction(input: {
  cohortId: string;
  before?: { createdAt: string; id: string } | null;
  mine?: boolean;
}): Promise<FeedResult<FeedPost[]>> {
  try {
    const ctx = await createServerContext();
    const posts = await ctx.listFeed({
      cohortId: input.cohortId,
      before: input.before ?? null,
      limit: 20,
      mine: input.mine ?? false,
    });
    return { ok: true, value: posts };
  } catch (e) {
    return { ok: false, error: surface(e, '불러오지 못했습니다.') };
  }
}

/**
 * 삭제 — **바이트를 먼저 회수한다.**
 *   Supabase 는 `storage.objects` 직접 DELETE 를 막으므로(ADR-87) DB 로는 지울 수 없고,
 *   RPC 가 `photo_path` 를 비우므로 순서를 뒤집으면 경로를 잃어 파일만 영영 남는다.
 *   사진 회수가 실패해도 글 삭제는 진행한다 — 사진이 남는 것보다 부적절한 글이 안 지워지는 쪽이 나쁘다.
 */
export async function deleteFeedPostAction(input: {
  postId: string;
  photoPath?: string | null;
  cohortId: string;
}): Promise<FeedResult<FeedPost[]>> {
  try {
    const ctx = await createServerContext();
    if (input.photoPath) await ctx.deleteFeedPhoto(input.photoPath).catch(() => undefined);
    await ctx.deleteFeedPost(input.postId);
    const posts = await ctx.listFeed({ cohortId: input.cohortId, limit: 20 });
    return { ok: true, value: posts };
  } catch (e) {
    return { ok: false, error: surface(e, '지우지 못했습니다.') };
  }
}

export async function reactFeedAction(postId: string, emoji: FeedEmoji): Promise<FeedResult<FeedEmoji[]>> {
  try {
    const ctx = await createServerContext();
    return { ok: true, value: await ctx.reactToFeedPost(postId, emoji) };
  } catch (e) {
    return { ok: false, error: surface(e, '반응하지 못했습니다.') };
  }
}

export async function listFeedCommentsAction(postId: string): Promise<FeedResult<FeedComment[]>> {
  try {
    const ctx = await createServerContext();
    return { ok: true, value: await ctx.listFeedComments(postId) };
  } catch (e) {
    return { ok: false, error: surface(e, '댓글을 불러오지 못했습니다.') };
  }
}

export async function createFeedCommentAction(postId: string, body: string): Promise<FeedResult<FeedComment[]>> {
  try {
    const ctx = await createServerContext();
    await ctx.createFeedComment(postId, body.trim());
    return { ok: true, value: await ctx.listFeedComments(postId) };
  } catch (e) {
    return { ok: false, error: surface(e, '댓글을 남기지 못했습니다.') };
  }
}

export async function deleteFeedCommentAction(commentId: string, postId: string): Promise<FeedResult<FeedComment[]>> {
  try {
    const ctx = await createServerContext();
    await ctx.deleteFeedComment(commentId);
    return { ok: true, value: await ctx.listFeedComments(postId) };
  } catch (e) {
    return { ok: false, error: surface(e, '지우지 못했습니다.') };
  }
}

/** 사진 서명 URL — 목록에 미리 싣지 않고(S-4 §2.2) 보이는 만큼만 여기서 받는다. */
export async function signFeedPhotosAction(paths: string[]): Promise<Record<string, string>> {
  try {
    const ctx = await createServerContext();
    return await ctx.signFeedPhotos(paths);
  } catch {
    return {}; // 조용히 실패한다 — 사진이 안 뜨는 것과 피드가 안 열리는 것은 심각도가 다르다
  }
}
