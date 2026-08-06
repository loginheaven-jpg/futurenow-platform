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

// ADR-91 D — 완충 문구를 '허락'에서 '용도'로 바꾼 교체. 실측이 근거를 지웠기 때문이다:
//   실행 자신감 값은 2·5·7·8(평균 5.5)로 부풀림이 없었고, self_note placeholder 를 그대로 베낀 사람은 0명이었다.
//   없애는 것이 아니라 문법을 바꾼다 — 정직성 확보 효과는 같고 자세가 반대다.
//   이 교체가 baseline 을 깨뜨렸으므로 스냅샷을 재생성했고, 되돌아가지 않도록 여기서 못 박는다.
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
      expect(lits.has('꼭 칭찬이 아니어도 됩니다. 지금 나에게 필요한 말이면 됩니다.'), file).toBe(true);
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
