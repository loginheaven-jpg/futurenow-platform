// `.env.example` 잠금 — **새 PC 가 클론했을 때 「무엇을 받아야 하는지」를 알 수 있는가.**
//
// 실측 2026-10-01: 이 파일은 저장소에 **한 번도 추적된 적이 없었다**(`.gitignore` 의 `.env*` 가 함께 막았다).
//   README 가 가리키는데 클론에는 없는 상태였고, 아무도 몰랐다 — 잠금이 없었기 때문이다.
//
// 재는 것 셋:
//   ⑴ 파일이 **열려 있는가**(`.gitignore` negation) — 막히면 또 사라진다
//   ⑵ **값이 들어 있지 않은가** — 예시에 실값이 섞이는 순간 비밀이 커밋된다
//   ⑶ **코드가 읽는 키가 전부 적혀 있는가** — 손목록은 낡으므로 **소스에서 뽑아 대조한다**
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const NL = String.fromCharCode(10);
const EXAMPLE = '.env.example';
const example = readFileSync(EXAMPLE, 'utf8');

/** 예시 파일이 선언한 키(주석 줄 제외). */
function declared(): string[] {
  return example
    .split(NL)
    .filter((l) => !l.trim().startsWith('#'))
    .map((l) => l.split('=')[0].trim())
    .filter((k) => /^[A-Z][A-Z0-9_]+$/.test(k));
}

/**
 * **일부러 예시에 두지 않는 키 — 사유를 값 옆에 적는다**(목록만 있는 예외는 다음 사람이 판단할 수 없다).
 */
const NOT_IN_EXAMPLE = new Map<string, string>([
  ['QA_BASE', '선택적 기준 URL 덮어쓰기 — 기본값이 코드에 있어 없어도 돈다(비밀도 계정도 아니다)'],
]);

/**
 * 소스가 **실제로 읽는** 환경변수 — 이름 비슷한 상수를 세지 않도록 **읽는 구문**으로만 잡는다.
 *   처음엔 대문자 토큰을 통째로 긁었더니 접두사 조각(`QA_`)과 환경변수가 아닌 상수(`QA_COHORT_SUNSET`)까지 셌다.
 *   비밀·계정 계열만 본다 — 도구 튜닝 값(대기 시간·출력 폴더)은 예시의 몫이 아니다.
 */
function used(): Set<string> {
  const out = new Set<string>();
  const READ = [/process\.env\.([A-Z0-9_]+)/g, /process\.env\['([A-Z0-9_]+)'\]/g, /\benv\.([A-Z0-9_]+)\b/g, /\bg\('([A-Z0-9_]+)'\)/g];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name.startsWith('.')) continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (!/\.(ts|tsx|mjs|js)$/.test(name)) continue;
      const src = readFileSync(p, 'utf8');
      for (const re of READ) {
        for (const m of src.matchAll(re)) {
          const k = m[1];
          if (/^(QA_|SUPABASE_|NEXT_PUBLIC_SUPABASE_)/.test(k) && !NOT_IN_EXAMPLE.has(k)) out.add(k);
        }
      }
    }
  };
  for (const dir of ['src', 'scripts', 'tests']) walk(dir);
  return out;
}

describe('.env.example — 새 PC 가 무엇을 받아야 하는지 알 수 있다', () => {
  it('`.gitignore` 가 **이 파일만** 연다 — 값이 든 파일은 그대로 막힌다', () => {
    const ignore = readFileSync('.gitignore', 'utf8');
    expect(ignore, 'negation 이 사라지면 클론에 예시가 없어진다').toContain(`!${EXAMPLE}`);
    expect(ignore, '.env* 차단이 사라지면 값이 든 파일이 열린다').toMatch(/^\.env\*$/m);
    expect(ignore).not.toMatch(/^!\.env\.local$/m);
  });

  it('**값이 들어 있지 않다** — 예시는 키와 설명뿐이다', () => {
    const filled = example
      .split(NL)
      .filter((l) => !l.trim().startsWith('#'))
      .filter((l) => /^[A-Z][A-Z0-9_]+=.+$/.test(l.trim()));
    expect(filled, `예시에 값이 적혔다: ${filled.join(' · ')}`).toEqual([]);
  });

  it('⑦ 잴 대상이 실재한다 — 선언 키도, 소스가 읽는 키도 0 이 아니다', () => {
    expect(declared().length).toBeGreaterThan(5);
    expect(used().size).toBeGreaterThan(5);
  });

  it('소스가 읽는 비밀·계정 키가 **전부** 예시에 있다 — 손목록이 아니라 소스에서 뽑아 댄다', () => {
    const have = new Set(declared());
    // 예시가 「저장소가 읽지 않는다」고 적어 둔 키는 주석 안이라 declared() 에 안 잡힌다 — 그것은 의도다.
    const missing = [...used()].filter((k) => !have.has(k)).sort();
    expect(missing, `예시에 빠진 키: ${missing.join(' · ')}`).toEqual([]);
  });
});
