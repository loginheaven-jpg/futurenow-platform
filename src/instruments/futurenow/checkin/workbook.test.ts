// 워크북 사진 블록(ADR-197) — 문안 쪽 잠금.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getCheckinSession } from './index';
import { WORKBOOK_COACH_VIEW_LABEL, WORKBOOK_TITLE } from './workbook';

const NL = String.fromCharCode(10);
const REGISTERED = Array.from({ length: 12 }, (_, i) => i + 1).filter((n) => getCheckinSession(n) !== null);

/**
 * 주석을 걷은 코드 줄만 — 설명문이 '워크북' 을 인용하는 것은 화면에 뜨지 않는다.
 *   블록 주석(JSX `{/* … *\/}` 포함)을 먼저 통째로 걷고, 줄 끝 주석은 **공백 뒤 `//`** 만 걷는다
 *   (따옴표 안의 `https://` 는 콜론 뒤라 남는다). 처음엔 줄 머리만 봐서 줄 끝 주석을 셌다 — 물려 보고 고쳤다.
 *   따옴표 리터럴만 세지 않는 이유: JSX 텍스트(`<span>…</span>`)는 따옴표가 없다.
 */
function codeLines(path: string): string[] {
  return readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(NL)
    // CRLF 파일이 섞여 있다(session4·5) — `.` 은 `\r` 을 못 넘으므로 먼저 뗀다. 안 떼면 주석이 안 걷힌다(실측).
    .map((l) => l.replace(/\r$/, '').replace(/(^|\s)\/\/.*$/, ''));
}

function sources(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.(ts|tsx)$/.test(f))
    .map((f) => join(dir, f));
}

describe("'워크북' 은 사진 블록 제목 한 자리뿐이다", () => {
  // 갈무리 카드의 금지어였다(초판 근거 「워크북 미배포」). 2026-09-18 결정으로 제목 한 자리만 연다.
  //   회차 문안(session*.ts)·카드 화면에 새로 서면 그것은 결정 밖이다.
  const DIRS = ['src/instruments/futurenow/checkin', 'src/app/(member)/my/cohorts/[cohortId]/checkin/[session]'];

  it('⑦ 잴 대상이 실재한다 — 두 폴더에 소스가 있다', () => {
    for (const d of DIRS) expect(sources(d).length, d).toBeGreaterThan(0);
  });

  it('주석 밖에서 정확히 한 줄이고, 그 줄은 제목 상수다', () => {
    const hits = DIRS.flatMap((d) => sources(d).flatMap((f) => codeLines(f).filter((l) => l.includes('워크북')).map((l) => `${f}: ${l.trim()}`)));
    expect(hits, hits.join(NL)).toHaveLength(1);
    expect(hits[0]).toContain("export const WORKBOOK_TITLE = '오늘 워크북 갈무리';");
  });

  it('제목과 체크 문안이 결정 그대로다', () => {
    expect(WORKBOOK_TITLE).toBe('오늘 워크북 갈무리');
    expect(WORKBOOK_COACH_VIEW_LABEL).toBe('인도자 열람');
  });
});

describe('안내 한 줄은 편지가 있는 회차에만 선다', () => {
  // 편지 칸(letter_line)의 첨부 안내가 맨 위로 옮겨 왔다 — 편지가 없는 회차에 서면 가리킬 것이 없다.
  it('편지 칸이 있는 회차 ⇔ workbook.help 가 있는 회차', () => {
    for (const n of REGISTERED) {
      const c = getCheckinSession(n)!;
      const hasLetter = c.deepen.fields.some((f) => f.key === 'letter_line');
      expect(!!c.workbook?.help, `${n}회차`).toBe(hasLetter);
    }
  });

  it('⑦ 편지가 있는 회차가 실재한다(1·2회차) — 0 이면 위 비교가 공허하다', () => {
    const withHelp = REGISTERED.filter((n) => getCheckinSession(n)!.workbook?.help);
    expect(withHelp).toEqual([1, 2]);
  });

  it('두 회차의 안내가 같은 문장이다 — 한쪽만 고쳐지면 운다', () => {
    const helps = new Set(REGISTERED.map((n) => getCheckinSession(n)!.workbook?.help).filter(Boolean));
    expect([...helps]).toEqual(['종이에 쓴 편지도 여기에 촬영해 첨부하십시오.']);
  });
});

describe('사진은 필수가 아니다', () => {
  it('빈 카드의 결측 목록에 사진 자리가 없다', () => {
    for (const n of REGISTERED) {
      const c = getCheckinSession(n)!;
      expect(c.missingLabels({}), `${n}회차`).not.toContain(WORKBOOK_TITLE);
    }
  });
});
