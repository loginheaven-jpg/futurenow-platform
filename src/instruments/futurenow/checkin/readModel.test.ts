import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHECKIN_SESSION_1 } from './session1';
import { CHECKIN_SESSION_2 } from './session2';
import { anonNoticeText, buildCheckinRead, readAnonSuggestion, readSelfHighlights, type ReadBlock, type ReadFlags } from './readModel';

const OPEN: ReadFlags = { stepPrivate: false, suggestionAnon: false, contactRequest: false };

// 1회차 전 응답 키(14) — session1.ts 대조.
const ANSWERS_1 = {
  desire_from: '나는 늘 소심했다',
  desire_to: '나는 신중하고 사려 깊은 사람이다',
  identity_sentence: '나는 성장의 가치를 최우선으로 여긴다',
  mood: ['후련함', '고마움'],
  mood_custom: '시원섭섭함',
  scene: '아버지 작업실의 나무 냄새',
  letter_line: '너는 이미 충분했어',
  step_what: '아침에 10분 걷기',
  step_when: '토요일 아침, 집 앞 카페에서',
  step_blocker: '야근이 늦게 끝나는 날',
  confidence: 7,
  need: '책 여분이 있을까요',
  suggestion: '쉬는 시간이 조금 더 길었으면',
  self_note: '괜찮아, 오늘은 여기까지만 해도 돼',
};

// 2회차 전 응답 키(19) — session2.ts 대조.
const ANSWERS_2 = {
  future_area: '일',
  future_line: '동네에서 꼭 들러야 하는 가게를 운영하고 있다',
  purpose_alive: '누군가에게 설명해 줄 때',
  purpose_ache: '기회를 못 만난 사람들',
  purpose_fit: '작은 가게에서 사람을 만나는 자리',
  identity_statement: "나는 '상생'의 가치를 최우선으로 여긴다",
  mood: ['설렘'],
  mood_custom: '조금 얼떨떨함',
  future_scene: '창가에 볕이 드는 작은 가게',
  letter_line: '조급해하지 마, 이미 가고 있어',
  last_step_result: '조금 했습니다',
  last_step_note: '이틀 하고 멈췄다',
  step_what: '저녁에 책 5쪽 읽기',
  step_when: '자기 전, 침대 옆 의자에서',
  step_blocker: '야근이 늦게 끝나는 날',
  confidence: 5,
  need: '3회차에 자리를 앞쪽으로 주세요',
  suggestion: '책 진도가 조금 빠릅니다',
  self_note: '오늘도 잘 왔다',
};

// 중첩(group) 을 펼쳐 평평한 배열로 — 존재 검사를 단순하게.
function flatten(blocks: ReadBlock[]): ReadBlock[] {
  return blocks.flatMap((b) => (b.kind === 'group' ? [b, ...flatten(b.blocks)] : [b]));
}
function texts(blocks: ReadBlock[]): string[] {
  return flatten(blocks).flatMap((b) => {
    if (b.kind === 'text') return [b.value];
    if (b.kind === 'pair') return [b.fromValue, b.toValue];
    if (b.kind === 'list') return b.values;
    if (b.kind === 'scale') return [String(b.value)];
    if (b.kind === 'flag' || b.kind === 'hidden') return [b.label];
    if (b.kind === 'note') return [b.text];
    return [];
  });
}
function labels(blocks: ReadBlock[]): string[] {
  return flatten(blocks).flatMap((b) => (b.kind === 'group' ? [b.title] : 'label' in b ? [b.label] : []));
}
const has = (blocks: ReadBlock[], v: string) => texts(blocks).includes(v);

describe('buildCheckinRead — 응답 키 전량 노출(1·2회차 20키)', () => {
  it('1회차 본인 열람에 14키가 모두 나온다', () => {
    const b = buildCheckinRead(1, ANSWERS_1, OPEN, 'self');
    // self_note 는 뷰가 accent 인용구로 따로 강조하므로 블록 배열이 아니라 하이라이트로 나온다.
    const values = Object.entries(ANSWERS_1)
      .filter(([k]) => k !== 'self_note' && k !== 'confidence' && k !== 'mood')
      .map(([, v]) => v as string);
    for (const v of values) expect(has(b, v), v).toBe(true);
    expect(has(b, '후련함')).toBe(true);
    expect(has(b, '고마움')).toBe(true);
    expect(has(b, '7')).toBe(true);
    expect(readSelfHighlights(1, ANSWERS_1)?.selfNote).toBe(ANSWERS_1.self_note);
  });

  it('2회차 본인 열람에 19키가 모두 나온다', () => {
    const b = buildCheckinRead(2, ANSWERS_2, OPEN, 'self');
    const values = Object.entries(ANSWERS_2)
      .filter(([k]) => k !== 'self_note' && k !== 'confidence' && k !== 'mood')
      .map(([, v]) => v as string);
    for (const v of values) expect(has(b, v), v).toBe(true);
    expect(has(b, '설렘')).toBe(true);
    expect(has(b, '5')).toBe(true);
    expect(readSelfHighlights(2, ANSWERS_2)?.selfNote).toBe(ANSWERS_2.self_note);
  });

  it('인도자 열람에는 self_note 가 블록으로 실명 표시된다(지휘부 결정 2026-08-02)', () => {
    const b = buildCheckinRead(1, ANSWERS_1, OPEN, 'facilitator');
    expect(has(b, ANSWERS_1.self_note)).toBe(true);
    expect(labels(b)).toContain(CHECKIN_SESSION_1.wrap.selfNote.label);
  });
});

