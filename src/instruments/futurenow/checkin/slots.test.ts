import { describe, expect, it } from 'vitest';
import { CHECKIN_SESSION_1 } from './session1';
import { CHECKIN_SESSION_2 } from './session2';
import { CHECKIN_SESSION_3 } from './session3';
import type { SlotName } from './index';
import { groupBoundary, orderedSlots, resolveMirror, slotBoundaries } from './slots';

// SlotName 이 늘면 이 리터럴이 즉시 컴파일 에러가 난다(누락 속성).
//   카드·readModel 의 never 가드와 함께 두면 슬롯 추가 시 세 곳이 동시에 빨개진다.
const ALL_SLOTS: Record<SlotName, true> = {
  pairText: true, areaPick: true, purpose: true, question: true, identity: true, mood: true,
};

describe('resolveMirror — keys[0] 이 앵커다(ADR-85 현행 렌더 보존)', () => {
  const M = CHECKIN_SESSION_2.step.lastStep.mirror;

  it('둘 다 있으면 " · " 로 잇는다', () => {
    expect(resolveMirror(M, { step_what: '편지 다시 읽기', step_when: '토요일 아침' }))
      .toEqual({ kind: 'value', label: M.label, value: '편지 다시 읽기 · 토요일 아침' });
  });

  it('앵커만 있으면 앵커만', () => {
    expect(resolveMirror(M, { step_what: '편지 다시 읽기' }))
      .toEqual({ kind: 'value', label: M.label, value: '편지 다시 읽기' });
  });

  // 이 셋이 회귀의 핵심 — 앵커가 비면 뒤 값이 있어도 되비추지 않는다.
  //   '무엇을' 없이 '언제·어디서'만 되비추면 한 걸음이 아니라 시점만 남아 문장이 되지 않는다.
  it('앵커가 비고 뒤 키만 있으면 empty 문구', () => {
    expect(resolveMirror(M, { step_what: '', step_when: '토요일 아침, 집 앞 카페에서' }))
      .toEqual({ kind: 'empty', text: M.empty });
  });
  it('앵커가 공백뿐이어도 empty 문구', () => {
    expect(resolveMirror(M, { step_what: '   ', step_when: '토요일 아침' }))
      .toEqual({ kind: 'empty', text: M.empty });
  });
  it('앵커 키가 아예 없어도 empty 문구', () => {
    expect(resolveMirror(M, { step_when: '토요일 아침' })).toEqual({ kind: 'empty', text: M.empty });
  });

  it('prior 자체가 없으면 empty 문구', () => {
    expect(resolveMirror(M, null)).toEqual({ kind: 'empty', text: M.empty });
  });

  it('empty 가 없는 되비추기는 값이 없으면 아무것도 그리지 않는다(2회차 ②)', () => {
    const identity = CHECKIN_SESSION_2.today.identity.mirror;
    expect(resolveMirror(identity, null)).toBeNull();
    expect(resolveMirror(identity, { identity_sentence: '나는 …' }))
      .toEqual({ kind: 'value', label: identity.label, value: '나는 …' });
  });

  it('출력은 원문 그대로다 — 존재 판정에만 trim 한다', () => {
    expect(resolveMirror(M, { step_what: ' 걷기 ' })).toEqual({ kind: 'value', label: M.label, value: ' 걷기 ' });
  });

  it('mirror 가 없으면 null', () => {
    expect(resolveMirror(undefined, {})).toBeNull();
  });
});

describe('슬롯 망라성', () => {
  it('SlotName 전체가 잠겨 있다', () => {
    expect(Object.keys(ALL_SLOTS).sort()).toEqual(['areaPick', 'identity', 'mood', 'pairText', 'purpose', 'question']);
  });
});

