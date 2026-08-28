// **순서 위반을 시끄럽게 만든다** — 마이그레이션이 코드보다 늦게 갈 때 (5차 소건 2 · 지휘부 지적).
//
// 지휘부가 잡은 위험: *"코드는 배열을 기대하는데 DB 는 단일이므로 이 상태로 병합·배포하면
// 피드가 깨진다. 1기 졸업생도 피드를 쓰므로 실사용자가 있다."*
//
// **실측해 보니 깨지지 않는다 — 그래서 더 나쁘다.** 넷 중 셋은 멀쩡해 보이고 `❤️` 하나만
// 쓰레기 키가 된다(아래 첫 describe 가 그 계산을 그대로 재현한다). 눈으로 잡히지 않는 실패다.
//
// 순서는 지휘부가 못 박았다(적용 → 검증 → 보고 → 확인 → 병합 → 배포).
// 이 가드는 **그 순서가 지켜지지 않았을 때만** 발화하며, 조용히 틀리는 대신 멈춘다.
import { describe, expect, it } from 'vitest';
import { applyReaction } from '@/app/(member)/feed/reactionState';
import type { FeedEmoji } from '@/contracts/domain';

describe('왜 가드가 필요한가 — 옛 스키마에서 조용히 틀리는 모양', () => {
  // 옛 RPC 는 문자열 하나를 준다. 집합 연산이 문자열을 **코드포인트로 쪼갠다.**
  const asIfString = (s: string) => applyReaction({}, [], s as unknown as FeedEmoji[]);

  it('배열이면 맞는다', () => {
    expect(applyReaction({}, [], ['❤️'])).toEqual({ '❤️': 1 });
  });

  it('**문자열이면 `❤️` 가 두 칸으로 쪼개진다** — 이것이 조용한 오염이다', () => {
    const out = asIfString('❤️');
    expect(out).not.toEqual({ '❤️': 1 });
    expect(Object.keys(out)).toHaveLength(2); // '❤' + 변이선택자
  });

  it('**`👏` 는 멀쩡해 보인다** — 넷 중 셋이 맞아서 눈으로 잡히지 않는다', () => {
    expect(asIfString('👏')).toEqual({ '👏': 1 });
  });
});

// 가드 자체는 `context.ts` 안의 파일-지역 함수라 직접 부르지 않는다.
// **모양 판정만** 여기서 전수로 잰다 — 같은 조건식을 두 곳에 적지 않기 위해 조건을 여기 옮겨 적고
// 소스에 그 문장이 실제로 있는지 확인한다(사본 둘 방지 · 불변식 23).
import { readFileSync } from 'node:fs';

describe('가드의 발화 조건 — 좁게 잡는다', () => {
  const SRC = readFileSync('src/core/context.ts', 'utf8');

  it('옛 스키마의 **정확한 모양**에서만 발화한다', () => {
    expect(SRC).toContain("!('my_reactions' in row) && 'my_reaction' in row");
  });

  it('목록과 토글 **양쪽**에 걸려 있다 — 한쪽만 막으면 다른 쪽으로 새 값이 들어온다', () => {
    expect(SRC).toContain('assertMultiReactionSchema(r);');
    expect(SRC).toContain('if (data !== null && !Array.isArray(data)) throw new CoreError(MULTI_REACTION_MIGRATION_MSG);');
  });

  it('문구가 **무엇을 해야 하는지** 말한다 — 사용자에게 보이는 문장이다', () => {
    expect(SRC).toContain('마이그레이션 20260829090000 미적용');
    expect(SRC).toContain('조용히 틀린 값을 보이지 않기 위해 멈췄습니다');
  });

  it('마이그레이션 파일명이 실제로 있다 — 문구가 없는 파일을 가리키면 안내가 거짓이 된다', () => {
    expect(() =>
      readFileSync('supabase/migrations/20260829090000_feed_reactions_multi.sql', 'utf8'),
    ).not.toThrow();
  });
});
