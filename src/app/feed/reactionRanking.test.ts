// **불변식 11 재확인** — 반응 합계가 순위로 읽히는 자리가 생기지 않았는가 (5차 소건 2 수용 기준).
//
// 지휘부가 이 확인을 수용 기준에 넣은 이유가 분명하다. 소건 2 는 **합계를 키우는 변경**이다 —
// 한 사람이 넷까지 누를 수 있으니 한 글의 반응 수가 최대 4배가 된다. 수가 커지면
// *"많이 받은 글"* 이 눈에 띄고, 눈에 띄면 정렬하고 싶어지고, 정렬하면 순위가 생긴다.
// 불변식 11 은 **갈무리에 순위를 만들지 않는다**고 못 박았고 피드도 같은 결이다(발주 §3.2).
//
// **주장하지 않고 잰다.** *"정렬에 안 썼다"* 는 문장은 다음 사람이 정렬을 넣는 순간 거짓이 되는데
// 아무도 모른다. 그래서 소스를 읽어 잠근다.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const CLIENT = readFileSync('src/app/feed/FeedClient.tsx', 'utf8');
const STATE = readFileSync('src/app/feed/reactionState.ts', 'utf8');
const MIGRATION = readFileSync('supabase/migrations/20260829090000_feed_reactions_multi.sql', 'utf8');

describe('반응이 순위를 만들지 않는다 (불변식 11)', () => {
  it('화면이 반응 수로 정렬하지 않는다 — `sort` 가 반응 근처에 없다', () => {
    // 피드 정렬은 DB 가 `created_at DESC` 로 준 순서를 그대로 쓴다. 화면에 sort 가 있으면
    // 그 자체로 의심스럽다(무엇으로 정렬하든 목록 순서를 화면이 정하기 시작한 것이다).
    expect(CLIENT).not.toMatch(/\.sort\s*\(/);
    expect(STATE).not.toMatch(/\.sort\s*\(/);
  });

  it('반응 수가 막대·게이지·백분위로 그려지지 않는다', () => {
    for (const forbidden of ['width:', 'p-track', 'p-fill', 'progress', '%`', 'percent']) {
      expect(
        CLIENT.slice(CLIENT.indexOf('FEED_EMOJI.map'), CLIENT.indexOf('CommentToggle')),
        `반응 줄에 ${forbidden} 가 있으면 수가 크기로 읽힌다`,
      ).not.toContain(forbidden);
    }
  });

  it('이모지 순서는 **선언 순서**다 — 수가 순서를 정하지 않는다', () => {
    // `FEED_EMOJI.map` 이 그대로 돌고, 그 사이에 재정렬이 끼어들지 않는다.
    expect(CLIENT).toContain('FEED_EMOJI.map((e) => {');
    const line = CLIENT.slice(CLIENT.indexOf('FEED_EMOJI.map'), CLIENT.indexOf('FEED_EMOJI.map') + 400);
    expect(line).not.toContain('sort');
    expect(line).not.toContain('reactions[a]');
  });

  it('DB 도 반응 수로 정렬하지 않는다 — 목록 ORDER BY 는 시간과 id 뿐이다', () => {
    const orderBys = MIGRATION.match(/ORDER BY[^;)\n]*/g) ?? [];
    expect(orderBys.length, 'ORDER BY 가 있긴 하다(순서를 고정하는 목적)').toBeGreaterThan(0);
    for (const clause of orderBys) {
      // 허용: 글 목록의 시간순 · 내 반응 배열의 **선언 순서**(e.ord).
      expect(clause, `수로 정렬하는 ORDER BY: ${clause}`).not.toMatch(/count|n\b|reactions/i);
      expect(clause).toMatch(/created_at|e\.ord/);
    }
  });

  it('집계는 **표시용 수**일 뿐 정렬키로 나가지 않는다 — 계약이 그렇게 적어 두었다', () => {
    const contract = readFileSync('src/contracts/domain.ts', 'utf8');
    expect(contract).toContain('정렬에 쓰지 않는다');
    expect(contract).toContain('순위를 만들지 않는다');
  });

  it('**합계가 커진 것을 인정하고 적었다** — 바뀐 것을 안 적으면 다음 사람이 못 본다', () => {
    const contract = readFileSync('src/contracts/domain.ts', 'utf8');
    expect(contract).toContain('복수 반응이 열리며 합계가 커질 수 있다');
  });
});
