// 6회차 갈무리 잠금(ADR-115~117 · CC_ORDER_checkin_session6 §5 + CC_MEMO_session6_corrections §6).
//
// **마지막 참여자 회차**라 여기서만 처음 서는 것이 셋이다 —
//   다중 되비추기 · 공개 토글 없음 · 90일 기한. 셋 다 이 파일이 잠근다.
import { describe, expect, it } from 'vitest';
import { CHECKIN_SESSION_1 } from './session1';
import { CHECKIN_SESSION_2 } from './session2';
import { CHECKIN_SESSION_3 } from './session3';
import { CHECKIN_SESSION_4 } from './session4';
import { CHECKIN_SESSION_5 } from './session5';
import { CHECKIN_SESSION_6 } from './session6';
import { getCheckinSession } from './index';
import { neededBacks, resolveMirrorSet } from './slots';

const c = CHECKIN_SESSION_6;

describe('6회차 — 등록과 뼈대', () => {
  it('레지스트리가 이 객체를 그대로 돌려준다', () => {
    expect(getCheckinSession(6)).toBe(c);
    expect(getCheckinSession(7)).toBeNull();
  });

  it('1면 순서가 STEP 경계와 맞다', () => {
    expect(c.today.order).toEqual(['question', 'purpose', 'identity', 'mood']);
  });

  it('묶음이 둘이고 mood 는 묶음 밖이다', () => {
    expect(c.today.question?.group).toBe('남는 것을 가리고');
    expect(c.today.purpose?.group).toBe('남는 것을 가리고');
    expect(c.today.identity?.group).toBe('한 층을 얹다');
    // 회차 전체에 대한 물음이라 묶음에 넣지 않는다.
    // ★ **타입이 이미 잠근다** — `group` 을 선언하지 않아 `satisfies` 가 그 속성을 좁혀 냈고,
    //   여기서 `c.today.mood.group` 을 쓰면 **tsc 가 먼저 운다.** 런타임 단언보다 강하다.
    expect('group' in c.today.mood, 'mood 에 묶음이 붙었다').toBe(false);
  });
});

describe('★ 필수 6칸 — 세는 것과 세지 않는 것', () => {
  it('여섯이고, 쌍 문항은 두 칸이 다 차야 한 칸이다', () => {
    expect(c.requiredTotal).toBe(6);
    const full = {
      lasting_one: 'a', top_identity: 'b', mood: ['뭉클함'],
      last_step_result: '했습니다', step_what: 'w', step_when: 'n', self_note: 's',
    };
    expect(c.filledCount(full)).toBe(6);
    // step_when 만 비우면 그 묶음이 통째로 안 세어진다.
    expect(c.filledCount({ ...full, step_when: '' })).toBe(5);
  });

  it('★ `worldview_seen` 과 `step_companion` 을 세지 않는다', () => {
    const keys = JSON.stringify(c.missingKeys({}));
    // 보이는 선택이라 세지 않는다.
    expect(keys).not.toContain('worldview_seen');
    // **이 회차 설계상 가장 지키고 싶은 칸이지만** 이름을 못 대는 참여자가 반드시 있고
    //   그때 제출이 막힌다 — 마지막 회차에서 제출을 막는 대가가 얻는 것보다 크다.
    expect(keys).not.toContain('step_companion');
    expect(keys).not.toContain('love_person');
  });

  it('결측 라벨이 화면 문안과 **문자열 동일**하다(ADR-91)', () => {
    const labels = c.missingLabels({});
    expect(labels).toContain(c.today.question!.label);
    expect(labels).toContain(c.today.identity!.label);
    expect(labels).toContain(c.today.mood.label);
    expect(labels).toContain(c.step.lastStep!.label);
    expect(labels).toContain(c.step.what.label);
    expect(labels).toContain(c.wrap.selfNote.label);
  });
});