describe('groupBoundary — 네 전이를 한 규칙이 덮는다(지휘부 확정 2026-08-03)', () => {
  it('없음 → A : hairline + 캡션', () => {
    expect(groupBoundary('A', undefined, false)).toEqual({ line: true, caption: 'A' });
  });
  it('A → A : 아무것도 없음', () => {
    expect(groupBoundary('A', 'A', false)).toBeNull();
  });
  it('A → B : hairline + 캡션', () => {
    expect(groupBoundary('B', 'A', false)).toEqual({ line: true, caption: 'B' });
  });
  it('A → 없음 : hairline 만 — 묶음이 닫힌다(캡션 없음)', () => {
    expect(groupBoundary(undefined, 'A', false)).toEqual({ line: true });
  });
  it('없음 → 없음 : 아무것도 없음', () => {
    expect(groupBoundary(undefined, undefined, false)).toBeNull();
  });
  it('면의 첫 블록이면 hairline 을 생략하고 캡션만', () => {
    expect(groupBoundary('A', undefined, true)).toEqual({ line: false, caption: 'A' });
  });
});

describe('orderedSlots — order 가 화면 순서다', () => {
  it('1회차: 갈망 쌍 → 존재가치 → 마음', () => {
    expect(orderedSlots(CHECKIN_SESSION_1).map((s) => s.name)).toEqual(['pairText', 'identity', 'mood']);
  });
  it('2회차: 영역 → 목적 세 질문 → 인생의 한 문장 → 마음', () => {
    expect(orderedSlots(CHECKIN_SESSION_2).map((s) => s.name)).toEqual(['areaPick', 'purpose', 'identity', 'mood']);
  });
  it('3회차: 영역 → 오늘의 질문 → 습관 짝 → 마음 (2회차와 순서가 다르다)', () => {
    expect(orderedSlots(CHECKIN_SESSION_3).map((s) => s.name)).toEqual(['areaPick', 'question', 'pairText', 'mood']);
  });
  it('order 에 없는 슬롯은 그리지 않는다 — 3회차에는 identity 가 없다', () => {
    expect(orderedSlots(CHECKIN_SESSION_3).map((s) => s.name)).not.toContain('identity');
    expect(CHECKIN_SESSION_3.today).not.toHaveProperty('identity');
  });
});

describe('1·2회차 회귀 — 신규 hairline 0건', () => {
  it('1회차 1면 경계 전부 null', () => {
    expect(slotBoundaries(CHECKIN_SESSION_1)).toEqual([null, null, null]);
  });
  it('2회차 1면 경계 전부 null', () => {
    expect(slotBoundaries(CHECKIN_SESSION_2)).toEqual([null, null, null, null]);
  });
  it('단일 STEP 회차는 group 값이 하나도 없다', () => {
    for (const c of [CHECKIN_SESSION_1, CHECKIN_SESSION_2]) {
      for (const s of orderedSlots(c)) expect(s.block.group).toBeUndefined();
    }
  });
});

describe('3회차 이중 STEP — 경계가 세 지점에 그려진다', () => {
  it('캡션만 → 없음 → 선+캡션 → 선만', () => {
    const b = slotBoundaries(CHECKIN_SESSION_3);
    expect(b[0]).toEqual({ line: false, caption: CHECKIN_SESSION_3.today.areaPick.group }); // 면 첫 블록
    expect(b[1]).toBeNull();                                                                 // 같은 묶음
    expect(b[2]).toEqual({ line: true, caption: CHECKIN_SESSION_3.today.pairText.group });   // 묶음 전환
    expect(b[3]).toEqual({ line: true });                                                    // 묶음 밖 — 선만
  });

  it('마음은 묶음 밖이다 — 회차 전체에 대한 물음이 습관에 딸리면 안 된다', () => {
    const mood = orderedSlots(CHECKIN_SESSION_3).find((s) => s.name === 'mood');
    expect(mood?.block.group).toBeUndefined();
  });


  it('자기개시가 깊은 선택 문항은 나눔 후보에 넣지 않는다(ADR-86 self_note 판단과 같은 계열)', () => {
    const keys = CHECKIN_SESSION_3.summaryFields.flatMap((f) => Object.values(f));
    expect(keys).not.toContain('stuck_named');
    expect(keys).not.toContain('identity_gap');
    expect(keys).not.toContain('self_note');
  });
});
