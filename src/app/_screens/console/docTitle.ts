// 문서 화면의 이름 — **표에서 읽는다** (U-6).
//
// `/member/[userId]`·`/report/[responseId]` 는 화면이 아니라 **문서**라 이름의 자리가
//   본문 첫 줄(`ConsoleTitle`)이 아니라 **문서 머리**(`ReportPrintHeader`)다.
//   그래도 이름의 **출처**는 같아야 한다 — 부품 기본값을 쓰면 표와 갈라진다
//   (실제로 그랬다: 표 「개인 리포트」 vs 부품 기본값 「개인 체크 리포트」).
import { SCREEN_CHROME } from '@/app/_lib/screenChrome';

export function docTitle(pattern: string): string {
  const c = SCREEN_CHROME[pattern];
  if (!c || c.kind !== 'bar') throw new Error(`문서 이름을 표에서 못 읽었다: ${pattern}`);
  return c.title;
}
