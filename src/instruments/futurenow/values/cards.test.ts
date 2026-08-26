import { describe, expect, it } from 'vitest';
import { CARD_BY_ID, CARD_CATEGORY, CARD_SET_VERSION, VALUE_CARDS } from './cards';

// 원본 저장소가 잠그던 보장을 승계한다(원본 `server/valuesData.test.ts` · `docs/01-ARCHITECTURE.md` §4.1).
//   원본 문서: "데이터 id를 재번호화하면 저장된 진행 상태와 성찰 질문, 과거 브라우저 데이터의 참조가
//   깨질 수 있으므로 기존 id는 유지해야 한다." 우리 쪽에서는 `candidates`·`value*_id` 가 정수 id 라
//   재번호화가 곧 과거 결과의 오독이 된다 — 그래서 여기서 못 박는다.
describe('가치 카드 데이터 — 원본 정본과 동일함을 잠근다', () => {
  it('72장이고 id 가 1..72 연속이다', () => {
    expect(VALUE_CARDS).toHaveLength(72);
    expect(VALUE_CARDS.map((c) => c.id)).toEqual(Array.from({ length: 72 }, (_, i) => i + 1));
  });

  // 원본에 id 73('나만의 가치 추가하기' 플레이스홀더)이 있었고 제거됐다. 코드에는 사문 분기가 남아 있었다
  //   (원본 `Sort.tsx` · `docs/06-BACKLOG` §2.1). v3 §11 #8 이 삭제를 지시했으므로 부재를 단언한다.
  it('id 73 은 없다 — 사문 커스텀 카드 잔재', () => {
    expect(CARD_BY_ID.has(73)).toBe(false);
  });

  it('한글명이 중복되지 않는다 — 최종 3개 표시·라벨 대체가 이름으로 이뤄진다', () => {
    const names = VALUE_CARDS.map((c) => c.korean);
    expect(new Set(names).size).toBe(names.length);
  });

  it('빈 필드가 없다', () => {
    for (const c of VALUE_CARDS) {
      expect(c.korean.trim(), `id ${c.id}`).not.toBe('');
      expect(c.english.trim(), `id ${c.id}`).not.toBe('');
      expect(c.description.trim(), `id ${c.id}`).not.toBe('');
    }
  });

  it('CARD_BY_ID 가 전수를 덮는다', () => {
    expect(CARD_BY_ID.size).toBe(72);
    for (const c of VALUE_CARDS) expect(CARD_BY_ID.get(c.id)).toBe(c);
  });

  it('판본은 카드 상수가 정한다(스키마 DEFAULT 아님)', () => {
    expect(CARD_SET_VERSION).toBe('v1');
  });
});

// **카테고리 비노출의 구조적 보장**(v3 §4-1 · §11 #9).
//   렌더 금지를 규칙으로 두면 지켜지는지 매번 사람이 봐야 한다. 타입에서 빼면 화면이 참조할 경로가 없다.
describe('카테고리는 참여자 렌더 타입 밖에 있다', () => {
  it('ValueCard 객체에 category 키가 없다', () => {
    for (const c of VALUE_CARDS) {
      expect(Object.keys(c), `id ${c.id}`).toEqual(['id', 'korean', 'english', 'description']);
    }
  });

  it('카테고리 맵은 별도로 전수를 덮는다 — 18종', () => {
    for (const c of VALUE_CARDS) expect(CARD_CATEGORY[c.id], `id ${c.id}`).toBeTruthy();
    expect(new Set(Object.values(CARD_CATEGORY)).size).toBe(18);
  });
});

// 카드 문구는 참여자 표면이다. v3 §14 가 "임의 수정하지 않는다"고 했으므로 **고칠 수 없는 대신**
//   규범을 통과함을 잠근다 — 통과하지 못하는 날이 오면 그때는 지휘부 결정 사안이 된다.
//   목록의 출처: `futurenow_copy_principles.md` §1 축1·§4 · 회차 갈무리 잠금 테스트(session*.test.ts).
describe('카드 72장 문안이 참여자 표면 규범을 통과한다', () => {
  const 전문 = VALUE_CARDS.map((c) => `${c.korean} ${c.description}`).join('\n');

  it('금지어 0건', () => {
    for (const w of ['설문', '진단', '지각', '미제출', '워크북', '평가', '점수', '함정']) {
      expect(전문.includes(w), w).toBe(false);
    }
  });

  it('허락 어휘 0건', () => {
    for (const w of ['하셔도 됩니다', '않으셔도 됩니다', '괜찮습니다', '아니어도 됩니다', '충분합니다', '충분해요']) {
      expect(전문.includes(w), w).toBe(false);
    }
  });

  it('압박 어휘 0건', () => {
    for (const w of ['반드시', '절대', '놓치지']) {
      expect(전문.includes(w), w).toBe(false);
    }
  });
});