describe('★ 다중 되비추기 (ADR-115)', () => {
  it('`neededBacks` 가 다섯 회차를 다 부른다', () => {
    // 빠뜨리면 깊이를 안 불러 **되비추기가 조용히 사라진다.**
    expect(neededBacks(c)).toEqual([1, 2, 3, 4, 5]);
  });

  it('정체성 위 두 줄 — back 과 키가 실물과 맞다', () => {
    const items = c.today.identity!.mirrors!.items;
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ keys: ['identity_sentence'], back: 5 });
    expect(items[1]).toMatchObject({ keys: ['identity_statement'], back: 4 });
    // 캡션이 항목마다 다르므로 묶음 캡션을 두지 않는다(타입이 좁혀 내므로 `in` 으로 본다).
    expect('caption' in c.today.identity!.mirrors!, '정체성 되비추기에 묶음 캡션이 붙었다').toBe(false);
    // ★ 키가 **실제 앞 회차에 있는 것**인지 본다 — 지어낸 키를 부르면 조용히 빈다(계열 ⑦).
    expect(JSON.stringify(CHECKIN_SESSION_1)).toContain('identity_sentence');
    expect(JSON.stringify(CHECKIN_SESSION_2)).toContain('identity_statement');
  });

  it('마지막 한마디 위 다섯 줄 — 캡션 하나에 back 이 5..1', () => {
    const set = c.wrap.selfNote.mirrors!;
    expect(set.caption).toBe('지금까지 나에게 준 말들');
    expect(set.items.map((m) => m.back)).toEqual([5, 4, 3, 2, 1]);
    expect(set.items.every((m) => m.keys[0] === 'self_note')).toBe(true);
    // 1~5회차가 실제로 그 키를 쓴다.
    for (const s of [CHECKIN_SESSION_1, CHECKIN_SESSION_2, CHECKIN_SESSION_3, CHECKIN_SESSION_4, CHECKIN_SESSION_5]) {
      expect(s.wrap.selfNote.key).toBe('self_note');
    }
  });

  it('★ 값이 없으면 상자를 아예 그리지 않는다 — 결손 목록이 되지 않게', () => {
    // `MirrorSet` 항목에는 empty 를 쓰지 않는다. 다섯 줄 중 셋이 비면 빈 문구 셋이 쌓인다.
    expect(resolveMirrorSet(c.wrap.selfNote.mirrors, {})).toBeNull();
    // 일부만 있으면 있는 것만 남는다.
    const partial = resolveMirrorSet(c.wrap.selfNote.mirrors, { 5: { self_note: '첫 줄' }, 3: { self_note: '셋째 줄' } });
    expect(partial?.rows.map((r) => r.label)).toEqual(['1회차', '3회차']);
  });
});

/** 회차 상수는 리터럴로 좁아져 **걷어 낸 칸이 타입에서 사라진다.**
 *   되살아났는지 재려면 넓혀서 봐야 한다 — 없는 것을 재는 잠금의 숙명이다. */
const widen = (x: unknown) => x as { save: { notice2?: string }; step: { share?: object } };

