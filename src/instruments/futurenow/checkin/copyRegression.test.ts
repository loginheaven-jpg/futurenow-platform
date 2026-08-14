import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import baseline from './copyBaseline.json';

// 문안 회귀 잠금(ADR-90 · 지시서 §5-1).
//   ADR-90 은 슬롯 이름(desire→pairText·futureArea→areaPick)과 배치를 바꾼다. 그래서 파일 diff 로는
//   '문안이 그대로인가'를 증명할 수 없다 — 구조 변경분에 파묻힌다.
//   대신 **변경 전 한국어 문자열 리터럴 집합**을 스냅샷으로 박아 두고, 그중 하나라도 사라지거나 바뀌면 실패시킨다.
//   추가는 허용한다(요약 줄·되비추기 캡션 이관처럼 정당한 증가가 있다). 삭제·변경만 막는다.
//   copyBaseline.json 은 ADR-90 착수 직전 HEAD(78b47b0)의 session1·session2 에서 뽑았다 —
//   즉 ADR-88(목적 세 질문·요약 줄)과 165db9e(2회차 문안 교정 2건)까지 반영된 **최신 확정 문안**을 지킨다.
//   재생성할 일이 있으면 반드시 그 시점 이후 커밋에서 뽑는다(7d40ee7 로 되돌리면 15건이 오탐된다).

const RE = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g;

function koreanLiterals(file: string): Set<string> {
  const src = readFileSync(new URL(`./${file}.ts`, import.meta.url), 'utf8');
  const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  const out = new Set<string>();
  for (const m of code.matchAll(RE)) {
    const s = m[1] ?? m[2];
    if (/[가-힣]/.test(s)) out.add(s);
  }
  return out;
}

// ADR-94(2026-08-07): session3 을 잠금에 넣었다. 그전까지 3회차 문안 전체가 회귀 보호 **밖**에 있었다 —
//   '3회차는 baseline 대상이 아니므로 갱신이 필요 없다'는 사실이었으나, **필요 없다는 것과 안 하는 게 옳다는 것은 다르다.**
//   session3 스냅샷은 책 페이지 참조 다섯을 **붙인 뒤** 뽑았다(먼저 뽑으면 참조 없는 상태를 잠그고 즉시 깨진다).
describe('1·2·3회차 문안 회귀 — 리터럴 집합에서 삭제·변경 0', () => {
  for (const file of ['session1', 'session2', 'session3'] as const) {
    it(`${file}: 스냅샷의 모든 문자열이 그대로 남아 있다`, () => {
      const now = koreanLiterals(file);
      const missing = baseline[file].filter((s) => !now.has(s));
      expect(missing, `사라지거나 바뀐 문안: ${JSON.stringify(missing)}`).toEqual([]);
    });
  }

  // 증가분은 허용하되 눈에 보이게 남긴다 — 몰래 늘지 않도록.
  for (const file of ['session1', 'session2', 'session3'] as const) {
    it(`${file}: 스냅샷에 없는 문자열이 새로 생기지 않았다`, () => {
      const added = [...koreanLiterals(file)].filter((s) => !baseline[file].includes(s));
      expect(added).toEqual([]);
    });
  }
});

