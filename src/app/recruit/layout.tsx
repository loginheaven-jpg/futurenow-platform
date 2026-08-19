// /recruit 세그먼트 레이아웃 — **metadataBase 를 두기 위해서만** 존재한다. 화면은 그대로 통과시킨다.
//
// 왜 page.tsx 가 아니라 여기인가: 카톡 미리보기 이미지는 파일 관례(opengraph-image.png)가 별도 라우트로
//   프리렌더된다. 그 라우트는 **레이아웃 체인의 metadata 만** 본다 — page 의 metadata 는 범위 밖이라
//   page 에만 metadataBase 를 두면 빌드가 매번 "metadataBase ... using http://localhost:3000" 경고를 낸다.
//   (결과물 자체는 절대 URL 로 나오지만, 매 배포마다 뜨는 경고는 진짜 경고를 가린다.)
//   루트 layout 에 넣는 선택지는 버렸다 — 전 라우트가 공유하는 파일이고, 이 값은 모집 랜딩의 사정이다.
//   metadata 는 레이아웃 → 페이지로 병합되므로 page.tsx 의 상대 URL(openGraph.url)도 이 값으로 해석된다.
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SITE_ORIGIN } from './copy';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
};

export default function RecruitLayout({ children }: { children: ReactNode }) {
  return children;
}
