import { describe, expect, it } from 'vitest';
import { CHECKIN_SESSION_1 } from './session1';
import { CHECKIN_SESSION_2 } from './session2';
import { CHECKIN_SESSION_3 } from './session3';
import type { SlotName } from './index';
import { groupBoundary, neededBacks, orderedSlots, priorSessionNos, resolveMirror, slotBoundaries } from './slots';

// SlotName 이 늘면 이 리터럴이 즉시 컴파일 에러가 난다(누락 속성).
//   카드·readModel 의 never 가드와 함께 두면 슬롯 추가 시 세 곳이 동시에 빨개진다.
const ALL_SLOTS: Record<SlotName, true> = {
  pairText: true, areaPick: true, purpose: true, question: true, identity: true, mood: true,
};

describe('resolveMirror — keys[0] 이 앵커다(ADR-85 현행 렌더 보존)', () => {
  const M = CHECKIN_SESSION_2.step.lastStep.mirror;

  it('둘 다 있으면 " · " 로 잇는다', () => {
    expect(resolveMirror(M, { 1: { step_what: '편지 다시 읽기', step_when: '토요일 아침' } }))
      .toEqual({ kind: 'value', label: M.label, value: '편지 다시 읽기 · 토요일 아침' });
  });

  it('앵커만 있으면 앵커만', () => {
    expect(resolveMirror(M, { 1: { step_what: '편지 다시 읽기' } }))
      .toEqual({ kind: 'value', label: M.label, value: '편지 다시 읽기' });
  });

  // 이 셋이 회귀의 핵심 — 앵커가 비면 뒤 값이 있어도 되비추지 않는다.
  //   '무엇을' 없이 '언제·어디서'만 되비추면 한 걸음이 아니라 시점만 남아 문장이 되지 않는다.
  it('앵커가 비고 뒤 키만 있으면 empty 문구', () => {
    expect(resolveMirror(M, { 1: { step_what: '', step_when: '토요일 아침, 집 앞 카페에서' } }))
      .toEqual({ kind: 'empty', text: M.empty });
  });
  it('앵커가 공백뿐이어도 empty 문구', () => {
    expect(resolveMirror(M, { 1: { step_what: '   ', step_when: '토요일 아침' } }))
      .toEqual({ kind: 'empty', text: M.empty });
  });
  it('앵커 키가 아예 없어도 empty 문구', () => {
    expect(resolveMirror(M, { 1: { step_when: '토요일 아침' } })).toEqual({ kind: 'empty', text: M.empty });
  });

  it('그 깊이의 봉투가 없으면 empty 문구', () => {
    expect(resolveMirror(M, { 1: null })).toEqual({ kind: 'empty', text: M.empty });
  });

  it('empty 가 없는 되비추기는 값이 없으면 아무것도 그리지 않는다(2회차 ②)', () => {
    const identity = CHECKIN_SESSION_2.today.identity.mirror;
    expect(resolveMirror(identity, { 1: null })).toBeNull();
    expect(resolveMirror(identity, { 1: { identity_sentence: '나는 …' } }))
      .toEqual({ kind: 'value', label: identity.label, value: '나는 …' });
  });

  it('출력은 원문 그대로다 — 존재 판정에만 trim 한다', () => {
    expect(resolveMirror(M, { 1: { step_what: ' 걷기 ' } })).toEqual({ kind: 'value', label: M.label, value: ' 걷기 ' });
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

// ── ADR-103 되비추기 깊이 ──────────────────────────────────────────────────
// 이 블록이 세 가지를 잠근다: 하위호환(1~3회차 출력 불변) · 봉투 분리 · 상한 없음.
//   1~3회차는 이미 참여자에게 나가 있으므로 회귀를 안고 4회차를 얹으면 원인 분리가 어려워진다.
describe('되비추기 깊이 — back (ADR-103)', () => {
  const M = CHECKIN_SESSION_2.step.lastStep.mirror;
  const ANSWER = { step_what: '편지 다시 읽기', step_when: '토요일 아침' };

  it('back 미지정은 직전 회차(1)를 읽는다 — 기존 선언 전부 그대로', () => {
    expect(resolveMirror(M, { 1: ANSWER })).toEqual({ kind: 'value', label: M.label, value: '편지 다시 읽기 · 토요일 아침' });
  });

  // **이것이 봉투 분리의 증명이다.** 다른 깊이를 아무리 채워도 back 미지정 선언의 출력이 변하면 안 된다.
  //   step_what·mood·self_note 는 회차 공용 키라, 봉투가 새면 지난 걸음 되비추기가 두 회차 전 값을 읽고
  //   참여자에게 **틀린 문장**이 보인다. 한 봉투로 병합하지 않은 이유가 이것이다.
  it('다른 깊이를 채워도 1~3회차 출력이 변하지 않는다', () => {
    const noisy = { 1: ANSWER, 2: { step_what: '두 회차 전 걸음', step_when: '언젠가' }, 5: { step_what: '다섯 회차 전' } };
    expect(resolveMirror(M, noisy)).toEqual(resolveMirror(M, { 1: ANSWER }));
  });

  it('back: 2 는 두 회차 전만 읽고 직전은 읽지 않는다', () => {
    const m2 = { label: '두 회차 전', keys: ['identity_statement'], back: 2 };
    expect(resolveMirror(m2, { 1: { identity_statement: '직전 값' }, 2: { identity_statement: '두 회차 전 값' } }))
      .toEqual({ kind: 'value', label: '두 회차 전', value: '두 회차 전 값' });
    // 직전에만 있고 두 회차 전이 비면 그리지 않는다(empty 없음).
    expect(resolveMirror(m2, { 1: { identity_statement: '직전 값' }, 2: null })).toBeNull();
  });

  it('back2 가 없어도 empty 규칙은 그대로 적용된다', () => {
    const m2 = { label: 'x', keys: ['step_what'], empty: '아직 없습니다', back: 2 };
    expect(resolveMirror(m2, { 1: ANSWER })).toEqual({ kind: 'empty', text: '아직 없습니다' });
  });

  // 1회차는 되비추기 선언이 **0개**다 — 첫 회차라 되비출 지난 회차가 없다. 그래서 깊이도 0이고
  //   왕복도 0이다(현행 `sessionNo > 1` 가드와 결과가 같다). 2·3회차만 [1] 이다.
  //   지시서 메모의 검증 항목은 셋 다 [1] 이라 적었으나 실측이 다르다 — 코드가 옳다.
  it('1회차는 깊이 0, 2·3회차는 깊이 1 — 왕복이 늘지 않는다', () => {
    expect(neededBacks(CHECKIN_SESSION_1), '1회차').toEqual([]);
    for (const c of [CHECKIN_SESSION_2, CHECKIN_SESSION_3]) {
      expect(neededBacks(c), `${c.sessionNo}회차`).toEqual([1]);
    }
    // 왕복 수 — 이전과 동일함을 여기서 확정한다.
    expect(priorSessionNos(1, 'edit', neededBacks(CHECKIN_SESSION_1))).toEqual([]);
    expect(priorSessionNos(2, 'edit', neededBacks(CHECKIN_SESSION_2))).toEqual([1]);
    expect(priorSessionNos(3, 'edit', neededBacks(CHECKIN_SESSION_3))).toEqual([2]);
  });

  it('priorSessionNos — 열람에는 싣지 않고, 없는 회차는 거른다', () => {
    expect(priorSessionNos(1, 'edit', [1])).toEqual([]);        // 0회차는 없다
    expect(priorSessionNos(2, 'edit', [1])).toEqual([1]);
    expect(priorSessionNos(3, 'edit', [1])).toEqual([2]);       // 왕복 1 — 이전과 같다
    expect(priorSessionNos(4, 'edit', [1, 2])).toEqual([3, 2]);
    expect(priorSessionNos(4, 'read', [1, 2])).toEqual([]);     // ADR-86 — 열람은 조회 자체를 건너뛴다
  });

  // 상한을 두지 않은 값을 여기서 잠근다. 7회차가 2회차 한 문장을 되비추면 back:5 이고,
  //   그것은 우리가 설계한 종단 축의 끝점이라 반드시 온다. 그때 코드를 안 고치는 것이 목표다.
  it('상한 없음 — 가상의 back:5 도 그대로 동작한다', () => {
    expect(priorSessionNos(7, 'edit', [1, 5])).toEqual([6, 2]);
    const m5 = { label: '2회차에 쓰신 문장', keys: ['identity_statement'], back: 5 };
    expect(resolveMirror(m5, { 1: { identity_statement: '직전' }, 5: { identity_statement: '다섯 회차 전' } }))
      .toEqual({ kind: 'value', label: '2회차에 쓰신 문장', value: '다섯 회차 전' });
  });
});