describe('★ 마지막 회차 구조 (ADR-116)', () => {
  it('공개 토글이 없다 — 다음 시간이 없어 띄울 자리가 없다', () => {
    // ★ **「열람 고지는 남는다」를 걷었다**(지휘부 판정 2026-09-02). 전에는 그 짝을 지켰는데
    //   고지 자체가 여섯 회차에서 사라졌다. 마지막 회차는 `share` 가 통째로 없다 —
    //   토글도 고지도 없으므로 빈 구획을 만들 이유가 없다.
    expect(widen(c).step.share, '마지막 회차에 공개 구획이 생겼다').toBeUndefined();
  });

  it('★★ 열람 고지를 **여섯이 함께** 걷었다 — 한 회차만 다른 상황을 만들지 않는다', () => {
    // 전에는 「6회차만 열람 주체를 안 밝히는 유일한 카드가 되면 안 된다」로 여섯을 맞췄다.
    //   이제 **여섯을 다 걷어 다시 맞췄다** — 맞춘다는 규율은 그대로이고 값만 뒤집혔다.
    //   **되살아나면 운다.** 없어서 빠진 것이 아니라 일부러 뺐다.
    for (const raw of [CHECKIN_SESSION_1, CHECKIN_SESSION_2, CHECKIN_SESSION_3,
                       CHECKIN_SESSION_4, CHECKIN_SESSION_5, c]) {
      const s = widen(raw);
      expect(s.save.notice2, '열람 고지가 되살아났다').toBeUndefined();
      expect(Object.keys(s.step.share ?? {}), '공개 고지가 되살아났다').not.toContain('notice');
    }
  });

  it('`notice1` 에 기한이 없다 — 다음 시간이 없기 때문이다', () => {
    expect(c.save.notice1).toBe('언제든 다시 열어 고쳐 쓸 수 있습니다');
    expect(c.save.notice1).not.toContain('다음 시간');
  });

  it('함께 볼 사람 칸이 있고 인도자 상자가 펼쳐진 채로 열린다', () => {
    expect(c.step.companion?.key).toBe('step_companion');
    expect(c.wrap.facilitatorBox.defaultOpen).toBe(true);
    // §2-5 결손 — suggestion 에 help 를 둔다(렌더가 넘긴다).
    expect(c.wrap.facilitatorBox.suggestion.help).toBeTruthy();
  });
});

describe('★ 마음 낱말이 1~5회차와 문자열로 겹치지 않는다', () => {
  it('앞 다섯이 겹침 0건', () => {
    const prior = new Set(
      [CHECKIN_SESSION_1, CHECKIN_SESSION_2, CHECKIN_SESSION_3, CHECKIN_SESSION_4, CHECKIN_SESSION_5]
        .flatMap((s) => s.today.mood.options.slice(0, 5)),
    );
    const mine = c.today.mood.options.slice(0, 5);
    const dup = mine.filter((w) => prior.has(w));
    expect(dup, `겹치는 낱말: ${dup.join(', ')}`).toEqual([]);
    // 여섯째(목록 한계 낱말)는 회차 공통이라 세지 않는다.
    expect(c.today.mood.exclusive).toBe('딱 맞는 말이 없음');
  });
});

describe('★ 문항 교체가 되돌아가지 않는다 (CC_MEMO §4)', () => {
  it('문항 1 이 **활동을 지목한다**', () => {
    // 원안은 워크북 어느 칸인지 카드만 봐서는 몰랐다.
    expect(c.today.question!.label).toContain('오늘 남은 시간을 헤아려 보고');
    expect(c.today.question!.label, '원안이 되살아났다').not.toContain('마지막까지 남는다고');
  });

  it('문항 2 가 **강의 구조를 걷어냈다** — 보조 문구 없음 · 선택 표기 있음', () => {
    const f = c.today.purpose!.fields[0];
    expect(f.label).toContain('만약 3일 후에 죽음 앞에 선다면');
    // 현장 칠판을 전제한 문장이었다. 카드에는 그 그림이 없다.
    expect(f.label, '원안이 되살아났다').not.toContain('두 세계관');
    // ★ 무거운 질문에 안심 문구를 달면 "이건 무거운 질문입니다"라고 알리는 꼴이 되어 방어를 부른다.
    expect('help' in f, '보조 문구가 붙었다').toBe(false);
    // 답하기 어려운 사람에게 침묵할 권리를 남긴다.
    expect(c.today.purpose!.badge).toBe('선택');
  });
});

describe('나눔 후보 열 — 제3자 이름을 올리지 않는다', () => {
  it('`love_person` 과 `step_companion` 이 없다', () => {
    const keys = c.summaryFields.map((f) => ('key' in f ? f.key : ''));
    expect(keys).not.toContain('love_person');
    expect(keys).not.toContain('step_companion');
    // 선택 칸이라 비는 자리가 있으나 **비어 있을 가능성은 배제 사유가 아니다**(ADR-99).
    expect(keys).toContain('worldview_seen');
  });
});
