import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as COPY from './copy';
import { REFLECTION_QUESTIONS } from './reflection';
import { VALUE_CARDS } from './cards';
import { COUNT_RULES } from './stages';

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

  // ADR-185 — 쓰기 화면에서 열람 주체를 말하지 않는다. 그 고지의 자리는 가입 동의서다.
  it('입력 화면에 열람 주체 고지가 없다 (ADR-185)', () => {
    const 전문 = JSON.stringify(COPY);
    expect(전문).not.toContain('읽습니다');
    expect(전문).not.toContain('운영자');
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

// ── 탐색 화면이 실제로 압축하는가 (ADR-186) ─────────────────────────────────
//
// 이 화면의 실패는 조용하다. 문구가 다정하고 화면이 잘 뜨는데 **참여자가 72장을 다 고른다.**
//   그러면 정리 화면이 60장을 앞에 두고, 8~12로 줄이는 일이 사람이 할 수 없는 크기가 된다.
//   그래서 「무엇을 묻는가」와 「몇 장을 받는가」를 둘 다 잠근다.
describe('탐색 화면 — 좋은 낱말도 아니오를 받을 수 있는 질문인가 (ADR-186)', () => {
  it('부재로 묻는다 — 끌림·소망으로 묻지 않는다', () => {
    const 지문 = [COPY.EXPLORE.lead, COPY.EXPLORE.help].join(' ');

    // 72장이 전부 좋은 낱말이라 '끌리는가'·'지키고 싶은가'는 전부 예를 받는다.
    expect(지문, '끌림으로 물으면 전부 통과한다').not.toContain('끌리는 카드');
    expect(지문).not.toContain('지키고 싶은');
    // 부재 형태여야 같은 낱말이 아니오를 받을 수 있다.
    expect(지문).toContain('없으면');
  });

  // 1차를 증거로 물으면 2차 대조가 성립하지 않는다 —
  //   `JUDGE_REPLY.different` 가 "머리로 고른 가치와 삶이 증명한 가치가 다르다"고 말한다.
  //   양쪽이 같은 질문이 되면 그 문장이 가리킬 어긋남 자체가 사라진다.
  it('1차는 증거로 묻지 않는다 — 그 자리는 2차 대조가 쓴다', () => {
    const 지문 = [COPY.EXPLORE.lead, COPY.EXPLORE.help].join(' ');
    for (const w of ['살아 본', '해 본 적', '포기해', '증명']) {
      expect(지문, w).not.toContain(w);
    }
    // 대조가 실재하는지를 **구조로** 확인한다. 판정 문구는 바뀔 수 있으나
    //   '두 출처를 맞대어 본다'는 사실이 사라지면 1차를 증거로 물어도 되는 상태가 된다.
    expect(COPY.COMPARE.colWorkbook).toContain('1회차에서');
    expect(COPY.COMPARE.colCards).toContain('가치 카드에서');
    expect(COPY.COMPARE.judgeLead).toMatch(/요\?$/);
  });

  it('분량 지시가 허용형이 아니라 명령형이다 (원칙 §39)', () => {
    expect(COPY.EXPLORE.quota).toContain('십시오');
    // 옛 문구는 남은 마찰까지 없앴다 — 되살아나면 압축이 다시 0 이 된다.
    const 전체 = Object.values(COPY.EXPLORE).filter((v) => typeof v === 'string').join(' ');
    expect(전체).not.toContain('모두 고르세요');
    expect(전체).not.toContain('장수를 세지 않습니다');
  });

  // 낱말과 상수가 따로 놀면 화면이 거짓말을 한다.
  it("문구의 '셋' 과 규칙의 perPage 가 같다", () => {
    expect(COUNT_RULES.explore.perPage).toBe(3);
    expect(COPY.EXPLORE.quota).toContain('셋');
    expect(COPY.EXPLORE.capped).toContain('셋');
  });

  // 화면당 상한 × 화면 수가 정리 화면의 목표 구간에 닿아야 한다.
  //   닿지 않으면 참여자가 아무리 성실해도 다음 화면으로 갈 수 없다.
  it('화면당 몫을 다 써도 정리 화면 하한을 넘는다', () => {
    const 최대 = COUNT_RULES.explore.perPage * 5; // 5화면
    expect(최대).toBeGreaterThanOrEqual(COUNT_RULES.candidates.min);
    expect(최대).toBeGreaterThan(COUNT_RULES.candidates.max - COUNT_RULES.candidates.min);
  });

  it('정리 화면이 개수만이 아니라 잣대를 준다', () => {
    // 전에는 '8~12장으로 좁혀 주세요' 뿐이라 무엇을 근거로 자를지 한 줄도 없었다.
    expect(COPY.TIDY.help).toContain('견주');
    expect(COPY.TIDY.help, '못 고른 카드를 되찾는 길이 상한의 전제다').toContain('더하시면');
  });
});