// ADR-98 — 3회차 개정 1차(실강 녹취 근거). 리터럴 잠금은 baseline 대비 '변경'만 보므로,
//   재생성 뒤에는 무엇이 왜 바뀌었는지가 스냅샷에서 사라진다. 되돌아가지 않도록 여기서 못 박는다.
describe('3회차 개정 1차가 되돌아가지 않는다 (ADR-98)', () => {
  const lits = koreanLiterals('session3');

  it('습관 짝 — 기입 순서 반전에 맞춘 라벨·연결선', () => {
    for (const old of ['오늘 다시 짠 습관 중에서, 짝 하나만 옮겨 주세요. (책 117~118쪽)', '↓ 그 자리에', '줄이거나 없애기로 한 것', '그 자리에 들이기로 한 것']) {
      expect(lits.has(old), `옛 문안이 살아 있다: ${old}`).toBe(false);
    }
    for (const now of ['이번 주에 실제로 바꿔 볼 짝 하나만 옮겨 주세요. (책 117~118쪽)', '↓ 그 자리를 만들려면', '이번 주에 새로 시작하거나 늘릴 것', '줄이거나 없앨 것']) {
      expect(lits.has(now), `새 문안이 없다: ${now}`).toBe(true);
    }
    // to.help 는 삭제했다 — 연결선 문구가 같은 논리를 진다.
    expect(lits.has('비운 자리를 그냥 두면 며칠 안에 원래대로 돌아갑니다. 실패가 아니라 원래 그렇게 됩니다.')).toBe(false);
  });

  // ADR-100 이 심화①(identity_gap)을 통째로 지우면서 ADR-98 개정 3 의 대상 자체가 사라졌다.
  //   개정 4(심화② 축약)도 라벨 교체와 함께 help 가 삭제됐다. 단언을 그 사실에 맞춘다 —
  //   **옛 문안 부재는 그대로 지키고**(되돌아가지 않게), 새 문안 존재는 ADR-100 절로 옮긴다.
  it('심화 — 옛 문안 넷이 모두 사라졌다', () => {
    for (const old of [
      '고쳐야 할 것을 찾는 칸이 아닙니다. 어긋난 곳이 보이면 그것만으로 충분합니다.',
      '보인 것 하나면 충분합니다. 오늘은 알아차리는 데까지가 몫이에요.',
      '좋은 말이든 아니든 상관없습니다. 그냥 자주 나오는 말이면 됩니다.',
      '좋은 말이든 아니든, 그냥 자주 나오는 말이면 됩니다.',
    ]) expect(lits.has(old), old).toBe(false);
  });

  it('우당탕탕 신설 + 한 걸음이 그것을 잇는다(두 개정은 묶음)', () => {
    expect(lits.has("그 영역에서 시작할 '우당탕탕 프로젝트'의 이름")).toBe(true);
    expect(lits.has('오늘 마지막에 정하신 그 하나를 그대로 옮기시면 됩니다.')).toBe(false);
    expect(lits.has('오늘 정하신 것 하나면 됩니다. 위에 우당탕탕 프로젝트를 적으셨다면, 그 첫 걸음이어도 좋습니다.')).toBe(true);
  });

  // 1·2회차는 이 개정의 대상이 아니다 — 한 글자도 건드리지 않았음을 양방향으로 확인한다.
  it('1·2회차 습관·심화 문안은 무영향', () => {
    for (const file of ['session1', 'session2'] as const) {
      expect(koreanLiterals(file).has('↓ 그 자리를 만들려면'), file).toBe(false);
      expect(koreanLiterals(file).has("그 영역에서 시작할 '우당탕탕 프로젝트'의 이름"), file).toBe(false);
    }
  });
});

