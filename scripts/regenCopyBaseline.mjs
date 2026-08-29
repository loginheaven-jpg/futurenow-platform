// `copyBaseline.json` 재생성 — **손으로 만들지 않는다**(지휘부 실측 ④ 2026-08-29).
//
// **왜 도구인가**: §9.1 이 «개편 커밋 직후 전량 재생성» 을 요구한다. 손으로 만들면
//   무엇이 왜 바뀌었는지 아무도 모르고, 오늘 우리는 **「기준선이 참값이 아니었다」** 를 이미 한 번 겪었다.
//
// **추출 규칙은 `copyRegression.test.ts` 와 **같아야 한다** — 다르면 재생성이 곧 오탐이다.
//   그래서 그 파일의 `koreanLiterals()` 를 **그대로 옮겨 적는다**(정규식·주석 제거 규칙 포함).
//   두 곳이 갈리지 않는지는 `--verify` 가 잰다.
//
// 사용:
//   node scripts/regenCopyBaseline.mjs --verify   # 지금 파일과 대조만 한다(쓰지 않는다)
//   node scripts/regenCopyBaseline.mjs --write    # 재생성해 덮어쓴다
import { readFileSync, writeFileSync } from 'node:fs';

const DIR = 'src/instruments/futurenow/checkin';
const FILES = ['session1', 'session2', 'session3', 'session4', 'session5'];
const OUT = `${DIR}/copyBaseline.json`;

/** `copyRegression.test.ts` 의 규칙 그대로 — 문자열 리터럴 중 한글이 든 것만. */
const RE = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g;
function koreanLiterals(file) {
  const src = readFileSync(`${DIR}/${file}.ts`, 'utf8');
  const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  const out = new Set();
  for (const m of code.matchAll(RE)) {
    const s = m[1] ?? m[2];
    if (/[가-힣]/.test(s)) out.add(s);
  }
  return [...out];
}

const next = {};
for (const f of FILES) next[f] = koreanLiterals(f);

const prev = JSON.parse(readFileSync(OUT, 'utf8'));

let total = 0, added = 0, removed = 0;
console.log('회차     지금  재생성  늘어남  사라짐');
for (const f of FILES) {
  const a = new Set(prev[f] ?? []);
  const b = new Set(next[f]);
  const plus = next[f].filter((s) => !a.has(s));
  const minus = (prev[f] ?? []).filter((s) => !b.has(s));
  total += next[f].length; added += plus.length; removed += minus.length;
  console.log(`${f}  ${String((prev[f] ?? []).length).padStart(5)} ${String(next[f].length).padStart(7)} ${String(plus.length).padStart(7)} ${String(minus.length).padStart(7)}`);
  for (const s of plus.slice(0, 6)) console.log(`   + ${s.slice(0, 60)}`);
  for (const s of minus.slice(0, 6)) console.log(`   - ${s.slice(0, 60)}`);
}
console.log(`\n합계 ${total}건 · 늘어남 ${added} · 사라짐 ${removed}`);

if (process.argv.includes('--write')) {
  writeFileSync(OUT, JSON.stringify(next, null, 2) + '\n', 'utf8');
  console.log(`\n썼다: ${OUT}`);
} else {
  console.log(added + removed === 0
    ? '\nO **델타 0** — 지금 파일은 추출로 다시 만들어도 같다. 재생성이 안전하다.'
    : '\n★ 델타가 있다 — 지금 파일은 **추출의 산물이 아니다.** 재생성하면 위 차이가 함께 들어간다.');
}
