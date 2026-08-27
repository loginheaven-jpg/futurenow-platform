// 개발 전용 의존성이 **런타임에 새지 않는다** — 잠금 (4차 F-5 준비 · 지휘부 조건 ③).
//
// `playwright` 를 devDependency 로 들였다(4폭 캡처 하네스). 조건이 셋이었다:
//   ① `devDependencies` 로만 · ② 버전 고정 · ③ **런타임 코드가 import 하지 않음을 테스트로 잠금.**
// 이 파일이 ③ 이고, ①·② 도 함께 본다 — 규칙은 지켜지는지 확인할 수 있어야 규칙이다.
//
// **왜 잠그나.** 캡처 도구가 앱 번들에 섞이면 배포물이 수백 MB 커지고,
//   그보다 나쁘게 **서버 런타임이 브라우저를 띄울 수 있는 상태**가 된다.
//   지금은 아무도 그러지 않지만, 막아 두지 않으면 다음 사람이 `scripts/` 의 코드를
//   `src/` 로 옮기면서 함께 끌고 온다.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

/** 개발 전용이어야 하는 것들. 런타임 번들에 들어가면 안 된다. */
const DEV_ONLY = ['playwright'];

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|mts|cts)$/.test(e)) out.push(p);
  }
  return out;
}

describe('개발 전용 의존성 — 런타임에 새지 않는다', () => {
  it.each(DEV_ONLY)('`%s` 는 devDependencies 에만 있다', (name) => {
    expect(pkg.devDependencies?.[name], `${name} 가 devDependencies 에 없다`).toBeDefined();
    expect(pkg.dependencies?.[name], `${name} 가 dependencies 에 있다 — 런타임으로 샜다`).toBeUndefined();
  });

  it.each(DEV_ONLY)('`%s` 는 **버전이 고정**돼 있다 — `^`·`~`·`*` 를 쓰지 않는다', (name) => {
    const v = pkg.devDependencies?.[name] ?? '';
    // 캡처 도구가 조용히 올라가면 어느 날 캡처가 달라지고, 그 차이를 화면 회귀로 읽게 된다.
    expect(v, `${name}: ${v}`).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('**`src/` 어디서도 개발 전용 의존성을 수입하지 않는다**', () => {
    const files = walk('src');
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      // 주석은 뺀다 — 이 규율을 설명하는 주석까지 걸리면 규칙이 자기를 물어뜯는다.
      const code = src.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      for (const name of DEV_ONLY) {
        const re = new RegExp(`(from|import|require)\\s*\\(?\\s*['"]${name}(/|['"])`);
        if (re.test(code)) offenders.push(`${f} → ${name}`);
      }
    }
    expect(offenders, `런타임 코드가 개발 전용 의존성을 수입한다:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('수입해도 되는 곳은 `scripts/` 와 `tests/` 뿐이다 — 실제로 거기서만 쓴다', () => {
    // 하네스가 정말 그것을 쓰고 있는지도 본다. 안 쓰면 의존성을 들일 이유가 없다.
    const harness = readFileSync('scripts/shots.mjs', 'utf8');
    expect(harness, '하네스가 playwright 를 쓰지 않는다 — 그러면 devDep 을 들일 이유가 없다').toContain("from 'playwright'");
  });
});
