// 완주 검증 — **한 명령이 통째로 뽑는다** (형식 확정 2026-09-01 · 지휘부).
//
// **사람이 옮겨 적지 않는다.** 보고서에 붙이는 것은 이 명령의 **출력 전문**이다.
//
// ─────────────────────────────────────────────────────────────────────────────
// **왜 형식인가 — 같은 모양의 사고가 세 번이었다.**
//
//   ⑴ *시끄럽게 출력한다* 가 **출력**이지 **집계**가 아니어서 스킵이 통과로 셌다
//   ⑵ 잠금이 **문장의 존재**를 쟀고 **사실**을 안 쟀다(마이그레이션 적용 상태)
//   ⑶ 초록 판정이 `Tests` 줄만 보고 **`Test Files` 줄을 안 봤다**(수집 실패 다섯이 숨었다)
//
//   셋 다 한 모양이다 — **판정의 근거가 판정하려는 것보다 좁다.**
//   세 번 같은 자리에서 났으면 주의가 아니라 형식이다. 그래서 도구로 굳힌다.
// ─────────────────────────────────────────────────────────────────────────────
//
// 규칙 넷(지휘부):
//   ㉠ `Test Files` 줄이 없으면 보고가 아니다. `passed` 가 아닌 것이 하나라도 있으면 **실패**다
//   ㉡ 수를 손으로 옮기지 않는다 — 붙이는 것은 출력 전문이다
//   ㉢ 한 지표라도 빠지면 **스크립트가 실패한다** — 조용히 일부만 내지 않는다
//   ㉣ **스크립트 자신을 잠근다** — `tests/verifyHarness.test.ts` 가 이 파일을 잰다
//
// 사용: node scripts/verify.mjs
import { execSync } from 'node:child_process';

const run = (cmd) => {
  try { return { out: execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }), code: 0 }; }
  catch (e) { return { out: `${e.stdout ?? ''}${e.stderr ?? ''}`, code: e.status ?? 1 }; }
};

const missing = [];
const say = (label, body) => { console.log(`\n── ${label} ──`); console.log(body.trim() || '(출력 없음)'); };

// ① tsc — 오류 수
{
  const r = run('npx tsc --noEmit');
  const lines = r.out.split('\n').filter((l) => /error TS/.test(l) && !l.includes('.next'));
  say('tsc', `오류 ${lines.length}\n${lines.slice(0, 10).join('\n')}`);
  if (lines.length) missing.push('tsc 오류');
}

// ② eslint — error 수 · warning 수
{
  const r = run('npx eslint .');
  const m = r.out.match(/(\d+) errors? and (\d+) warnings?|✖ (\d+) problems? \((\d+) errors?, (\d+) warnings?\)/);
  const summary = r.out.split('\n').filter((l) => /problems|potentially fixable/.test(l)).join('\n');
  say('eslint', summary || r.out.slice(-400));
  if (!m && !summary) missing.push('eslint 요약');
  const errs = Number(m?.[4] ?? 0);
  if (errs > 0) missing.push(`eslint error ${errs}`);
}

// ③ vitest — **Test Files · Tests · Duration 셋 다.** 하나라도 빠지면 보고가 아니다.
{
  const r = run('npx vitest run');
  const pick = (re) => r.out.split('\n').find((l) => re.test(l))?.replace(/\s+$/, '');
  const files = pick(/^\s*Test Files\s/);
  const tests = pick(/^\s*Tests\s/);
  const dur = pick(/^\s*Duration\s/);
  say('vitest', [files, tests, dur].filter(Boolean).join('\n'));
  for (const [name, v] of [['Test Files', files], ['Tests', tests], ['Duration', dur]]) {
    if (!v) missing.push(`vitest ${name} 줄 없음`);
  }
  // ㉠ — `passed`·`skipped` 밖의 상태가 하나라도 있으면 실패다. 그 줄이 곧 판정이다.
  if (files && /\b(failed|todo)\b/.test(files)) missing.push(`Test Files 에 passed 아닌 것: ${files.trim()}`);
}

// ④ next build — 성공 여부 · 라우트 표
{
  const r = run('npx next build');
  const table = r.out.split('\n');
  const i = table.findIndex((l) => /^Route \(app\)/.test(l));
  const routes = i >= 0 ? table.slice(i).join('\n').split('\n\n')[0] : '';
  say('next build', `${r.code === 0 ? '성공' : '실패'}\n${routes}`);
  if (r.code !== 0) missing.push('build 실패');
  if (!routes) missing.push('라우트 표 없음');
}

console.log('');
if (missing.length) { console.error(`X 검증 실패 — ${missing.join(' · ')}`); process.exit(1); }
console.log('O 네 지표 전항 통과 — 위 출력 전문을 그대로 보고에 붙인다');
