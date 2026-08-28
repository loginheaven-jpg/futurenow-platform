// 껍데기 감사 — **주석을 걷어내고 센다** (U-0 · 지휘부 지시 2026-08-31).
//
// **왜 도구인가.** 이 회차에 주석 오측이 **셋**이었고 셋 다 다른 사람이 냈다:
//   ⑴ 클코1 — `member_state` 가 `valid_until` 을 보는지 세면서 **주석 한 줄**을 셌다
//   ⑵ 지휘부 — 헤더를 그리는 화면을 세면서 주석을 함께 세어 19가 됐다(실제 18)
//   ⑶ 지휘부 — 그 수로 만든 예외 목록에 `/home` 이 들어갔다(직접 그리지 않는다)
//
// **같은 함정을 세 번 밟았으므로 결심으로는 안 잡힌다.** `grep` 은 주석을 구분하지 못한다.
//   → **소스를 세는 명령은 주석을 걷어낸 뒤 센다.** 보고서에 수를 적을 때 이 도구를 쓴다.
//
// 사용:
//   node scripts/shellAudit.mjs          # 실측 대 예외 목록 대조 (어긋나면 exit 1)
//   node scripts/shellAudit.mjs --list   # 실측만 출력
import { readFileSync, readdirSync, statSync } from 'node:fs';

export const ROOT = 'src/app';
export const HEADER_PARTS = ['AppHeader', 'SiteGnb', 'PublicGnb'];

/**
 * 주석을 걷어낸다 — **블록 주석 먼저, 그 다음 줄 주석.**
 *
 * 문자열 안의 `//`(예: `https://…`)를 지우지 않으려고 **줄 전체가 주석인 줄만** 버린다.
 * 이 도구가 보는 것은 `^import` 뿐이므로 그 보수적 처리로 충분하다 —
 * **덜 지우는 쪽으로 틀리면 없는 것을 세지 않는다**(있는 것을 놓칠 뿐이고, 그 경우
 * 대조에서 드러난다). 반대로 과하게 지우면 조용히 0이 되어 아무도 모른다.
 */
export function stripComments(src) {
  const noBlock = src.replace(/\/\*[\s\S]*?\*\//g, '');
  return noBlock
    .split('\n')
    .filter((l) => {
      const t = l.trim();
      return !t.startsWith('//') && !t.startsWith('*');
    })
    .join('\n');
}

/** `src/app` 아래 모든 `.tsx` (`.ts` 는 헤더를 그리지 않는다 — JSX 가 없다). */
export function allScreenFiles(dir = ROOT, out = []) {
  for (const e of readdirSync(dir)) {
    const p = `${dir}/${e}`;
    if (statSync(p).isDirectory()) allScreenFiles(p, out);
    else if (e.endsWith('.tsx') && !e.endsWith('.test.tsx')) out.push(p);
  }
  return out.sort();
}

/** 그 파일이 **import 하는** 헤더 부품 이름들. 주석은 이미 걷혔다. */
export function headerImportsOf(file) {
  const src = stripComments(readFileSync(file, 'utf8'));
  const names = [];
  for (const m of src.matchAll(/^\s*import\s*\{([^}]*)\}\s*from\s*'([^']+)'/gm)) {
    if (!/(AppHeader|SiteGnb|PublicGnb)$/.test(m[2])) continue;
    for (const n of m[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0])) {
      if (HEADER_PARTS.includes(n)) names.push(n);
    }
  }
  return [...new Set(names)].sort();
}


/**
 * **라우트가 헤더를 그리는가 — 전이로 따라간다.**
 *
 * 한 단계만 보면 틀린다. 처음 잰 값이 그랬다 — `/coach/cohorts` 는 `AllCohortsClient` 를 거쳐
 * `AllCohorts` 가 헤더를 그리는데 **두 단계**라 「헤더 없음」으로 셌다.
 * **도구가 덜 보면 없는 것을 없다고 말한다.**
 */
