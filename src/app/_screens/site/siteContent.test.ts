// 원고 §1~§4 정본 대조 (4차 F-2b · 발주 §5 DoD *"글자 수 원고 일치 확인 포함"*).
//
// **사람 눈으로 세지 않는다.** 원고 파일을 다시 읽어 `siteContent.ts` 와 맞대 본다 —
//   그래야 원고가 갱신됐는데 코드가 안 따라간 경우가 **레드로** 드러난다.
//   *"한 글자도 고치지 않는다"* 는 규칙이고, 규칙은 지켜지는지 확인할 수 있어야 규칙이다.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  LEADERS, BOOK_INTRO, AUDIENCE_PARA, AUDIENCE_PARA_SCREEN, AUDIENCE_LIST, GROWF_SUMMARY,
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

describe('★★ 화면 몫 — 목록과 겹치는 앞부분을 걷었다 (ADR-184)', () => {
  it('★ **원고는 안 고쳤다** — 정본 단락이 원문 그대로 남아 있다', () => {
    // 걷은 것은 «화면에 무엇을 내보내는가» 지 «원고가 무엇인가» 가 아니다.
    expect(inManuscript(AUDIENCE_PARA), '원고와 어긋났다').toBe(true);
  });

  it('★★ 화면 몫은 **잘라 낸 것**이지 손으로 적은 것이 아니다', () => {
    // 손으로 적으면 원고가 바뀌는 날 둘이 갈라진다(§11 ⑴).
    expect(AUDIENCE_PARA.endsWith(AUDIENCE_PARA_SCREEN), '원고 단락의 꼬리가 아니다').toBe(true);
    expect(AUDIENCE_PARA_SCREEN.length, '아무것도 안 걷었다').toBeLessThan(AUDIENCE_PARA.length);
  });

  it('★★ 걷힌 것이 **목록이 이미 말한 그 넷**이다 — 지시가 가리킨 자리', () => {
    const cut = AUDIENCE_PARA.slice(0, AUDIENCE_PARA.length - AUDIENCE_PARA_SCREEN.length);
    // 대상을 세는 문장은 전부 「…분.」 으로 끝난다. 걷힌 쪽에만 있어야 한다.
    expect(cut.split('분.').length - 1, '걷힌 문장이 넷이 아니다').toBe(4);
    expect(AUDIENCE_PARA_SCREEN.includes('분.'), '대상 문장이 화면에 남았다').toBe(false);
    // 남은 셋은 **거기에만 있는 문안**이다 — 목록으로 갈아타면 사라진다(ADR-172 의 판단 그대로).
    for (const keep of ['퓨처나우는 답을 건네는 자리가 아니라', '여섯 번의 만남 동안', '미래가 선명해지면']) {
      expect(AUDIENCE_PARA_SCREEN, `버리면 안 되는 문장이 사라졌다: ${keep}`).toContain(keep);
    }
  });

  it('★ 표지를 못 찾으면 **전문을 쓴다** — 조용히 한 글자만 남지 않는다', () => {
    // `indexOf` 가 -1 이면 `slice(-1)` 은 마지막 한 글자다. 그 사고를 막는 갈래가 실재하는가(계열 ⑦).
    const src = readFileSync('src/app/_screens/site/siteContent.ts', 'utf8');
    expect(src, '표지 부재를 안 가른다').toContain('AUDIENCE_PARA.includes(AUDIENCE_TAIL_MARK)');
    expect(AUDIENCE_PARA_SCREEN.length, '한 글자만 남았다').toBeGreaterThan(50);
  });

  it('★★ 화면이 **원고 전문이 아니라 화면 몫**을 쓴다', () => {
    const about = readFileSync('src/app/(public)/about/page.tsx', 'utf8');
    expect(about, '화면이 아직 전문을 그린다').toContain('{AUDIENCE_PARA_SCREEN}');
    expect(about, '전문을 그리는 자리가 남았다').not.toContain('{AUDIENCE_PARA}');
  });
});
