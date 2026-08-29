// 프런트 문장 대체표 적용 — **표에서 읽어 그대로 넣는다**(지휘부 승인 63건 · 2026-08-29).
//
// **왜 도구인가**: 표의 제1원칙이 *「대체문장을 그대로 넣는다. 조사 하나 바꾸지 않는다」* 다.
//   63곳을 손으로 옮기면 **옮겨 적는 순간 ⑵ 를 ⑴ 처럼 다루는 일**이 된다
//   (`siteContent.ts` 를 손이 아니라 추출로 만든 것과 같은 이유 · `CLAUDE.md` §11 값의 두 분류).
//
// **바꾸는 규칙 — 좁게**:
//   · `현재문장` 이 그 파일에 **정확히 한 번** 있어야 바꾼다. 0번이면 «없다», 2번 이상이면 «모호하다» 로 멈춘다.
//   · 표가 짚은 **파일 안에서만** 바꾼다. 다른 파일로 번지지 않는다.
//   · 마크다운 장식은 **두 가지 변형만** 시도한다(백틱 벗기기 · `**x**`→`<b>x</b>`).
//     그 밖의 어떤 «똑똑한» 정규화도 하지 않는다 — 넓은 창이 오늘만 네 번 거짓을 냈다.
//
// **하지 않는 것**: 표에 없는 문자열 · 인접 문장 다듬기 · 구조 변경.
//
// 사용:
//   node scripts/applyCopyTable.mjs --dry              # 무엇이 바뀔지만 낸다(파일 무접촉)
//   node scripts/applyCopyTable.mjs --write --only H,J # 실제로 바꾼다(구역 머리글자로 고른다)
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';

const DOC = 'docs/tasks/futurenow_copy_replacement_final (1).md';
const WRITE = process.argv.includes('--write');
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const ONLY = onlyArg ? onlyArg.slice(7).split(',') : null;
const skipArg = process.argv.find((a) => a.startsWith('--skip='));
const SKIP = skipArg ? skipArg.slice(7).split(',') : [];

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (['node_modules', '.next', '.git'].includes(e)) continue;
    const p = `${dir}/${e}`;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e)) out.push(p);
  }
  return out;
}
const ALL = walk('src');

/** 표 칸을 코드에서 찾을 후보 문자열들로 — **변형은 둘뿐이다.** */
function candidates(cell) {
  const raw = cell.trim();
  const out = [raw];
  const unticked = raw.replace(/^`|`$/g, '');
  if (unticked !== raw) out.push(unticked);
  for (const s of [...out]) {
    if (s.includes('**')) out.push(s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'));
  }
  return [...new Set(out)];
}

const rows = [];
let lastFile = null;
for (const line of readFileSync(DOC, 'utf8').split('\n')) {
  if (!line.startsWith('|')) continue;
  const c = line.split('|').slice(1, -1).map((x) => x.trim());
  if (c.length < 4) continue;
  const [id, where, cur, next] = c;
  if (!/^[A-Z]-\d{2}$/.test(id)) continue;
  const m = where.match(/`([^`]+?):(\d+)(?:-\d+)?`/);
  if (!m) { rows.push({ id, where, cur, next, file: null }); continue; }
  let p = m[1];
  if (!p.includes('/') && lastFile) {
    const same = lastFile.slice(0, lastFile.lastIndexOf('/') + 1) + p;
    if (existsSync(same)) p = same;
  }
  if (!existsSync(p)) {
    const suffix = p.replace(/^\.\.\.\//, '');
    const hits = ALL.filter((f) => f.endsWith('/' + suffix) || f === suffix);
    if (hits.length >= 1) p = hits[0];
  }
  if (existsSync(p)) lastFile = p;
  rows.push({ id, where, cur, next, file: p });
}

const pending = rows.filter((r) => {
  if (SKIP.includes(r.id)) return false;
  if (ONLY && !ONLY.includes(r.id[0]) && !ONLY.includes(r.id)) return false;
  return true;
});

const edits = new Map(); // file → [{id, from, to}]
const problems = [];
for (const r of pending) {
  if (!r.file || !existsSync(r.file)) { problems.push(`${r.id} 파일 없음: ${r.where}`); continue; }
  if (/동일 문자열|같은 문자열|동일하게/.test(r.cur) || /동일하게/.test(r.next)) {
    problems.push(`${r.id} 참조 행 — 손으로 판단한다: ${r.next.slice(0, 40)}`); continue;
  }
  const src = readFileSync(r.file, 'utf8');
  // 한 칸에 문장이 둘이면 ` / ` 로 갈라 **각각** 바꾼다(짝이 맞아야 한다).
  const froms = r.cur.split(' / ');
  const tos = r.next.split(' / ');
  if (froms.length !== tos.length) { problems.push(`${r.id} 현재/대체 토막 수가 다르다 (${froms.length} vs ${tos.length})`); continue; }
  for (let i = 0; i < froms.length; i++) {
    let hit = null;
    for (const cand of candidates(froms[i])) {
      const n = src.split(cand).length - 1;
      if (n === 1) { hit = cand; break; }
      if (n > 1) { problems.push(`${r.id} 후보가 ${n}번 나온다(모호): ${cand.slice(0, 40)}`); hit = 'AMBIG'; break; }
    }
    if (hit === null) { problems.push(`${r.id} 현재문장을 못 찾음: ${froms[i].slice(0, 46)}`); continue; }
    if (hit === 'AMBIG') continue;
    // ★ **대체문장의 백틱은 «매치한 후보와 같은 모양» 일 때만 벗긴다**(실측 2026-08-29).
    //   무조건 벗겼더니 **템플릿 리터럴의 백틱이 사라져** `participantMirror.ts` 가 깨졌다 —
    //   표의 백틱은 «코드 표기» 이고 소스의 백틱은 «문법» 이라 같은 기호가 두 뜻이다.
    //   매치한 후보(`hit`)가 백틱을 벗긴 형태였을 때만 `to` 도 벗긴다.
    const rawFrom = froms[i].trim();
    const strippedFrom = rawFrom.replace(/^`|`$/g, '');
    let to = tos[i].trim();
    if (hit === strippedFrom && strippedFrom !== rawFrom) to = to.replace(/^`|`$/g, '');
    if (hit.includes('<b>') && to.includes('**')) to = to.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    if (!edits.has(r.file)) edits.set(r.file, []);
    edits.get(r.file).push({ id: r.id, from: hit, to });
  }
}

console.log(`대상 ${pending.length}건 · 바꿀 자리 ${[...edits.values()].reduce((a, b) => a + b.length, 0)}곳 · 문제 ${problems.length}건`);
for (const p of problems) console.log('  ★ ' + p);
for (const [f, list] of edits) {
  console.log(`\n${f}`);
  for (const e of list) console.log(`   ${e.id}  ${e.from.slice(0, 44)}\n        → ${e.to.slice(0, 44)}`);
}

if (WRITE) {
  for (const [f, list] of edits) {
    let src = readFileSync(f, 'utf8');
    for (const e of list) {
      const n = src.split(e.from).length - 1;
      if (n !== 1) { console.log(`  ★ 쓰기 직전 확인 실패 ${e.id}: ${n}번 — 건너뛴다`); continue; }
      src = src.split(e.from).join(e.to);
    }
    writeFileSync(f, src, 'utf8');
  }
  console.log('\n썼다.');
} else {
  console.log('\n(예행 — 파일을 쓰지 않았다)');
}
