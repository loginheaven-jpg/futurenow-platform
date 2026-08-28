import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
// 순수 판정 함수(.mjs) — **도구를 도구로 재기 위해 직접 부른다.**
import { judgeTestFiles } from '../scripts/verifyJudge.mjs';

// **검증 도구 자신을 잠근다**(지휘부 규칙 ㉣ · U-0 주석 도구 선례).
//
// 이 잠금이 막는 것은 하나다 — **판정의 근거가 판정하려는 것보다 좁아지는 것.**
//   같은 모양의 사고가 세 번이었고(출력 대 집계 · 문장 대 사실 · `Tests` 대 `Test Files`),
//   세 번 같은 자리에서 났으면 주의가 아니라 **형식**이다.
const src = readFileSync('scripts/verify.mjs', 'utf8');

describe('검증 도구 — 네 지표를 다 뽑는가', () => {
  it('네 지표를 전부 실행한다', () => {
    for (const cmd of ['npx tsc --noEmit', 'npx eslint .', 'npx vitest run', 'npx next build']) {
      expect(src, `${cmd} 가 빠졌다`).toContain(cmd);
    }
  });

  // ★★ **도구에 실물을 먹인다**(U-4 2026-08-29 · 이 잠금이 한 번 새 나갔다).
  //   전에는 *`files &&` 와 `missing.push` 가 한 줄에 있는가* 를 **문자열로** 쟀다.
  //   그래서 판정 정규식이 `/failed/`(백스페이스 문자)로 박혀 **아무것도 매치하지 않는데도**
  //   초록이었고, `Test Files 8 failed` 인 회차에 도구가 **「전항 통과」와 exit 0** 을 냈다.
  //   **쓰이는 모양은 맞았고 값이 틀렸다.** 이제 **판정 함수를 직접 불러** 실패 줄과 통과 줄을
  //   **둘 다** 넣는다 — 대조군 없는 초록을 만들지 않는다.
  it('★ 실패 줄을 넣으면 **실패라고 답한다**', () => {
    expect(judgeTestFiles('Test Files  8 failed | 112 passed | 5 skipped (125)')).toMatch(/failed/);
    expect(judgeTestFiles('Test Files  1 failed (1)')).toBeTruthy();
  });

  it('대조군 — 통과 줄과 스킵 줄에는 `null` 이다(스킵은 실패가 아니다)', () => {
    expect(judgeTestFiles('Test Files  120 passed (120)')).toBeNull();
    expect(judgeTestFiles('Test Files  115 passed | 5 skipped (120)')).toBeNull();
  });

  it('줄 자체가 없으면 실패다 — 없는 것을 통과로 읽지 않는다', () => {
    expect(judgeTestFiles(undefined)).toBeTruthy();
    expect(judgeTestFiles('')).toBeTruthy();
  });

  it('그리고 스크립트가 그 판정을 **실제로 부른다** — 부르지 않으면 위 셋이 헛돈다', () => {
    expect(src, 'verify.mjs 가 judgeTestFiles 를 부르지 않는다').toContain('judgeTestFiles(files)');
    expect(src, '판정 결과를 빠짐 목록에 넣지 않는다').toMatch(/missing\.push\(why\)/);
  });

  it('vitest 세 줄을 다 요구한다 — 하나라도 빠지면 스크립트가 실패한다(㉢)', () => {
    // **문자열이 있는가로 재지 않는다** — 주석에만 있어도 통과해 버린다(이번 회차의 교훈).
    //   *세 줄이 빠짐 검사 목록에 들어 있는가* 를 잰다.
    const guard = src.match(/for \(const \[name, v\] of \[([\s\S]*?)\]\) \{/)?.[1] ?? '';
    for (const line of ['Test Files', 'Tests', 'Duration']) {
      expect(guard, `${line} 이 빠짐 검사 목록에 없다`).toContain(`'${line}'`);
    }
    expect(src, '빠진 지표를 모아 실패로 만들지 않는다').toContain('missing.push');
    expect(src, '실패해도 exit 0 이면 조용히 지나간다').toContain('process.exit(1)');
  });

  it('라우트 표를 낸다 — 빌드 성공만으로는 URL 변화를 못 본다', () => {
    expect(src).toContain('Route');
    expect(src, '라우트 표를 잘라내지 않는다').toContain('routes');
  });

  it('**왜 형식인가**를 파일이 스스로 적고 있다 — 근거가 사라지면 다음 사람이 되돌린다', () => {
    expect(src).toContain('판정의 근거가 판정하려는 것보다 좁다');
  });

  it('**스킵 사유가 실측과 갈리지 않는다** — 스킵은 실패가 아니지만 잊혀서도 안 된다', () => {
    // 규칙(2026-09-01): `failed` 만 실패다. `skipped` 는 의도된 상태이나 **사유를 적는다.**
    expect(src, 'skipped 를 실패로 세면 우리가 승인한 skipIf 가 스스로를 문다').not.toMatch(/failed\|todo/);
    expect(src, 'failed 판정이 없다').toMatch(/\bfailed\b/);
    const listed = [...src.matchAll(/\['(tests\/[^']+)', '/g)].map((m) => m[1]).sort();
    const actual = readdirSync('tests')
      .filter((f) => /\.test\.tsx?$/.test(f))
      .map((f) => `tests/${f}`)
      .filter((f) => /integration|migration|snapshot/.test(f))
      .sort();
    expect(listed, '스킵 사유 목록이 실측과 다르다').toEqual(actual);
  });
});
