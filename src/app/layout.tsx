import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "퓨처나우 진단 플랫폼",
  description: "공용 코어 + 퓨처나우 인스트루먼트",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 스타일·디자인 토큰은 design_system.md 확정 후 적용한다(CLAUDE §8).
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
