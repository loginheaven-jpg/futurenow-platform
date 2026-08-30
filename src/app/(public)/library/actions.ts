'use server';
// 서가 서버 동작 — **판정은 전부 DB 가 한다.** 여기서 role 이나 등급을 다시 보지 않는다.
//   판정이 두 곳이 되면 한 곳만 고쳐질 때 뚫린다(옛 `signLibraryFileAction` 머리의 그 문장 그대로다).
//
// **주소를 돌려주는 동작이 없다**(§4). 파일은 `/library/[id]/file` 프록시가 흘리고,
//   그 라우트조차 클라이언트에게 저장소 주소를 주지 않는다.
import { createServerContext } from '@/core/supabase/server';
import type { LibraryAddInput } from '@/contracts/domain';
import { youtubeId, youtubeOembedUrl } from '@/core/library/youtube';
import { LIBRARY_TITLE_MAX, LINK_TITLE_TIMEOUT_MS } from '@/app/_vocab/library';

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

/**
 * 유튜브 제목 자동 입력 — **편의이지 등록의 전제가 아니다.**
 *
 * ★ **저장소에서 밖으로 나가는 두 번째 자리다**(첫째는 `core/ai/gateway.ts`).
 *   그래서 지키는 것을 여기 다 적는다.
 *
 *   ⑴ **자격을 먼저 본다.** 로그인만 하면 누구나 부를 수 있으면 이 액션이
 *      **URL 대리 호출기**가 된다. 올릴 수 있는 사람만 부른다 — 판정은 DB 가 한다.
 *   ⑵ **사용자 문자열로 나가지 않는다.** `youtubeId` 가 `URL` 로 파싱해 호스트를
 *      **완전 일치**로 보고 id 만 뽑는다. 나가는 주소는 **우리가 다시 조립한다.**
 *      그래서 `https://youtube.com.evil.test/...` 같은 것이 통과할 자리가 없다(SSRF).
 *   ⑶ **리다이렉트를 따라가지 않는다**(`redirect: 'error'`) — 호스트 검사를 우회하는 길이다.
 *   ⑷ **대기에 상한이 있고 넘기면 실패한다**(CLAUDE.md §11). 고정 `sleep` 을 두지 않는다.
 *   ⑸ **제목 길이를 표와 맞춘다.** `library_items.title` 이 1~120 자를 CHECK 한다 —
 *      넘겨서 23514 가 나면 화면은 **자격을 확인하라**고 말한다(위 catch-all). 원인이 아니다.
 *      그래서 **넣기 전에 자른다.** 숫자는 `_vocab/library.ts` 한 곳에서 온다(불변식 23).
 *   ⑹ **실패해도 등록을 막지 않는다.** 제목은 손 입력이 정본이고 이것은 거들 뿐이다.
 */
export async function fetchLinkTitleAction(
  rawUrl: string,
): Promise<{ ok: true; title: string } | { ok: false }> {
  const id = youtubeId(rawUrl);
  if (!id) return { ok: false }; // 유튜브가 아니면 할 일이 없다 — 밖으로 나가지 않는다
  try {
    const ctx = await createServerContext();
    // ⑴ 자격 — 올릴 수 없는 사람이 이것으로 밖에 나가게 두지 않는다.
    if (!(await ctx.canUploadLibrary())) return { ok: false };

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), LINK_TITLE_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(youtubeOembedUrl(id), {
        signal: ac.signal,
        redirect: 'error',
        referrerPolicy: 'no-referrer',
        headers: { accept: 'application/json' },
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) return { ok: false };

    const body = (await res.json()) as unknown;
    const title = (body as { title?: unknown })?.title;
    if (typeof title !== 'string') return { ok: false };
    const trimmed = title.trim();
    if (!trimmed) return { ok: false };

    // ⑸ 표의 CHECK 와 같은 상한. 자르되 **버리지 않는다** — 사용자가 고칠 수 있다.
    return { ok: true, title: trimmed.slice(0, LIBRARY_TITLE_MAX) };
  } catch {
    // 시간 초과(AbortError)·파싱 실패·자격 조회 실패가 전부 여기로 온다.
    //   ⑹ 조용히 거짓을 내고 화면은 손 입력을 그대로 살린다.
    return { ok: false };
  }
}
