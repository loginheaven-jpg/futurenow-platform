// 썸네일 프록시 — **누르기 전에 유튜브로 나가는 요청이 없다**(설계서 §4.2 · 발주 §6.3 수용 기준).
//
// **`file/route.ts` 를 글자 그대로 본떴다.** 새로 설계하지 않았다 —
//   그 파일이 이미 «관문 먼저 · 리다이렉트 말고 바이트 · 캐시 안 함» 을 정해 두었고,
//   같은 것을 두 번 설계하면 **한쪽만 고쳐지는 날**이 온다(불변식 23).
//
// ★ **왜 프록시인가.** `<img src="https://i.ytimg.com/...">` 를 화면에 박으면
//   목록·자료 화면을 **여는 것만으로** 방문자의 IP 와 `Referer` 가 구글로 간다.
//   서가는 비로그인도 보는 화면이라 그 대상이 «자료를 누른 사람» 이 아니라 «지나간 사람» 이다.
//   설계서가 그것을 수용 기준으로 못 박았다 — *「누르기 전 유튜브 요청 0회」*.
//   **누른 뒤**에는 `youtube-nocookie` iframe 이 서고, 그때는 사용자가 고른 일이다.
//
// ★ **관문이 먼저다.** `openLibraryItem` 이 `null` 이면 썸네일도 없다 —
//   못 보는 자료의 표지가 보이면 그 자체가 «여기 뭔가 있다» 는 정보다.
//   그리고 **id 를 응답에 싣지 않는다.** 바이트만 나간다.
import { createServerContext } from '@/core/supabase/server';
import { youtubeId, youtubeThumbUrl } from '@/core/library/youtube';

export const dynamic = 'force-dynamic';

/**
 * 밖으로 나가는 대기에는 **상한이 있다**(CLAUDE.md §11 — 기다림에는 끝이 있어야 한다).
 *   넘기면 조용히 넘어가지 않고 404 를 내며, 화면은 썸네일 없이 선다.
 */
const TIMEOUT_MS = 5000;
/** 썸네일이 이보다 크면 유튜브가 아닌 무언가다. 받아 놓고 버리지 않고 **애초에 끊는다.** */
const MAX_BYTES = 2 * 1024 * 1024;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const ctx = await createServerContext();
    // ★ 게이트가 먼저다. 여기서 막히면 아래 줄이 실행되지 않는다.
    const source = await ctx.openLibraryItem(id);
    // «없다» 와 «못 본다» 를 같은 얼굴로 답한다 — 존재를 알리지 않는다.
    if (!source || source.kind !== 'link') return new Response('not found', { status: 404 });

    const vid = youtubeId(source.url);
    if (!vid) return new Response('not found', { status: 404 });

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(youtubeThumbUrl(vid), {
        signal: ac.signal,
        // 호스트 검사를 우회하는 길을 끊는다 — 따라가지 않는다.
        redirect: 'error',
        // **우리 주소를 유튜브에 알리지 않는다.** 어느 자료를 보는지까지 넘길 이유가 없다.
        referrerPolicy: 'no-referrer',
        headers: { accept: 'image/*' },
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok || !res.body) return new Response('not found', { status: 404 });

    const len = Number(res.headers.get('content-length') ?? '0');
    if (len > MAX_BYTES) return new Response('not found', { status: 404 });

    const type = res.headers.get('content-type') ?? '';
    // 받아 온 것이 **정말 이미지인지** 값으로 본다. 확장자·주소로 성질을 파생하지 않는다.
    if (!type.startsWith('image/')) return new Response('not found', { status: 404 });

    return new Response(res.body, {
      status: 200,
      headers: {
        'content-type': type,
        // 파일 프록시와 **같은 정책**이다. 자격은 언제든 바뀌고(보류·기수 이동),
        //   중간 캐시가 들고 있으면 그것이 곧 잔여 창이다.
        'cache-control': 'private, no-store',
      },
    });
  } catch {
    // 시간 초과(AbortError)도 여기로 온다 — 썸네일이 없다고 자료 화면이 무너지지 않는다.
    return new Response('not found', { status: 404 });
  }
}
