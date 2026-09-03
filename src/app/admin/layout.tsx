// 운영자 본부 레이아웃 — 조립은 `ConsoleLayout` 한 곳이다(U-5).
//   **전에는 사본 둘이었다**: 이 파일과 짝이 머리 주석 한 줄만 다르고 나머지가 한 글자도 같았다.
//   `export … from` 으로 넘기지 않고 **드러내 감싼다** — 그래야 `shellAudit` 의 전이 추적이
//   이 라우트가 어떤 껍데기를 쓰는지 본다(재는 도구가 못 보면 문서가 거짓이 된다).
import { ConsoleLayout } from '@/app/_screens/console/ConsoleLayout';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <ConsoleLayout>{children}</ConsoleLayout>;
}
