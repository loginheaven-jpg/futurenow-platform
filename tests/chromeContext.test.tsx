import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { allScreenFiles, stripComments } from '../scripts/shellAudit.mjs';

// 크롬 통로 잠금 — **`subtitle` 은 아무도 쓰지 않는다** (U-5 가 실제로 지었다).
//
// ─────────────────────────────────────────────────────────────────────────────
// ★ **이 파일은 U-5 이전까지 존재하지 않았다.**
//   `src/app/_screens/shell/chromeContext.tsx:21` 이 *「`tests/chromeContext.test.tsx` 가
//   아무도 쓰지 않음을 잠근다」* 라고 적고 있었는데, `git log --all -- '**/chromeContext.test.tsx'`
//   가 **빈 출력**이었다 — 한 번도 커밋된 적이 없다.
//
//   §11 「초록은 대상이 실재한다는 증거가 아니다」의 **한 층 아래**다:
//   앞의 것은 *잰 대상이 없었다* 이고, 여기서는 **초록조차 없이 문장만** 있었다.
//   U-5 가 회기 띠를 설계하며 그 문장을 근거로 삼을 뻔했고(«잠겨 있으니 못 쓴다»),
//   **없는 제약에 설계를 맞출 뻔한 것**이 이 파일을 짓게 한 이유다.
//
// **잠그는 것은 무엇인가.** 최박사 결재 2026-09-01 — *「`subtitle` 은 표가 들지 않고 본문이
//   든다. 차수 이름·비교 문구는 서버 데이터라 라우트의 성질이 아니다.」*
//   통로 타입에 `subtitle` 칸이 **있다**(설계의 증거로 남겼다). 그래서 막을 것은
//   *칸의 존재*가 아니라 **화면이 그 칸에 값을 얹는 일**이다.
//
// **⑬ 「있는가」로 묻지 않는다.** `subtitle` 이라는 낱말은 통로 정의·`AppHeader` 소품·
//   회원/공개 껍데기의 통과 배선에 **정상적으로 있다.** 낱말을 세면 그 넷이 걸린다.
//   그래서 **`useSetChrome(...)` 호출의 인자만** 본다 — 값을 얹는 자리가 거기뿐이다.
//
// ★★ **창을 결재의 대상에 맞춘다 — 인도자 화면(`src/app/coach`·`src/app/admin`)이다.**
//   처음엔 저장소 전체로 걸었고 **곧바로 붉어졌다**: `/join` 이 단계 부제를 이 칸으로 넘긴다.
//   결재문이 든 것은 *「차수 이름·비교 문구」* 였지 `/join` 단계 문안이 아니다 —
//   **넓은 창이 결재보다 넓은 것을 막고 있었다**(⑨-b 「창이 넓다」의 형태).
//   `/join` 은 아래에서 **대조군**으로 쓴다 — 자가 실물에서 실제로 무는지를 그것이 증명한다.
// ─────────────────────────────────────────────────────────────────────────────

/** `useSetChrome(` 부터 괄호가 닫힐 때까지의 인자 원문. 주석은 걷어내고 센다. */
export function setChromeArgs(src: string): string[] {
  const clean = stripComments(src);
  const out: string[] = [];
  const NEEDLE = 'useSetChrome(';
  for (let i = clean.indexOf(NEEDLE); i !== -1; i = clean.indexOf(NEEDLE, i + 1)) {
    let depth = 0;
    let j = i + NEEDLE.length - 1;
    for (; j < clean.length; j++) {
      if (clean[j] === '(') depth++;
      else if (clean[j] === ')') {
        depth--;
        if (depth === 0) break;
      }
    }
    out.push(clean.slice(i + NEEDLE.length, j));
  }
  return out;
}

/** 인자 안에서 `subtitle` **키에 값을 얹는가**. 문자열 안의 낱말은 세지 않는다. */
export function assignsSubtitle(args: string): boolean {
  return /(^|[\s{,])subtitle\s*:/.test(args);
}

describe('크롬 통로 — `subtitle` 은 자리만 있고 쓰지 않는다', () => {
  // ⑪ **잠금은 물려 봐야 잠금이다** — 막아야 할 것을 일부러 먹인다.
  it('**자가 문다** — 값을 얹는 호출을 심으면 잡힌다', () => {
    const bad = "useSetChrome({ title: '갈무리 격자', subtitle: cohort.name });";
    expect(setChromeArgs(bad)).toHaveLength(1);
    expect(assignsSubtitle(setChromeArgs(bad)[0]), '심은 변이를 자가 놓쳤다').toBe(true);
  });

  it('**자가 헛물켜지 않는다** — 주석·문자열·정의는 잡지 않는다', () => {
    expect(assignsSubtitle("{ title: '내 자리' }")).toBe(false);
    // 낱말이 문자열 안에 있을 뿐인 경우
    expect(assignsSubtitle("{ title: 'subtitle 이라는 낱말' }")).toBe(false);
    // 주석 줄은 `stripComments` 가 걷는다
    expect(setChromeArgs("// useSetChrome({ subtitle: 'x' })")).toEqual([]);
    // 타입 정의(`subtitle?: string`)는 호출이 아니라 아예 창에 들어오지 않는다
    expect(setChromeArgs('export interface ChromeOverride { subtitle?: string; }')).toEqual([]);
  });

  // ⑦ **대상이 실재하는가** — 호출이 0건이면 초록은 «막았다» 가 아니라 «잴 것이 없었다» 다.
  it('**잴 것이 있다** — 통로를 쓰는 화면이 실제로 있다', () => {
    const found = allScreenFiles().flatMap((f: string) => setChromeArgs(readFileSync(f, 'utf8')));
    expect(found.length, '`useSetChrome` 호출이 0건이다 — 이 파일의 초록은 아무 말도 하지 않는다').toBeGreaterThan(0);
  });

  // ⑧ **자가 실물에서 무는가** — 합성 문자열이 아니라 **저장소 안의 실제 할당**을 잡아 보인다.
  //   이것이 초록이면 아래 「인도자 화면에 0건」은 «못 잡는다» 가 아니라 «없다» 라는 뜻이 된다.
  it('**실물에서 문다** — `/join` 은 실제로 부제를 얹는다(대조군)', () => {
    const assigners = allScreenFiles().filter((f: string) =>
      setChromeArgs(readFileSync(f, 'utf8')).some(assignsSubtitle),
    );
    expect(assigners.some((f: string) => f.includes('join')), '자가 실물 할당을 못 잡는다 — 창이 죽었다').toBe(true);
  });

  it('**인도자 화면은 `subtitle` 을 얹지 않는다**(최박사 결재 2026-09-01)', () => {
    const offenders = allScreenFiles()
      .filter((f: string) => /src[\/]app[\/](coach|admin)[\/]/.test(f))
      .filter((f: string) => setChromeArgs(readFileSync(f, 'utf8')).some(assignsSubtitle));
    expect(offenders, '인도자 부제는 **본문 첫 줄**이 든다 — 헤더로 되돌리려면 최박사 재가가 먼저다').toEqual([]);
  });
});
