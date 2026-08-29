// 프런트 문장 대체표 — **착수 전 대조**(지휘부 실측 ① 2026-08-29).
//
// **왜 재는가**: 표는 **파일 경로와 행 번호**로 자리를 짚는다. 그런데 기준 커밋(`b107ea0`) 이후
//   `main` 이 네 번 나갔고 그중 하나는 **껍데기를 통째로 갈아엎은 회차**다.
//   서가 발주서가 하루 낡은 저장소를 보고 쓰였던 그 자리와 같다 — **같은 일이 또 있다고 보고 잰다.**
//
// **무엇을 재는가**(자리마다 셋):
//   ⑴ 파일이 실재하는가
//   ⑵ `현재문장` 이 그 파일 **어딘가에** 있는가  ← 이것이 참값이다
//   ⑶ 표가 적은 **행 번호**가 맞는가             ← 어긋나도 치명적이지 않으나 낡음의 지표다
//
// **문자열 비교는 «핵심 토막» 으로 한다** — 표는 마크다운이라 `<br />`·백틱·개행이 섞인다.
//   원문 그대로 비교하면 **거짓 불일치**가 쏟아진다(창이 좁다). 그래서 한글·숫자만 남겨 견준다.
//
// 사용: node scripts/copyTableAudit.mjs [표.md]
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';

/** 저장소의 소스 파일 전부 — 줄임 경로를 **접미사로** 찾기 위해 한 번 훑는다. */
function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === '.next' || e === '.git') continue;
    const p = `${dir}/${e}`;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|mjs|json|md)$/.test(e)) out.push(p);
  }
  return out;
}
const ALL = walk('src').concat(walk('docs/tasks'));

const DOC = process.argv[2] ?? 'docs/tasks/futurenow_copy_replacement_final (1).md';
const md = readFileSync(DOC, 'utf8');

/** 표 한 줄을 칸으로 나눈다. 칸 안의 `|` 는 코드 백틱 안에 있을 수 있으므로 단순 분할로 충분한지 확인하며 쓴다. */
function cells(line) {
  return line.split('|').slice(1, -1).map((c) => c.trim());
}

