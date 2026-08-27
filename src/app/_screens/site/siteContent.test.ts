// 원고 §1~§4 정본 대조 (4차 F-2b · 발주 §5 DoD *"글자 수 원고 일치 확인 포함"*).
//
// **사람 눈으로 세지 않는다.** 원고 파일을 다시 읽어 `siteContent.ts` 와 맞대 본다 —
//   그래야 원고가 갱신됐는데 코드가 안 따라간 경우가 **레드로** 드러난다.
//   *"한 글자도 고치지 않는다"* 는 규칙이고, 규칙은 지켜지는지 확인할 수 있어야 규칙이다.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  LEADERS, BOOK_INTRO, AUDIENCE_PARA, AUDIENCE_LIST, GROWF_SUMMARY,
  BOOK_FACTS, BOOK_BUY, MANUSCRIPT_COUNTS,
} from './siteContent';

const SRC = readFileSync('docs/tasks/퓨처나우_홈페이지_콘텐츠_원고_v1.md', 'utf8');

/** 원고에 그 문장이 **그대로** 있는가. 마크다운의 줄끝 공백만 지우고 비교한다. */
const inManuscript = (s: string) => SRC.replace(/[ \t]+$/gm, '').includes(s);

describe('원고 §1~§4 — 한 글자도 고치지 않는다', () => {
  it('인도자 2인의 이름·직함·태그라인·약력·소개문이 원고에 그대로 있다', () => {
    expect(LEADERS).toHaveLength(2);
    for (const l of LEADERS) {
      for (const s of [l.name, l.title, l.tagline, l.intro, ...l.bio]) {
        expect(inManuscript(s), `원고에 없다: ${s.slice(0, 30)}…`).toBe(true);
      }
      expect(l.bio, '약력은 5행이다(원고 §1.2·§2.2)').toHaveLength(5);
    }
  });

  it('도서 소개문 3단락 · 서지 6행 · 구매 링크가 원고 그대로다', () => {
    expect(BOOK_INTRO).toHaveLength(3);
    for (const p of BOOK_INTRO) expect(inManuscript(p)).toBe(true);
    expect(BOOK_FACTS).toHaveLength(6);
    for (const f of BOOK_FACTS) expect(inManuscript(f.v)).toBe(true);
    // 원고 §3.4 — 전달본은 http 였으나 **마크업에는 https 를 쓴다**.
    expect(BOOK_BUY.href.startsWith('https://')).toBe(true);
    expect(BOOK_BUY.href).toContain('product.kyobobook.co.kr/detail/S000220049387');
  });

  it('참여 대상 단락·리스트 5행이 원고 그대로다', () => {
    expect(inManuscript(AUDIENCE_PARA)).toBe(true);
    expect(AUDIENCE_LIST).toHaveLength(5);
    for (const a of AUDIENCE_LIST) expect(inManuscript(a)).toBe(true);
  });

  it('GROW+F 요약 5축이 원고 §3.3 그대로다 — 표를 새로 그리지 않았다', () => {
    expect(GROWF_SUMMARY).toHaveLength(5);
    expect(GROWF_SUMMARY.map((g) => g.letter).join('')).toBe('GROWF');
    for (const g of GROWF_SUMMARY) {
      expect(inManuscript(g.ko), `원고에 없다: ${g.ko}`).toBe(true);
      expect(inManuscript(`${g.en} ${g.short}`)).toBe(true);
    }
  });
});

describe('글자 수 — 원고 표기와 실측', () => {
  // 도서 소개문은 원고가 **단락 구분 2자를 포함해** 센다(344 + 2 = 346).
  const cases: [string, number, number][] = [
    ['이승은 소개문', LEADERS[0].intro.length, MANUSCRIPT_COUNTS.lee],
    ['도서 소개문', BOOK_INTRO.join('').length + 2, MANUSCRIPT_COUNTS.book],
    ['참여 대상 단락', AUDIENCE_PARA.length, MANUSCRIPT_COUNTS.audience],
  ];
  it.each(cases)('%s — 실측이 원고 표기와 같다', (_n, actual, declared) => {
    expect(actual).toBe(declared);
  });

  it('**최철영 소개문만 표기와 다르다 — 문안이 아니라 표기 쪽이다**', () => {
    // 원고 §2.3 제목은 `(250자 · 공백 포함)` 인데 본문 실측은 274 다.
    //   **문안을 줄이지 않았다**(발주 §2 — *"레이아웃에 안 맞으면 문안을 줄이지 말고 목록 보고"*).
    //   이 테스트는 그 차이를 **알고 있는 상태로** 고정한다 — 원고가 정정되면 여기가 레드가 되고,
    //   그때 표기와 실측이 함께 맞는지 다시 본다.
    expect(LEADERS[1].intro.length).toBe(274);
    expect(MANUSCRIPT_COUNTS.choi).toBe(250);
  });
});
