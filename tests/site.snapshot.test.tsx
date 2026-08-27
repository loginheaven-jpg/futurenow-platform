// 부품 4폭 스냅숏 — SSR 마크업 뽑기 (4차 F-1 · 개요 §2 "4폭 = 1280·1024·768·390").
//
// **기본 SKIP.** `SHOT_DIR` 이 있을 때만 돈다 — `RUN_RLS_INTEGRATION` 과 같은 옵트인 규약이다.
//   평소 테스트 실행을 파일 쓰기로 오염시키지 않는다.
//
// **왜 서버가 아니라 정적 마크업인가.** `/preview/site` 는 게이트 뒤라 세션이 필요하고,
//   세션 자격이 없다(1차부터의 제약 · QA 계정 대기). 그래서 **같은 부품·같은 표시 데이터**를
//   여기서 그리고 실제 CSS 를 얹어 캡처한다. 보이는 것은 전시 화면과 같고
//   다른 것은 상호작용뿐이며, 그것은 `sheetKeys.test.ts` 가 판정으로 전수한다.
//
// F-2~F-5 도 매 단계 4폭 캡처를 요구하므로 **버리지 않고 남긴다**(`.shots.mjs` 가 이것을 부른다).
import { describe, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { writeFileSync } from 'node:fs';
import { SiteGallery } from '@/app/_screens/site/SiteGallery';

const DIR = process.env.SHOT_DIR;

describe.skipIf(!DIR)('부품 전시 마크업', () => {
  it('전시와 시트를 **따로** 쓴다 — 시트가 position:fixed 라 전시를 덮는다', () => {
    writeFileSync(`${DIR}/body.html`, renderToStaticMarkup(<SiteGallery />), 'utf8');
    const opened = renderToStaticMarkup(<SiteGallery openSheet />);
    writeFileSync(`${DIR}/body-sheet.html`, opened.slice(opened.indexOf('<div class="site-sheet__overlay"')), 'utf8');
  });
});