/** 비교용 정규화 — **한글·영숫자만 남긴다.** 마크다운 장식·공백·개행 차이로 지는 것을 막는다. */
function norm(s) {
  return s
    .replace(/`/g, '')
    // ★ **강조 태그만 걷는다.** 두 번 틀린 자리다:
    //   ⑴ `<br />` 만 걷었더니 `<b>` 의 `b` 가 **글자로 남아** 표와 코드가 어긋났다.
    //   ⑵ 그래서 `<[^>]*>` 로 넓혔더니 **여러 줄 JSX 여는 태그**(`<AssessmentsScreen … >`)가
    //      본문까지 통째로 삼켜 멀쩡한 아홉을 «없다» 로 만들었다.
    //   좁지도 넓지도 않은 창은 **강조 태그 넷**이다.
    .replace(/<\/?(b|i|strong|em)>/gi, '')
    .replace(/<br\s*\/?>/gi, '')
    .replace(/\\n/g, '')
    .replace(/[^0-9A-Za-z가-힣]/g, '');
}

const rows = [];
let lastFile = null;
for (const line of md.split('\n')) {
  if (!line.startsWith('|')) continue;
  const c = cells(line);
  if (c.length < 4) continue;
  const [id, where, cur, next] = c;
  if (!/^[A-Z]-\d{2}$/.test(id)) continue; // 머리·구분줄 건너뛰기
  // 위치: `경로:행` 또는 `파일명:행`(앞 줄의 경로를 물려받는다)
  // **행 범위(`:289-290`)도 받는다** — 앞의 수를 쓴다.
  const m = where.match(/`([^`]+?):(\d+)(?:-\d+)?`/);
  if (!m) { rows.push({ id, where, cur, next, file: null, line: null }); continue; }
  let [, p, ln] = m;
  // **맨 파일명은 «앞 줄과 같은 디렉터리» 다** — 접미사로 찾으면 `about/page.tsx` 같은
  //   다른 화면으로 끌려간다(첫 판이 H-02·03·05 를 그렇게 잘못 짚었다).
  if (!p.includes('/') && lastFile) {
    const sameDir = lastFile.slice(0, lastFile.lastIndexOf('/') + 1) + p;
    if (existsSync(sameDir)) p = sameDir;
  }
  if (!existsSync(p)) {
    // **줄임 경로는 접미사다**(`entry/AuthGate.tsx` · `checkin/session1.ts` · `.../a/b.tsx`).
    //   앞 줄의 «디렉터리에 붙이는» 방식은 틀렸다 — 그것이 첫 판에서 34건을 «파일 없음» 으로 만들었다.
    const suffix = p.replace(/^\.\.\.\//, '');
    const hits = ALL.filter((f) => f.endsWith('/' + suffix) || f === suffix);
    if (hits.length === 1) p = hits[0];
    else if (hits.length > 1 && lastFile) {
      const same = hits.find((f) => f.startsWith(lastFile.slice(0, lastFile.lastIndexOf('/'))));
      p = same ?? hits[0];
    } else if (hits.length > 1) p = hits[0];
  }
  if (existsSync(p)) lastFile = p;
  rows.push({ id, where, cur, next, file: p, line: Number(ln) });
}

// `--files` — 표가 실제로 짚는 **해석된 파일 목록**을 낸다(줄임 경로까지 푼 값이다).
if (process.argv.includes('--files')) {
  const set = [...new Set(rows.map((r) => r.file).filter(Boolean))].sort();
  for (const f of set) console.log(f);
  process.exit(0);
}

console.log(`표에서 읽은 항목 ${rows.length}건 (문서: ${DOC})`);

const missFile = [], missText = [], wrongLine = [], ok = [];
for (const r of rows) {
  if (!r.file) { missFile.push(`${r.id} 위치를 못 읽음: ${r.where}`); continue; }
  if (!existsSync(r.file)) { missFile.push(`${r.id} ${r.file} — 파일 없음`); continue; }
  const src = readFileSync(r.file, 'utf8');
  const lines = src.split('\n');
  // **한 칸에 문장이 둘일 수 있다**(`lead` + `step2` 처럼). ` / ` 로 갈라 **각각** 찾는다 —
  //   붙여서 찾으면 실재하는데도 «없다» 가 된다(첫 판이 J-07~09·D-12·13 을 그렇게 읽었다).
  if (/동일 문자열|같은 문자열/.test(r.cur)) { ok.push(r.id); continue; } // 다른 항목을 가리키는 참조 행
  const parts = r.cur.split(' / ').map(norm).filter((x) => x.length >= 4);
  if (parts.length === 0) { ok.push(r.id); continue; }
  const flat = norm(src);
  const missing = parts.filter((x) => !flat.includes(x));
  if (missing.length) { missText.push({ id: r.id, file: r.file, line: r.line, cur: r.cur.slice(0, 46), n: `${missing.length}/${parts.length} 토막` }); continue; }
  const needle = parts[0];
  // 행 번호 확인 — 그 줄 ±3 안에 있는가
  const near = lines.slice(Math.max(0, r.line - 4), r.line + 3).join('');
  if (!norm(near).includes(needle.slice(0, Math.min(20, needle.length)))) {
    wrongLine.push({ id: r.id, file: r.file, said: r.line });
  } else ok.push(r.id);
}

console.log(`\n① 파일이 없거나 위치를 못 읽음 ${missFile.length}건`);
for (const x of missFile) console.log('   ' + x);
console.log(`\n② ★ **현재문장이 저장소에 없다** ${missText.length}건 — 표가 낡은 자리다`);
for (const x of missText) console.log(`   ${x.id}  ${x.file}:${x.line}  (${x.n}) 「${x.cur}…」`);
console.log(`\n③ 문장은 있으나 **행 번호가 어긋난다** ${wrongLine.length}건`);
for (const x of wrongLine) console.log(`   ${x.id}  ${x.file} — 표는 ${x.said} 행이라 한다`);
console.log(`\n그대로 맞는 것 ${ok.length}건 / 전체 ${rows.length}건`);
