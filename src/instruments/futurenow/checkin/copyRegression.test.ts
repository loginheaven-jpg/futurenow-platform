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

describe('1·2회차 문안 회귀 — 리터럴 집합에서 삭제·변경 0', () => {
  for (const file of ['session1', 'session2'] as const) {
    it(`${file}: 스냅샷의 모든 문자열이 그대로 남아 있다`, () => {
      const now = koreanLiterals(file);
      const missing = baseline[file].filter((s) => !now.has(s));
      expect(missing, `사라지거나 바뀐 문안: ${JSON.stringify(missing)}`).toEqual([]);
    });
  }

  // 증가분은 허용하되 눈에 보이게 남긴다 — 몰래 늘지 않도록.
  it('추가된 문자열은 되비추기 캡션 이관분뿐이다', () => {
    const added = [...koreanLiterals('session2')].filter((s) => !baseline.session2.includes(s));
    expect(added.sort()).toEqual(['지난 시간에 쓰신 문장', '지난 시간의 한 걸음'].sort());
  });

  it('1회차는 추가분도 없다', () => {
    const added = [...koreanLiterals('session1')].filter((s) => !baseline.session1.includes(s));
    expect(added).toEqual([]);
  });
});
