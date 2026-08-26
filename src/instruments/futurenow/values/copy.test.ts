import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as COPY from './copy';
import { REFLECTION_QUESTIONS } from './reflection';
import { VALUE_CARDS } from './cards';

// 기존 `copyRegression.test.ts` 는 `checkin/session{1..4}.ts` 만 스캔한다 — 이 파일들을 보지 않는다.
//   그래서 잠금을 **여기에 새로 건다**(3차 검토: V-10 검증란의 'copyRegression 통과'는 공회전이었다).
const SRC = readFileSync(new URL('./copy.ts', import.meta.url), 'utf8');
const REFLECT_SRC = readFileSync(new URL('./reflection.ts', import.meta.url), 'utf8');

/** 주석을 걷어낸 한국어 리터럴만 본다. 규율을 설명하는 주석이 금지어를 인용하는 것은 정상이다. */
function koreanLiterals(src: string): string[] {
  const body = src.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*')).join('\n');
  return [...body.matchAll(/'([^'\\]*[가-힣][^'\\]*)'/g)].map((m) => m[1]);
}

const LITERALS = [...koreanLiterals(SRC), ...koreanLiterals(REFLECT_SRC), ...REFLECTION_QUESTIONS];
const 전문 = LITERALS.join('\n');

describe('참여자 표면 금지어 0건', () => {
  it('도구·판정 어휘', () => {
    for (const w of ['워크북', '진단', '설문', '평가', '점수', '지각', '미제출', '함정']) {
      expect(전문.includes(w), w).toBe(false);
    }
  });

  it('허락 어휘 — 축1(futurenow_copy_principles §1)', () => {
    for (const w of ['하셔도', '않으셔도', '괜찮', '아니어도', '충분합니다', '충분해요', '선택 사항']) {
      expect(전문.includes(w), w).toBe(false);
    }
  });

  it('압박 어휘 — §4', () => {
    for (const w of ['반드시', '절대', '놓치지']) expect(전문.includes(w), w).toBe(false);
  });
});

// 3차 검토 N-6. 실측: 참여자 표면에 `주십시오` 0 · `주세요` 47 · `습니까?` 0 · `~나요?` 18 · `~까요?` 10.
//   같은 참여자가 같은 회차에 가치 카드와 갈무리를 연달아 본다. 어투가 갈리면 한 제품으로 읽히지 않는다.
describe('어투가 저장소 관례와 같다 (N-6)', () => {
  it("'주십시오'·'습니까' 를 쓰지 않는다", () => {
    expect(전문.includes('주십시오')).toBe(false);
    expect(전문.includes('습니까')).toBe(false);
  });

  // 플랫폼 질문형 리터럴 53건 실측: ~겠어요? 16 · ~가요? 11 · ~나요? 8 · ~었나요? 7 · ~까요? 8.
  //   공통분모는 **해요체 `~요?`** 다(합쇼체 `~습니까?` 는 0건).
  it("요청은 '~주세요', 질문은 해요체 '~요?' 다", () => {
    expect(LITERALS.some((s) => s.includes('주세요'))).toBe(true);
    const questions = LITERALS.filter((s) => s.trim().endsWith('?'));
    expect(questions.length).toBeGreaterThan(0);
    for (const q of questions) expect(/요\?$/.test(q.trim()), q).toBe(true);
  });

  it("명령형은 동사 직결 '~십시오' 만 쓴다", () => {
    for (const s of LITERALS) {
      if (!s.includes('십시오')) continue;
      expect(/[가-힣]십시오/.test(s), s).toBe(true);
      expect(s.includes('주십시오'), s).toBe(false);
    }
  });
});

// 3차 검토 N-7. 2차는 게이트가 없어 1차 직후에 할 수도 있고(§12-1), 1차 미완료자는 다음 회차로 밀린다(§2-2).
//   문안 원칙 축2 제약: "참·거짓이 회차마다 갈리는 문장을 공통 문구로 넣지 않는다."
describe('시점 지시를 쓰지 않는다 (N-7)', () => {
  it("'오늘'·'지난 시간'·'지난번' 이 0건", () => {
    for (const w of ['오늘', '지난 시간', '지난번', '이번 시간']) {
      expect(전문.includes(w), w).toBe(false);
    }
  });

  it('회차는 이름으로 부른다 — 1회차 참조는 남는다', () => {
    expect(전문.includes('1회차')).toBe(true);
  });
});

// 축2 — 허락을 지운 자리에 값을 말한다. 제품이 지금 이행할 수 있는 것만.
describe('축2 — 이 칸이 어디로 이어지는지 말한다', () => {
  it('존재가치 선언문 연결을 두 자리에서 말한다', () => {
    expect(COPY.INTRO.value).toContain('존재가치 선언문');
    expect(COPY.LABEL.value).toContain('존재가치 선언문');
  });

  it('정합 판정 응답 3종이 전부 있다 (N-8 — v3 에서 둘이 소실됐다)', () => {
    expect(Object.keys(COPY.JUDGE_REPLY).sort()).toEqual(['aligned', 'different', 'unsure']);
    for (const v of Object.values(COPY.JUDGE_REPLY)) expect(v.length).toBeGreaterThan(10);
  });

  it('상한 초과·미달 안내 문구가 있다 (N-8)', () => {
    expect(COPY.TIDY.tooFew(5)).toContain('3장');
    expect(COPY.TIDY.tooMany(15)).toContain('3장');
  });

  it('열람 고지가 입력 화면 둘에 있다 (2차 검토 R2-5)', () => {
    expect(COPY.COMPARE.notice).toBe('적으신 내용은 인도자와 운영자가 읽습니다.');
    expect(COPY.LABEL.notice).toBe(COPY.COMPARE.notice);
  });
});

// 3차 검토 N-9 — S2-12 를 수용 선언한 문단에서 '정직'이 재발했다. 예시는 실재하는 카드만.
describe('예시로 든 가치가 72장에 실재한다 (N-9)', () => {
  const names = new Set(VALUE_CARDS.map((c) => c.korean));
  it('문안에 등장하는 가치명이 전부 카드에 있다', () => {
    for (const ghost of ['진정성', '연결', '정직']) {
      expect(전문.includes(`'${ghost}'`), ghost).toBe(false);
      expect(names.has(ghost), `${ghost} 는 72장에 없다`).toBe(false);
    }
  });
});

describe('성찰 질문', () => {
  it('전원 공통 3개다 (N-10)', () => {
    expect(REFLECTION_QUESTIONS).toHaveLength(3);
  });

  it("방향이 위다 — '무너졌을 때' 계열을 쓰지 않는다 (원칙 §2-4)", () => {
    for (const w of ['무너졌을', '실패', '못했']) {
      expect(REFLECTION_QUESTIONS.join('\n').includes(w), w).toBe(false);
    }
  });

  it('한 문항이 한 가지만 묻는다 — 예/아니오로 끝나지 않는다 (원칙 §2-3)', () => {
    for (const q of REFLECTION_QUESTIONS) expect(/(있나요|없나요)\?$/.test(q), q).toBe(false);
  });
});
