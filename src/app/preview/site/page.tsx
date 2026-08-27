// 부품 9종 전시 (4차 F-1 · 발주 §2).
//   **기존 preview 게이트 뒤에 있다**(발주 §5-5) — `/preview/layout.tsx` 가 세션·역할을 막으므로
//   이 파일에 게이트를 다시 달지 않는다(달면 판정이 두 곳이 된다 · ADR-93 의 사고).
import { SiteGallery } from '@/app/_screens/site/SiteGallery';

export const dynamic = 'force-dynamic';

export default function PreviewSitePage() {
  return <SiteGallery />;
}
