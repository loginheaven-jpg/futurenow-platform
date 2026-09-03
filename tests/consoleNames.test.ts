import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { SCREEN_CHROME } from '@/app/_lib/screenChrome';
import { cohortTabs } from '@/app/_screens/console/consoleNav';

// 콘솔 이름 잠금 — **한 화면에 이름은 정확히 한 번** (U-6 · 지휘부 결재 2026-09-03
// 「모든 기능을 빠짐없이 제공하되 **중복없이**, **일관된 위치**에서」).
//
// ─────────────────────────────────────────────────────────────────────────────
// **U-6 이전에 이름의 자리가 넷으로 흩어져 있었다**(실측):
//   ⑴ 껍데기 `.console-title`(회기 밖 다섯만) · ⑵ 띠의 탭 라벨(회기 안 넷만)
//   ⑶ 인쇄 전용 `ReportPrintHeader`(화면에는 안 뜬다) · ⑷ **아무 데도 없음**
//   → `/group`·`/member/[userId]`·`/report/[responseId]`·`/checkin/preview` **넷은 이름이 없었다.**
//     띠는 그 넷에서 엉뚱한 탭(「대시보드」·「회차 갈무리」)을 켠 채 두어 사용자가 위치를 오해했다.
//
// **규칙은 하나다**: *탭이 그 화면을 켜면 탭이 이름을 든다. 아니면 본문 첫 줄(`ConsoleTitle`)이 든다.*
//   그리고 **이름은 언제나 `SCREEN_CHROME` 표에서만 온다** — 화면이 손으로 적지 않는다(사본 0).
//
// **잠금이 왜 라우트 전수인가**: 앞선 잠금은 `/coach/cohorts` **한 라우트**만 재고 있었고,
//   그 초록 위에서 나머지 넷이 이름 없이 살아 있었다(⑨-a 「창이 좁다」).
// ─────────────────────────────────────────────────────────────────────────────

/** 콘솔 라우트 = 표에 있는 `/coach`·`/admin` 계열 전부. 목록을 손으로 적지 않는다. */
const CONSOLE_ROUTES = Object.keys(SCREEN_CHROME).filter((r) => r.startsWith('/coach') || r.startsWith('/admin'));

/** 탭이 켜는 라우트 — `cohortTabs` 에서 낸다(사본을 만들지 않는다). 콘솔 밖(`/feed`)은 뺀다. */
const TAB_ROUTES = new Set(
  cohortTabs('[cohortId]')
    .map((t) => t.href.split('?')[0])
    .filter((h) => h.startsWith('/coach')),
);

/** 라우트 패턴 → `page.tsx` 경로. 동적 세그먼트는 디렉터리 이름 그대로다(라우트 그룹 없음). */
function pageOf(route: string): string {
  return `src/app${route}/page.tsx`;
}

/** 그 파일이 화면 이름을 그리는가. **주석은 세지 않는다** — 주석에 이름이 적혀 있어도 화면에는 안 뜬다. */
export function drawsTitle(src: string): boolean {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').includes('<ConsoleTitle');
}

