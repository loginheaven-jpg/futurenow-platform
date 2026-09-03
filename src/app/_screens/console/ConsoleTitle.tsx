'use client';
// 콘솔 화면 이름 — **본문 첫 줄** (U-6 · 지휘부 결재 2026-09-03 물음 2 답).
//
// ─────────────────────────────────────────────────────────────────────────────
// **왜 껍데기가 아니라 화면이 그리는가.**
//   U-5 는 껍데기(`ConsoleShell`)가 `.console-title` 을 그렸다. 그런데 콘솔 본문의 폭이
//   화면마다 다르고(실측 ∞·480·480·560·1200) 껍데기는 그중 하나를 고를 수밖에 없어
//   **다섯 중 넷에서 제목만 왼쪽으로 튀었다**(1280px 에서 ΔL −56 · +360 · +360 · +320 · 0).
//   껍데기가 그리는 한 이 어긋남은 못 고친다 — 제목은 화면 컨테이너의 **형제**라 그 폭을 상속받지 못한다.
//
//   **화면 컨테이너 «안»에 두면** 폭이 저절로 맞는다. 그래서 자리를 옮겼다.
//
// **그래도 이름은 여전히 표에서만 온다** — 화면이 손으로 적지 않는다(사본 0).
//   화면이 하는 일은 «어디에 둘지» 뿐이고 «무엇을 적을지» 는 `SCREEN_CHROME` 이 든다.
//
// **탭이 켜지는 화면은 이것을 두지 않는다** — 띠가 이미 이름을 말한다(같은 말을 두 번 하지 않는다).
//   어느 화면이 두고 어느 화면이 안 두는지는 `tests/consoleNames.test.ts` 가 표로 잠근다.
// ─────────────────────────────────────────────────────────────────────────────
import { useParams, usePathname } from 'next/navigation';
import { SCREEN_CHROME, patternOf } from '@/app/_lib/screenChrome';

export function ConsoleTitle() {
  const pathname = usePathname() ?? '';
  const params = useParams() as Record<string, string | string[] | undefined>;
  const chrome = SCREEN_CHROME[patternOf(pathname, params)];
  // 표에 없거나 제목바 성질이 아니면 그리지 않는다 — 성질을 여기서 파생하지 않는다.
  if (!chrome || chrome.kind !== 'bar') return null;
  return <h1 className="console-title t-h1">{chrome.title}</h1>;
}
