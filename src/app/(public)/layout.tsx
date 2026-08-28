// 공개 껍데기가 서는 자리 (U-1 · `design_system.md` §12).
//
// **라우트 그룹 `(public)` 이다** — URL 에 나타나지 않는다. `/` 하나에만 껍데기를 씌우려면
//   이 방법뿐이다: `src/app/layout.tsx` 는 전 라우트의 루트라 회원·콘솔까지 덮는다.
//   지휘부 승인 2026-08-31(발주 «하지 말 것» 6번 개정 — 디렉터리 이동 허용 · URL 불변).
//
// **여기서 `cookies()` 를 부르지 않는다.** 부르는 순간 `/`·`/recruit` 의 ISR 이 깨진다.
//   세션은 `PublicGnb` 가 브라우저에서 본다(`PublicShell` 머리 참조).
import { ChromeProvider } from '@/app/_screens/shell/chromeContext';
import { PublicShell } from '@/app/_screens/site/PublicShell';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <ChromeProvider><PublicShell>{children}</PublicShell></ChromeProvider>;
}