// ADR-102 Phase 1 — 진취 전환. 전 회차 공통 문구 넷 + 심화 기본 펼침.
//   완충이 막으려던 문제는 실측에서 하나도 관측되지 않았다(자신감 2·5·7·8 부풀림 0 · 예시 베낌 0명).
//   반면 완충이 붙은 필수 칸(selfNote)은 4/8 이 비었다. 없는 위험에 대비하느라 있는 기회를 잃고 있었다.
describe('진취 전환 Phase 1 이 되돌아가지 않는다 (ADR-102)', () => {
  const S = ['session1', 'session2', 'session3'] as const;

  it('허락 문구 넷이 사라졌다', () => {
    for (const file of S) {
      const lits = koreanLiterals(file);
      expect(lits.has('다듬지 않으셔도 됩니다. 쓰신 그대로면 됩니다.'), file).toBe(false);
      expect(lits.has('꼭 칭찬이 아니어도 됩니다. 지금 나에게 필요한 말이면 됩니다.'), file).toBe(false);
      expect(lits.has('깊은 생각 갈무리하기'), file).toBe(false);
      expect(lits.has('지난 한 걸음이 남아 있지 않아요. 이번 시간부터 시작해도 괜찮습니다.'), file).toBe(false);
    }
  });

  it('selfNote 가 값을 말한다 — 세 회차 공통', () => {
    for (const file of S) {
      expect(koreanLiterals(file).has('오늘의 나에게 지금 필요한 말을 적으십시오. 이 한 줄이 회차마다 쌓입니다.'), file).toBe(true);
    }
  });

  it('심화 제목이 격상됐다 — 세 회차 공통', () => {
    for (const file of S) expect(koreanLiterals(file).has('여기서부터가 진짜입니다'), file).toBe(true);
  });

  it('지난 걸음 없음 안내가 누적을 말한다 — 2·3회차', () => {
    for (const file of ['session2', 'session3'] as const) {
      expect(koreanLiterals(file).has('이번 회차부터 한 걸음이 쌓입니다.'), file).toBe(true);
    }
  });

  // **1·2회차의 identity help 가 서로 다르다.** 사고가 아니라 의도다 —
  //   1회차 키(identity_sentence)는 2회차가 되비추므로 '다음 회차의 출발점'이 참이지만,
  //   2회차 키(identity_statement)를 읽는 자리는 ADR-100 이후 0곳이라 같은 문장이 거짓이 된다.
  //   제품이 지금 이행할 수 있는 값만 말한다(ADR-102 규범). 되비추기가 4회차에 생기면 그때 붙인다.
  it('identity help — 1회차만 값 문장을 갖는다', () => {
    const s1 = koreanLiterals('session1');
    const s2 = koreanLiterals('session2');
    expect(s1.has('손본 문장이 아니라 오늘 쓴 그대로 옮기십시오. 이 문장이 다음 회차의 출발점이 됩니다.')).toBe(true);
    expect(s2.has('손본 문장이 아니라 오늘 쓴 그대로 옮기십시오.')).toBe(true);
    expect(s2.has('손본 문장이 아니라 오늘 쓴 그대로 옮기십시오. 이 문장이 다음 회차의 출발점이 됩니다.')).toBe(false);
  });
});

// ADR-91 D — 완충 문구를 '허락'에서 '용도'로 바꾼 교체. 실측이 근거를 지웠기 때문이다:
//   실행 자신감 값은 2·5·7·8(평균 5.5)로 부풀림이 없었고, self_note placeholder 를 그대로 베낀 사람은 0명이었다.
//   없애는 것이 아니라 문법을 바꾼다 — 정직성 확보 효과는 같고 자세가 반대다.
//   이 교체가 baseline 을 깨뜨렸으므로 스냅샷을 재생성했고, 되돌아가지 않도록 여기서 못 박는다.
// ADR-100 — 심화① 삭제 + 심화② 문항 교체. 지휘부 지시 2026-08-10.
describe('3회차 심화 개정이 되돌아가지 않는다 (ADR-100)', () => {
  const lits = koreanLiterals('session3');

  it('identity_gap 문항과 그 되비추기가 사라졌다', () => {
    expect(lits.has('지금 내 하루 중에서, 지난 시간에 쓴 문장과 어긋난 채 반복되고 있는 것 하나는 무엇인가요? (책 108~111쪽)')).toBe(false);
    expect(lits.has('지난 시간에 쓰신 문장')).toBe(false);
    expect(lits.has('identity_statement')).toBe(false);
  });

  it('심화② 가 무엇을·어떻게 를 함께 묻는다', () => {
    expect(lits.has('요즘 내 입에서 가장 자주 나오는 말 한마디는 무엇인가요? (책 126~133쪽)')).toBe(false);
    expect(lits.has('요즘 자주 하는 말 중에 꼭 바꾸고 싶은 말은 무엇이고, 어떻게 바꿀 건가요? (책 126~133쪽)')).toBe(true);
  });

  it('요약 줄이 한 갈래로 줄었다', () => {
    expect(lits.has('정체성과 어긋난 하루 · 내 입에 붙은 말')).toBe(false);
    expect(lits.has('내 입에 붙은 말')).toBe(true);
  });

  // 1·2회차는 이 개정의 대상이 아니다.
  it('1·2회차 심화 문안은 무영향', () => {
    for (const file of ['session1', 'session2'] as const) {
      expect(koreanLiterals(file).has('요즘 자주 하는 말 중에 꼭 바꾸고 싶은 말은 무엇이고, 어떻게 바꿀 건가요? (책 126~133쪽)'), file).toBe(false);
    }
  });
});

