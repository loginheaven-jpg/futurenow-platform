// `/recruit` 카드 그리드 규율 (4차 F-4 후속 · 지휘부 판정).
//
// 화면을 띄우지 않고 **소스와 목록**으로 잠근다 — 지키는 것이 배치가 아니라 **결정**이기 때문이다.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RECRUIT_CARDS } from './cards';

const css = readFileSync('src/app/(public)/recruit/recruit.css', 'utf8');
const page = readFileSync('src/app/(public)/recruit/page.tsx', 'utf8');

describe('/recruit 카드 그리드', () => {
  it('**선정 넷과 순서가 고정이다** — 문제(2) → 문제(3) → 답(6) → 증언(7)', () => {
    // *"문제에서 답, 증언으로 가는 흐름이 순서에 실려 있다"*(지휘부).
    expect(RECRUIT_CARDS.map((c) => c.n)).toEqual([2, 3, 6, 7]);
  });

  it('**화면이 다시 정렬하지 않는다** — 배열 그대로 그린다', () => {
    expect(page).toContain('RECRUIT_CARDS.map(');
    for (const bad of ['.sort(', '.reverse(', '.filter(']) {
      expect(page.slice(page.indexOf('rc-cards')).includes(bad), bad).toBe(false);
    }
  });

  it('**alt 는 내용 한 줄이다** — 이미지 속 글자를 스크린리더가 못 읽는다', () => {
    for (const c of RECRUIT_CARDS) {
      expect(c.alt.length, `카드 ${c.n} alt 가 너무 짧다`).toBeGreaterThan(20);
      expect(c.alt, `카드 ${c.n}`).not.toMatch(/^(카드|이미지|사진)/); // 장식어로 시작하지 않는다
    }
  });

  it('**lg 미만에서 통째로 숨는다** — 모바일 모집 흐름에 카드가 끼어들지 않는다', () => {
    expect(css).toMatch(/\.rc-cards\s*\{\s*display:\s*none;?\s*\}/);
    // 노출은 lg(1024) 안에서만 켜진다.
    const lg = css.slice(css.indexOf('@media (min-width: 1024px)'));
    expect(lg).toContain('.rc-cards');
    expect(lg).toContain('grid-template-columns: repeat(2');
  });

  it('**새 위젯을 두지 않는다** — 정적 img 다(캐러셀·라이트박스 금지)', () => {
    const block = page.slice(page.indexOf('rc-cards'), page.indexOf('rc-sticky'));
    expect(block).toContain('<img');
    for (const bad of ['onClick', 'useState', 'carousel', 'lightbox', 'dialog']) {
      expect(block.toLowerCase().includes(bad.toLowerCase()), bad).toBe(false);
    }
  });

  it('파생물만 서빙한다 — 원본 PNG 경로를 화면이 가리키지 않는다', () => {
    for (const c of RECRUIT_CARDS) {
      expect(c.src).toMatch(/^\/recruit\/card-\d\d\.webp$/);
      expect(c.src).not.toContain('docs/');
    }
  });
});
