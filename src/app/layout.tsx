import type { Metadata, Viewport } from "next";
import "./globals.css";
import "@/core/ui/ui.css"; // 공용 컴포넌트 스타일(역할 토큰 기반) — 전역 1회 로드
import { ToastProvider } from "@/app/_toast/ToastProvider"; // 전역 토스트(클라이언트 래퍼 — 서버 children 통과)

export const metadata: Metadata = {
  title: "퓨처나우 진단 플랫폼",
  description: "공용 코어 + 퓨처나우 인스트루먼트",
};

// 라이트 고정(design_system §1.3) — <meta name="color-scheme" content="only light"> 방출.
// OS 다크·브라우저 강제 다크(Chrome Auto Dark Theme·삼성 인터넷) 색 반전을 차단해 PC/모바일 색을 일치시킨다.
export const viewport: Viewport = {
  colorScheme: "only light",
  themeColor: "#1A3A5C", // navy-700 — 모바일 브라우저 UI 바 색
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