describe('완충 문구 교체가 되돌아가지 않는다', () => {
  const REPLACED = '솔직하게요. 낮게 답하셔도 아무 일 없습니다.';
  const NOW = '낮게 적힌 숫자가 인도자에게는 가장 쓸모 있습니다. 한 걸음을 더 잘게 쪼개 드릴 수 있거든요.';

  for (const file of ['session1', 'session2', 'session3'] as const) {
    it(`${file}: 실행 자신감 보조문구가 용도 문법으로 바뀌었다`, () => {
      const lits = koreanLiterals(file);
      expect(lits.has(REPLACED)).toBe(false);
      expect(lits.has(NOW)).toBe(true);
    });
  }

  // self_note 예시는 회차마다 다르다 — label 은 이미 회차별인데 예시만 고정이었던 설계 누락을 메운다.
  //   멈춤을 모델링하지 않고 정직을 모델링한다(강요된 밝음도 아니다).
  it('self_note 예시가 회차마다 다르다', () => {
    const old = '괜찮아, 오늘은 여기까지만 해도 돼';
    expect(koreanLiterals('session1').has(old)).toBe(false);
    expect(koreanLiterals('session2').has(old)).toBe(false);
    expect(koreanLiterals('session1').has('오늘 꺼내길 잘했다')).toBe(true);
    expect(koreanLiterals('session2').has('아직 흐릿해도, 방향은 잡았다')).toBe(true);
  });

  // §6-2: 완충을 일괄 제거하지 않는다. 5주차에 실제로 무너진 사람이 여는 문이라 여기까지 딱딱해지면 소수를 잃는다.
  it('남겨 두기로 한 완충은 그대로다', () => {
    const koreanStrings3 = koreanLiterals('session3');
    for (const file of ['session1', 'session2', 'session3'] as const) {
      const lits = koreanLiterals(file);
      // ADR-102 가 이 목록에서 selfNote 완충 하나를 **뺐다**(판례 부분 파기). 남은 둘은 그대로다 —
      //   연락 요청과 익명 안내는 '무너진 사람이 여는 문'이지만 self_note 는 자기에게 쓰는 말이라
      //   도움을 청하는 통로가 아니다. 그리고 그 칸만 필수인데 4/8 이 비었다.
      expect(lits.has('짧은 안부 연락입니다. 코칭 세션이 아닙니다.'), file).toBe(true);
      expect(lits.has('이름 없이 전달합니다. 다만 인원이 적은 차수에서는 글의 결로 짐작될 수 있습니다.'), file).toBe(true);
    }
    // 1·2회차 마음 낱말은 바꾸지 않는다(C는 3회차만) — 저장된 답이 화면에서 지워지지 않게.
    expect(koreanLiterals('session1').has('아직 모르겠음')).toBe(true);
    expect(koreanLiterals('session2').has('아직 모르겠음')).toBe(true);
    // 3회차는 반대다. 회차 간 낱말 차이는 사고가 아니라 ADR-91 C 의 의도된 차이다 — 양방향으로 못 박는다.
    //   (2기 시작 전 1·2회차도 통일할 예정이며, 그때 이 단언 셋을 함께 고친다.)
    expect(koreanStrings3.has('아직 모르겠음')).toBe(false);
    expect(koreanStrings3.has('딱 맞는 말이 없음')).toBe(true);
  });
});