export function routeHeaderMap() {
  const files = allScreenFiles();
  const drawn = new Map(files.map((f) => [f, headerImportsOf(f)]));
  const importsOf = (f) => {
    const src = stripComments(readFileSync(f, 'utf8'));
    const out = [];
    for (const m of src.matchAll(/^\s*import\s+[^;]*?from\s+'([^']+)'/gm)) {
      const spec = m[1];
      let base = spec.startsWith('@/') ? `src/${spec.slice(2)}`
        : spec.startsWith('.') ? norm(`${f.split('/').slice(0, -1).join('/')}/${spec}`) : null;
      if (!base) continue;
      for (const ext of ['.tsx', '/index.tsx']) if (files.includes(base + ext)) out.push(base + ext);
      if (files.includes(base)) out.push(base);
    }
    return out;
  };
  const norm = (p) => { const o = []; for (const seg of p.split('/')) { if (seg === '.' || seg === '') continue; if (seg === '..') o.pop(); else o.push(seg); } return o.join('/'); };
  const reach = (start) => {
    const seen = new Set([start]); const stack = [start]; const hits = [];
    while (stack.length) {
      const f = stack.pop();
      if (drawn.get(f)?.length) hits.push(`${f}:${drawn.get(f).join('+')}`);
      for (const n of importsOf(f)) if (!seen.has(n)) { seen.add(n); stack.push(n); }
    }
    return hits.sort();
  };
  // **레이아웃을 함께 본다** — 껍데기가 서면 헤더는 `layout` 이 그린다.
  //   이것이 없으면 U-1 뒤에 `/` 와 `/about` 이 **무헤더로 세어지고**(실제로 한 번 그랬다)
  //   진도 지표가 거꾸로 말한다. **도구가 덜 보면 없는 것을 없다고 한다** — 두 번째 사례다.
  const layoutsFor = (pageFile) => {
    const segs = pageFile.split('/'); const out = [];
    for (let i = segs.length - 1; i >= 2; i--) {
      const cand = `${segs.slice(0, i).join('/')}/layout.tsx`;
      if (files.includes(cand)) out.push(cand);
    }
    return out;
  };
  return files.filter((f) => f.endsWith('/page.tsx')).map((f) => ({
    route: f.replace(ROOT, '').replace('/page.tsx', '').replace(/\/\([^/]+\)/g, '') || '/',
    hits: [...new Set([...reach(f), ...layoutsFor(f).flatMap(reach)])].sort(),
  }));
}

/** 헤더를 직접 그리는 파일 전수 — `{ file, parts }[]`. */
export function scanDrawers() {
  return allScreenFiles()
    .map((file) => ({ file, parts: headerImportsOf(file) }))
    .filter((r) => r.parts.length > 0);
}

// **경로 비교를 하지 않는다** — 윈도우 역슬래시 때문에 한 번 깨졌다. 파일 이름으로 본다.
if ((process.argv[1] ?? '').endsWith('shellAudit.mjs')) {
  const found = scanDrawers();
  if (process.argv.includes('--routes')) {
    const rows = routeHeaderMap();
    const withH = rows.filter((r) => r.hits.length), without = rows.filter((r) => !r.hits.length);
    console.log(`헤더 있는 라우트 ${withH.length}개`);
    for (const r of withH) console.log(`  ${r.route.padEnd(46)} ${r.hits.join(' · ')}`);
    console.log(`
헤더 없는 라우트 ${without.length}개 (전이 추적 · 주석 제외)`);
    for (const r of without) console.log(`  ${r.route}`);
    process.exit(0);
  }
  if (process.argv.includes('--list')) {
    for (const r of found) console.log(`${r.file.padEnd(62)} ${r.parts.join('+')}`);
    console.log(`\n총 ${found.length}개 (주석 제외 실측)`);
    process.exit(0);
  }
  const cfg = JSON.parse(readFileSync('scripts/shellExceptions.json', 'utf8'));
  const exempt = new Set([...cfg.exemptParts, ...cfg.exemptDeclared, ...(cfg.exemptOutside ?? [])]);
  const listed = new Map(cfg.exceptions.map((e) => [e.file, e]));
  const fails = [];
  for (const r of found) {
    if (exempt.has(r.file)) continue;
    if (!listed.has(r.file)) fails.push(`목록에 없는 화면이 헤더를 그린다: ${r.file} (${r.parts.join('+')})`);
  }
  for (const e of cfg.exceptions) {
    if (!found.some((r) => r.file === e.file)) fails.push(`예외인데 더는 헤더를 그리지 않는다(지워라): ${e.file}`);
    if (!e.chunk) fails.push(`걷는 덩이가 없다: ${e.file}`);
  }
  const left = cfg.exceptions.length;
  console.log(`실측 ${found.length}개 · 면제 ${exempt.size}개 · 예외 ${left}개`);
  // **덩이 목록을 손으로 박지 않는다** — 박아 두었더니 U-4 가 생긴 날 조용히 안 세어졌다.
  //   데이터에서 뽑으면 낡을 수가 없다(`CLAUDE.md` §11 · 따라가야 하는 값).
  for (const c of [...new Set(cfg.exceptions.map((e) => e.chunk))].sort()) {
    console.log(`  ${c}: ${cfg.exceptions.filter((e) => e.chunk === c).length}개`);
  }
  if (fails.length) { for (const f of fails) console.error(`  X ${f}`); process.exit(1); }
  console.log(left === 0 ? 'O 예외가 비었다 — 껍데기 이관 완료' : 'O 목록과 실측이 일치한다');
}
