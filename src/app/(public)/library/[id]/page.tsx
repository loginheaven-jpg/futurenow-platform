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
import { LIBRARY_NAME, LIBRARY_HREF } from '@/app/_vocab/library';
import { LibraryItemView } from './LibraryItemView';

export const dynamic = 'force-dynamic';

export default async function LibraryItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await createServerContext();

  // ★ 게이트가 먼저다. 여기서 막히면 아래 줄이 실행되지 않는다.
  const source = await ctx.openLibraryItem(id).catch(() => null);
  if (!source) notFound(); // «없다» 와 «못 본다» 를 한 얼굴로 답한다 — 존재를 알리지 않는다

  return (
    <LibraryItemView
      id={id}
      title={source.title}
      kind={source.kind}
      url={source.url}
      backHref={LIBRARY_HREF}
      backLabel={LIBRARY_NAME}
    />
  );
}
