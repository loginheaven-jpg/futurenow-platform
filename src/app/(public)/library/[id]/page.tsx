// 자료 화면 — **화면 전체가 관문이다**(서가 A 뼈대).
//
// **게이트가 데이터보다 먼저다.** `openLibraryItem` 이 `null` 이면 그 아래로 아무것도 그리지 않는다 —
//   제목도, 설명도, 링크도. **못 보는 사람에게는 이 화면에 아무것도 없다.**
//   (불변식 19 · §9 게이트 화면 검증 규율: 본문 민감 콘텐츠 0 으로 판정한다.)
//
// **주소를 본문에 싣지 않는다**(§4). 파일은 같은 경로 아래 프록시(`/library/[id]/file`)가 흘리고,
//   그 프록시가 **매 요청마다** 관문을 다시 지난다 — 잔여 창 0(판정 ④).
//
// 제목은 **자료 제목**이라 라우트 키 표가 들 수 없다. U-4 가 세운 통로를 쓴다(§11).
import { notFound } from 'next/navigation';
import { createServerContext } from '@/core/supabase/server';
import { youtubeId, youtubeEmbedUrl, youtubeWatchUrl } from '@/core/library/youtube';
import { LIBRARY_NAME, LIBRARY_HREF } from '@/app/_vocab/library';
import { LibraryItemView } from './LibraryItemView';
import { ItemSocial } from './ItemSocial';

export const dynamic = 'force-dynamic';

export default async function LibraryItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await createServerContext();

  // ★ 게이트가 먼저다. 여기서 막히면 아래 줄이 실행되지 않는다.
  const source = await ctx.openLibraryItem(id).catch(() => null);
  if (!source) notFound(); // «없다» 와 «못 본다» 를 한 얼굴로 답한다 — 존재를 알리지 않는다

  // 게이트를 지난 **뒤에** 곁들이를 받는다. 실패해도 자료 화면은 선다 —
  //   댓글이 안 불러와졌다고 자료를 못 보게 하지 않는다.
  const me = await ctx.currentUser().catch(() => null);
  const [comments, mine, reported] = await Promise.all([
    ctx.listLibraryComments(id).catch(() => []),
    me ? ctx.myLibraryReactions([id]).catch(() => ({} as Record<string, string[]>))
       : Promise.resolve({} as Record<string, string[]>),
    me ? ctx.didIReportLibraryItem(id).catch(() => false) : Promise.resolve(false),
  ]);
  // ★ **영상인가는 서버가 정한다**(설계서 §4.2). 화면이 주소를 다시 훑지 않는다 —
  //   판정이 두 곳이면 한 곳만 고쳐지는 날이 온다. 그리고 **영상 id 는 화면으로 내려가지 않는다**:
  //   재생 주소만 조립해 건네므로 목록·HTML 어디에도 raw id 가 남지 않는다.
  //   관문(`openLibraryItem`)을 이미 지난 뒤라 여기서 만드는 것이 안전하다.
  const vid = source.kind === 'link' ? youtubeId(source.url) : null;
  const video = vid ? { embedUrl: youtubeEmbedUrl(vid), watchUrl: youtubeWatchUrl(vid) } : null;

  // 집계는 목록 RPC 가 내지만 이 화면은 자료 하나만 보므로 거기서 골라 온다.
  const row = (await ctx.listLibrary().catch(() => [])).find((x) => x.id === id);

  return (
    <>
      <LibraryItemView
        id={id}
        title={source.title}
        kind={source.kind}
        url={source.url}
        video={video}
        backHref={LIBRARY_HREF}
        backLabel={LIBRARY_NAME}
      />
      <div className="pc-shell">
        <ItemSocial
          itemId={id}
          signedIn={me !== null}
          initialComments={comments}
          initialReactions={(row?.reactions ?? {}) as Record<string, number>}
          initialMine={mine[id] ?? []}
          alreadyReported={reported}
        />
      </div>
    </>
  );
}
