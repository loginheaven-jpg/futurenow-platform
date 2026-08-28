import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

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

  it('★ **`Test Files` 줄을 본다** — 안 보는 형태로 고치면 여기서 레드가 난다', () => {
    expect(src, 'Test Files 줄을 뽑지 않는다 — 수집 실패가 숨는다').toMatch(/Test Files/);
    // 그리고 **판정에 쓴다.** 뽑기만 하고 안 보면 U-2 에서 겪은 그대로다.
    expect(src, 'Test Files 를 실패 판정에 쓰지 않는다').toMatch(/failed|todo/);
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
});