describe('콘솔 화면 이름 — 정확히 한 번', () => {
  it('**잴 것이 실재한다** — 라우트도 탭도 0이 아니다', () => {
    expect(CONSOLE_ROUTES.length, '표에서 콘솔 라우트를 못 찾았다').toBeGreaterThan(10);
    expect(TAB_ROUTES.size, '탭 라우트가 0이다 — 아래 판정이 전부 한쪽으로 쏠린다').toBe(4);
  });

  it('**자가 문다** — 주석에만 있는 이름은 그린 것으로 세지 않는다', () => {
    expect(drawsTitle('<ConsoleTitle />'), '심은 변이를 놓쳤다').toBe(true);
    expect(drawsTitle('{/* <ConsoleTitle /> 를 여기 둘까 */}'), '주석을 그린 것으로 셌다').toBe(false);
    expect(drawsTitle('const a = 1;')).toBe(false);
  });

  it('**탭이 켜는 화면은 이름을 또 그리지 않는다** — 띠가 이미 말한다', () => {
    for (const r of CONSOLE_ROUTES.filter((r) => TAB_ROUTES.has(r))) {
      const f = pageOf(r);
      expect(existsSync(f), `${f} 가 없다 — 경로 규칙이 깨졌다`).toBe(true);
      expect(drawsTitle(readFileSync(f, 'utf8')), `${r} — 탭과 본문이 같은 말을 두 번 한다`).toBe(false);
    }
  });

  // ★★ **문서 화면 둘은 이름의 자리가 다르다**(U-6 · 배포해서 눈으로 잡았다).
  //   `ReportPrintHeader` 의 `wrap` 이 **인라인 `display:flex`** 라 `.print-only` 클래스를 이겨
  //   그 머리는 **화면에도 서 있다**(그래서 ADR-188 의 `screen` 소품은 아무 일도 하지 않는다).
  //   그 머리가 이미 «퓨처나우 · 문서 이름 · 대상자 · 회기 · 회차 · 날짜» 를 한 덩어리로 들므로
  //   위에 `ConsoleTitle` 을 또 세우면 한 화면에 같은 이름이 둘이다 — 실제로 그랬다.
  //   **예외를 여기 한 줄로 적어 둔다**(§12.1 — 별도 문서에 두면 다음 사람이 본문만 읽고 판단한다).
  const DOC_ROUTES = ['/coach/cohort/[cohortId]/member/[userId]', '/coach/cohort/[cohortId]/report/[responseId]'];

  it('★★ **탭이 없는 화면은 반드시 이름을 든다** — 무제 화면을 만들지 않는다', () => {
    const nameless: string[] = [];
    for (const r of CONSOLE_ROUTES.filter((r) => !TAB_ROUTES.has(r) && !DOC_ROUTES.includes(r))) {
      const f = pageOf(r);
      expect(existsSync(f), `${f} 가 없다 — 경로 규칙이 깨졌다`).toBe(true);
      if (!drawsTitle(readFileSync(f, 'utf8'))) nameless.push(r);
    }
    expect(nameless, '이 화면들은 이름이 어디에도 없다 — 사용자가 자기 위치를 잃는다').toEqual([]);
  });

  it('**문서 화면은 문서 머리가 이름을 들되 그 이름도 표에서 온다**', () => {
    for (const r of DOC_ROUTES) {
      const src = readFileSync(pageOf(r), 'utf8');
      expect(drawsTitle(src), `${r} — 문서 머리와 본문 제목이 이름을 둘로 만든다`).toBe(false);
      expect(src, `${r} — 문서 이름을 표에서 읽지 않는다`).toContain(`docTitle('${r}')`);
    }
    // ⑦ 그 헬퍼가 실재하고 표를 읽는가 — 없으면 위 두 줄은 문자열만 맞춘 것이 된다.
    const helper = readFileSync('src/app/_screens/console/docTitle.ts', 'utf8');
    expect(helper).toContain('SCREEN_CHROME');
  });

  it('**이름은 표에서만 온다** — 화면이 손으로 적지 않는다', () => {
    const src = readFileSync('src/app/_screens/console/ConsoleTitle.tsx', 'utf8');
    expect(src, '이름을 표에서 읽지 않는다').toContain('SCREEN_CHROME');
    // 표의 title 을 그대로 그린다 — 문자열 리터럴을 제목으로 두면 표와 갈라진다.
    expect(src).toContain('{chrome.title}');
  });

  it('**제목은 자기 폭을 갖지 않는다** — 화면 컨테이너 폭을 따른다(U-6 정렬 결함의 처방)', () => {
    const css = readFileSync('src/app/globals.css', 'utf8');
    const block = css.slice(css.indexOf('.console-title {'));
    const rule = block.slice(0, block.indexOf('}'));
    expect(rule.length, '`.console-title` 규칙을 못 찾았다').toBeGreaterThan(10);
    expect(rule, '제목이 스스로 폭을 잡으면 본문과 다시 어긋난다').not.toContain('max-width');
    expect(rule, '제목이 스스로 가운데 정렬하면 본문과 다시 어긋난다').not.toContain('margin: 0 auto');
  });
});
