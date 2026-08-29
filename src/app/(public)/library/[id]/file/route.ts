// 파일 프록시 — **주소는 관문을 지난 사람에게만 간다**(판정 ④ · 2026-08-29).
//
// **서명 URL 을 쓰지 않는다.** 서명 URL 은 관문을 지난 사람이 그 주소를 **넘길 수 있어**
//   TTL 동안 잔여 창이 남는다 — 5-2 에서 «액세스 토큰 잔여 수명» 으로 문제 삼은 그 성질이다.
//   여기서는 **매 요청이 관문을 다시 지난다.** 잔여 창 0.
//
// 관문은 **두 겹**이다:
//   ⑴ `openLibraryItem` → `library_open` 이 `library_can_view` 로 판정하고 못 지나면 42501
//   ⑵ 저장소 다운로드 자체가 사용자 세션으로 나가므로 RLS(`library_can_view_path`)가 한 번 더 본다
//   **한 겹이 뚫려도 다른 겹이 남는다.** 판정 함수는 같은 하나이므로 갈리지 않는다.
//
// 응답에 저장소 주소를 싣지 않는다 — 리다이렉트가 아니라 **바이트를 흘린다.**
import { createServerContext } from '@/core/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const ctx = await createServerContext();
    const source = await ctx.openLibraryItem(id);
    // «없다» 와 «못 본다» 를 같은 얼굴로 답한다 — 존재를 알리지 않는다.
    if (!source || source.kind !== 'file' || !source.storagePath) {
      return new Response('not found', { status: 404 });
    }
    const file = await ctx.downloadLibraryFile(source.storagePath);
    if (!file) return new Response('not found', { status: 404 });

    return new Response(file.body, {
      status: 200,
      headers: {
        'content-type': file.contentType,
        // **캐시하지 않는다.** 자격은 언제든 바뀌고(보류 · 기수 이동),
        //   중간 캐시가 들고 있으면 그것이 곧 잔여 창이다.
        'cache-control': 'private, no-store',
        'content-disposition': `inline; filename*=UTF-8''${encodeURIComponent(source.title)}`,
      },
    });
  } catch {
    return new Response('not found', { status: 404 });
  }
}
