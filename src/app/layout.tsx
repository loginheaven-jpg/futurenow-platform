import type { Metadata } from "next";
import "./globals.css";
import "@/core/ui/ui.css"; // 공용 컴포넌트 스타일(역할 토큰 기반) — 전역 1회 로드
import { ToastProvider } from "@/app/_toast/ToastProvider"; // 전역 토스트(클라이언트 래퍼 — 서버 children 통과)

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
    <html lang="ko">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
