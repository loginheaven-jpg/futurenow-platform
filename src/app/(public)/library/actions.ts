'use server';
// 서가 서버 동작 — **판정은 전부 DB 가 한다.** 여기서 role 이나 등급을 다시 보지 않는다.
//   판정이 두 곳이 되면 한 곳만 고쳐질 때 뚫린다(옛 `signLibraryFileAction` 머리의 그 문장 그대로다).
//
// **주소를 돌려주는 동작이 없다**(§4). 파일은 `/library/[id]/file` 프록시가 흘리고,
//   그 라우트조차 클라이언트에게 저장소 주소를 주지 않는다.
import { createServerContext } from '@/core/supabase/server';
import type { LibraryAddInput } from '@/contracts/domain';

// **파일을 올리는 서버 액션은 없다**(실측 2026-08-29). 서버 액션 본문 상한이 **1MB** 라
//   그 길로는 자료가 못 지나간다(`Body exceeded 1 MB limit` · 화면은 크래시 화면을 냈다).
//   파일은 **브라우저에서 저장소로 곧장** 가고(피드·갈무리와 같은 관용구),
//   여기 남은 것은 **경로만 받는** 등록이다. 그래서 이 파일에는 큰 본문이 오지 않는다.

export async function addLibraryItemAction(
  input: LibraryAddInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const ctx = await createServerContext();
    const id = await ctx.addLibraryItem(input);
    return { ok: true, id };
  } catch {
    // 자격 없음(42501)도 여기로 온다 — 화면은 하나의 문장으로 받는다.
    return { ok: false, error: '지금은 올릴 수 없습니다. 자격을 확인해 주세요.' };
  }
}

export async function hideLibraryItemAction(
  id: string, hidden: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const ctx = await createServerContext();
    await ctx.hideLibraryItem(id, hidden);
    return { ok: true };
  } catch {
    return { ok: false, error: '지금은 바꿀 수 없습니다.' };
  }
}

// ── 서가 B — 반응 · 댓글 · 신고 ────────────────────────────────────────────────
// **여기서도 판정하지 않는다.** DB 가 `library_can_view` 로 보고 42501 을 던진다.
//   화면은 그 결과만 받는다 — 판정이 세 곳(DB·코어·화면)이 되면 갈린다.

export async function toggleLibraryReactionAction(
  itemId: string, emoji: string,
): Promise<{ ok: true; mine: string[] } | { ok: false }> {
  try {
    const ctx = await createServerContext();
    return { ok: true, mine: await ctx.toggleLibraryReaction(itemId, emoji) };
  } catch {
    return { ok: false }; // 왜 막혔는지 말하지 않는다 — 존재를 알리지 않는다(서가 A 형식)
  }
}

export async function createLibraryCommentAction(
  itemId: string, body: string,
): Promise<{ ok: true } | { ok: false }> {
  try {
    const ctx = await createServerContext();
    await ctx.createLibraryComment(itemId, body);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function deleteLibraryCommentAction(id: string): Promise<{ ok: boolean }> {
  try {
    const ctx = await createServerContext();
    await ctx.deleteLibraryComment(id);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function reportLibraryItemAction(
  itemId: string, reason: string | null,
): Promise<{ ok: boolean }> {
  try {
    const ctx = await createServerContext();
    await ctx.reportLibraryItem(itemId, reason);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
