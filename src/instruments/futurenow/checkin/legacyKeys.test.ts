import { describe, expect, it } from 'vitest';
import { LEGACY_KEYS, withLegacyKeys } from './legacyKeys';
import { CHECKIN_SESSION_6 } from './session6';

// 옛 키 폴백 잠금 — **이미 쓴 답이 사라지지 않는다.**
//
//   지시서 §6 은 「저장된 응답이 0건이다」라 했으나 실측은 달랐다 —
//   6회차 갈무리 행 7 · 제출 1 · 내용 있음 3, 저장된 폐기 키 `top_identity` 2 · `worldview_seen` 2 · `lasting_one` 1.
//   마이그레이션은 하지 않는다(실기수 무접촉). 그래서 **읽을 때만** 옛 키를 끌어온다.
describe('옛 키 폴백', () => {
  it('★★ **옛 키로 저장된 답이 새 키로 읽힌다**', () => {
    const a = withLegacyKeys(6, { lasting_one: '가족과 저녁', top_identity: '나는 …', worldview_seen: '후회' });
    expect(a.carry_today).toBe('가족과 저녁');
    expect(a.hope_statement).toBe('나는 …');
    expect(a.biggest_regret).toBe('후회');
  });

  it('★★ **새 답이 옛 답에 덮이지 않는다** — 새로 쓴 것이 이긴다', () => {
    const a = withLegacyKeys(6, { carry_today: '새 답', lasting_one: '옛 답' });
    expect(a.carry_today, '새로 쓴 답이 옛 답에 덮였다').toBe('새 답');
  });

  it('★ 입력을 고치지 않는다 — 필요할 때만 사본을 만든다', () => {
    const src = { lasting_one: 'x' };
    const out = withLegacyKeys(6, src);
    expect(src, '원본이 바뀌었다').toEqual({ lasting_one: 'x' });
    expect(out).not.toBe(src);
    const same = { carry_today: 'y' };
    expect(withLegacyKeys(6, same), '바꿀 것이 없는데 사본을 만들었다').toBe(same);
  });

  it('★ 다른 회차·빈 값에는 손대지 않는다', () => {
    expect(withLegacyKeys(1, { lasting_one: 'x' })).toEqual({ lasting_one: 'x' });
    expect(withLegacyKeys(6, null)).toEqual({});
    expect(withLegacyKeys(6, undefined)).toEqual({});
  });

  // ⑦ **대상이 실재하는가** — 표가 가리키는 새 키가 실제 문안에 있어야 폴백이 뜻을 갖는다.
  it('★★ **표의 새 키가 6회차 문안에 실재한다** — 오타면 폴백이 헛돈다', () => {
    const live = new Set<string>();
    const t = CHECKIN_SESSION_6.today;
    if (t.question) live.add(t.question.key);
    if (t.identity) live.add(t.identity.key);
    for (const f of t.purpose?.fields ?? []) live.add(f.key);
    for (const to of Object.values(LEGACY_KEYS[6])) {
      expect(live, `폴백이 가리키는 ${to} 가 문안에 없다`).toContain(to);
    }
  });
});