describe('라벨은 레지스트리 원문과 문자 단위로 일치한다(문안 이중진실 방지)', () => {
  it('1회차 라벨 전량', () => {
    const l = labels(buildCheckinRead(1, ANSWERS_1, OPEN, 'facilitator'));
    const c = CHECKIN_SESSION_1;
    expect(l).toContain(c.today.pairText.label);
    expect(l).toContain(c.today.identity.label);
    expect(l).toContain(c.today.mood.label);
    expect(l).toContain(c.deepen.title);
    expect(l).toContain(c.deepen.fields[0].label);
    expect(l).toContain(c.deepen.fields[1].label);
    expect(l).toContain(c.step.what.label);
    expect(l).toContain(c.step.when.label);
    expect(l).toContain(c.step.blocker.label);
    expect(l).toContain(c.wrap.confidence.label);
    expect(l).toContain(c.wrap.facilitatorBox.title);
    expect(l).toContain(c.wrap.facilitatorBox.need.label);
    expect(l).toContain(c.wrap.facilitatorBox.suggestion.label);
    expect(l).toContain(c.wrap.selfNote.label);
  });

  it('2회차 고유 라벨', () => {
    const l = labels(buildCheckinRead(2, ANSWERS_2, OPEN, 'facilitator'));
    const c = CHECKIN_SESSION_2;
    expect(l).toContain(c.today.areaPick.label);
    for (const ln of c.today.areaPick.lines) expect(l).toContain(ln.label); // ADR-98: 줄이 배열이다
    expect(l).toContain(c.today.identity.label);
    expect(l).toContain(c.step.lastStep.label);
    expect(l).toContain(c.step.lastStep.note.label);
    // 목적 세 질문 — 묶음 제목 + 세 라벨
    expect(l).toContain(c.today.purpose.title);
    for (const f of c.today.purpose.fields) expect(l).toContain(f.label);
  });

  it('목적 세 질문은 본인·인도자 모두에게 보인다(save.notice2 고지 근거)', () => {
    for (const audience of ['self', 'facilitator'] as const) {
      const b = buildCheckinRead(2, ANSWERS_2, OPEN, audience);
      expect(has(b, ANSWERS_2.purpose_alive), audience).toBe(true);
      expect(has(b, ANSWERS_2.purpose_ache), audience).toBe(true);
      expect(has(b, ANSWERS_2.purpose_fit), audience).toBe(true);
    }
  });

  it('목적 세 질문은 1회차에 없다(2회차 전용)', () => {
    const b = buildCheckinRead(1, { ...ANSWERS_1, purpose_alive: 'ZZ' }, OPEN, 'self');
    expect(has(b, 'ZZ')).toBe(false);
  });

  it('목적 세 질문은 나눔 후보(summaryFields)에 들어가지 않는다 — 재료이지 대표문장이 아니다', () => {
    const keys = CHECKIN_SESSION_2.summaryFields.flatMap((f) => Object.values(f));
    for (const f of CHECKIN_SESSION_2.today.purpose.fields) expect(keys).not.toContain(f.key);
  });

  it('세 칸을 비워도 필수 개수는 6 그대로다(선택 블록)', () => {
    const withoutPurpose = { ...ANSWERS_2 };
    delete (withoutPurpose as Record<string, unknown>).purpose_alive;
    delete (withoutPurpose as Record<string, unknown>).purpose_ache;
    delete (withoutPurpose as Record<string, unknown>).purpose_fit;
    expect(CHECKIN_SESSION_2.requiredTotal).toBe(6);
    expect(CHECKIN_SESSION_2.filledCount(withoutPurpose)).toBe(CHECKIN_SESSION_2.filledCount(ANSWERS_2));
  });

  it('readModel.ts 에 한국어 문자열 리터럴이 없다', () => {
    const src = readFileSync(new URL('./readModel.ts', import.meta.url), 'utf8');
    const code = src
      .split('\n')
      .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*') && !line.trim().startsWith('/*'))
      .join('\n');
    // 따옴표 안의 한글 = 문안 이중진실. 주석의 한글은 허용.
    expect(code).not.toMatch(/['"`][^'"`]*[가-힣][^'"`]*['"`]/);
  });
});

describe('빈 값·미체크는 블록째 생략한다', () => {
  it('빈 answers 는 빈 배열', () => {
    expect(buildCheckinRead(1, {}, OPEN, 'self')).toEqual([]);
    expect(buildCheckinRead(2, {}, OPEN, 'facilitator')).toEqual([]);
  });

  it('공백 문자열은 값으로 치지 않는다', () => {
    expect(buildCheckinRead(1, { scene: '   ' }, OPEN, 'self')).toEqual([]);
  });

  it("갈망은 한 쪽만 있어도 쌍으로 나온다", () => {
    const b = buildCheckinRead(1, { desire_from: '전' }, OPEN, 'self');
    expect(b).toHaveLength(1);
    expect(b[0].kind).toBe('pair');
  });

  it('미체크 플래그는 나오지 않는다', () => {
    const b = buildCheckinRead(1, ANSWERS_1, OPEN, 'self');
    expect(has(b, CHECKIN_SESSION_1.wrap.facilitatorBox.contactRequest.label)).toBe(false);
    expect(has(b, CHECKIN_SESSION_1.wrap.facilitatorBox.suggestionAnon.label)).toBe(false);
  });
});

describe('값 형태 4종을 다룬다', () => {
  it('문자열 배열(mood) + 직접 쓰기를 한 줄로 잇는다', () => {
    const b = flatten(buildCheckinRead(1, ANSWERS_1, OPEN, 'self')).find((x) => x.kind === 'list');
    expect(b).toBeDefined();
    expect(b?.kind === 'list' && b.values).toEqual(['후련함', '고마움', '시원섭섭함']);
  });

  it('숫자(confidence)는 양끝 라벨과 함께 scale 로', () => {
    const b = flatten(buildCheckinRead(1, ANSWERS_1, OPEN, 'self')).find((x) => x.kind === 'scale');
    expect(b?.kind === 'scale' && b.value).toBe(7);
    expect(b?.kind === 'scale' && b.leftLabel).toBe(CHECKIN_SESSION_1.wrap.confidence.leftLabel);
    // 값이 평가로 읽히지 않게 하는 보조문구를 남긴다.
    expect(b?.kind === 'scale' && b.help).toBe(CHECKIN_SESSION_1.wrap.confidence.help);
  });

  it('confidence 0 은 미응답이 아니다(생략되지 않는다)', () => {
    const b = buildCheckinRead(1, { confidence: 0 }, OPEN, 'self');
    expect(b).toHaveLength(1);
    expect(b[0].kind).toBe('scale');
  });

  it('칩 단일선택(future_area·last_step_result)은 단일 문자열 text 로', () => {
    const b = buildCheckinRead(2, ANSWERS_2, OPEN, 'self');
    expect(has(b, '일')).toBe(true);
    expect(has(b, '조금 했습니다')).toBe(true);
  });
});

describe('가시성 — 지휘부 결정 2026-08-02', () => {
  it('step_private=true 면 인도자에게 한 걸음 3키가 전부 사라진다(⑥ 블록 전체)', () => {
    const flags = { ...OPEN, stepPrivate: true };
    const b = buildCheckinRead(2, ANSWERS_2, flags, 'facilitator');
    expect(has(b, ANSWERS_2.step_what)).toBe(false);
    expect(has(b, ANSWERS_2.step_when)).toBe(false);
    expect(has(b, ANSWERS_2.step_blocker)).toBe(false);
    // 자리 표시는 참여자가 켠 토글 원문 그대로(신규 문안 0).
    const hidden = flatten(b).find((x) => x.kind === 'hidden');
    expect(hidden?.kind === 'hidden' && hidden.label).toBe(CHECKIN_SESSION_2.step.share.toggleLabel);
  });

  it('step_private=true 여도 ⑤ 지난 걸음 결산과 confidence 는 인도자에게 남는다(사정권 밖)', () => {
    const b = buildCheckinRead(2, ANSWERS_2, { ...OPEN, stepPrivate: true }, 'facilitator');
    expect(has(b, ANSWERS_2.last_step_result)).toBe(true);
    expect(has(b, ANSWERS_2.last_step_note)).toBe(true);
    expect(has(b, '5')).toBe(true);
  });

  it('step_private=true 여도 본인에게는 전부 보인다', () => {
    const b = buildCheckinRead(2, ANSWERS_2, { ...OPEN, stepPrivate: true }, 'self');
    expect(has(b, ANSWERS_2.step_what)).toBe(true);
    expect(has(b, ANSWERS_2.step_blocker)).toBe(true);
    expect(has(b, CHECKIN_SESSION_2.step.share.toggleLabel)).toBe(true);
  });

  it('suggestion_anon=true 면 인도자 개인 상세에서 빠진다(이름 붙는 자리 금지)', () => {
    const b = buildCheckinRead(1, ANSWERS_1, { ...OPEN, suggestionAnon: true }, 'facilitator');
    expect(has(b, ANSWERS_1.suggestion)).toBe(false);
    // 부탁(need)은 익명 토글과 무관하게 실명으로 남는다.
    expect(has(b, ANSWERS_1.need)).toBe(true);
  });

  it('suggestion_anon=false 면 인도자 개인 상세에 실명으로 나온다(토글 존중)', () => {
    const b = buildCheckinRead(1, ANSWERS_1, OPEN, 'facilitator');
    expect(has(b, ANSWERS_1.suggestion)).toBe(true);
  });

  it('익명 추출기는 anon=true 일 때만 값을 준다', () => {
    expect(readAnonSuggestion(1, ANSWERS_1, { suggestionAnon: true })).toBe(ANSWERS_1.suggestion);
    expect(readAnonSuggestion(1, ANSWERS_1, { suggestionAnon: false })).toBe('');
  });

  it('익명 섹션 캡션은 참여자가 읽은 고지 원문이다', () => {
    expect(anonNoticeText(1)).toBe(CHECKIN_SESSION_1.wrap.facilitatorBox.suggestionAnon.label);
  });

  it('suggestion_anon 값 자체는 인도자에게 노출하지 않는다(재식별 단서)', () => {
    const b = buildCheckinRead(1, ANSWERS_1, { ...OPEN, suggestionAnon: true }, 'facilitator');
    expect(has(b, CHECKIN_SESSION_1.wrap.facilitatorBox.suggestionAnon.label)).toBe(false);
  });

  it('공개 고지·연락 요청 — 본인/인도자 각각의 규칙', () => {
    const self = buildCheckinRead(2, ANSWERS_2, { ...OPEN, contactRequest: true }, 'self');
    // 미체크(공개)면 본인에게 공개 고지 원문을 되돌려 준다.
    expect(has(self, CHECKIN_SESSION_2.step.share.notice)).toBe(true);
    const fac = buildCheckinRead(2, ANSWERS_2, { ...OPEN, contactRequest: true }, 'facilitator');
    // 인도자에게는 참여자용 공개 고지를 싣지 않는다.
    expect(has(fac, CHECKIN_SESSION_2.step.share.notice)).toBe(false);
    // 연락 요청은 양쪽 다 — '코칭 세션이 아닙니다' 보조문구를 달고.
    const flag = flatten(fac).find((x) => x.kind === 'flag');
    expect(flag?.kind === 'flag' && flag.help).toBe(CHECKIN_SESSION_2.wrap.facilitatorBox.contactRequest.help);
  });
});

describe('회차 확장', () => {
  it('미등록 회차는 빈 배열(파손 아님)', () => {
    expect(buildCheckinRead(4, ANSWERS_1, OPEN, 'self')).toEqual([]);
    expect(buildCheckinRead(7, ANSWERS_2, OPEN, 'facilitator')).toEqual([]);
    expect(readSelfHighlights(4, ANSWERS_1)).toBeNull();
    expect(anonNoticeText(4)).toBe('');
  });

  it('1회차에는 없는 블록(지난 걸음·공개 토글)을 만들지 않는다', () => {
    const b = buildCheckinRead(1, { ...ANSWERS_1, last_step_result: '했습니다' }, OPEN, 'self');
    expect(has(b, '했습니다')).toBe(false);
    expect(flatten(b).some((x) => x.kind === 'note')).toBe(false);
  });

  it('1회차에서 stepPrivate 가 참이어도 한 걸음을 감추되 자리 표시는 두지 않는다(토글 없는 회차)', () => {
    const b = buildCheckinRead(1, ANSWERS_1, { ...OPEN, stepPrivate: true }, 'facilitator');
    expect(has(b, ANSWERS_1.step_what)).toBe(false);
    expect(flatten(b).some((x) => x.kind === 'hidden')).toBe(false);
  });
});
