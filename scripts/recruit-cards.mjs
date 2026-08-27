// 모집 카드뉴스 → `/recruit` 우측 그리드용 **웹 처리본 생성** (4차 F-4 후속).
//
// **원본은 건드리지 않는다.** `docs/tasks/cards/` 는 확정 원본이고 이 스크립트는 읽기만 한다.
//   `public/recruit/` 에 들어가는 것은 **파생물**이다 — 사본이 둘이 아니라 원본 하나와 파생 하나이고,
//   **그 관계를 이 스크립트가 잠근다**(지휘부 판정). 원본이 바뀌면 여기를 다시 돌린다.
//
// **선정과 순서는 지휘부가 정했다** — 2 · 3 · 6 · 7.
//   *"문제에서 답, 증언으로 가는 흐름이 순서에 실려 있다"* 이므로 **배열 순서도 고정**이다.
//   여기 배열 순서가 곧 화면 순서다. 화면이 다시 정렬하지 않는다.
//
// **선정·순서·`alt` 는 `src/app/recruit/cards.ts` 가 든다.** 여기 두면 목록이 둘이 되고
//   파일과 alt 가 어긋난다 — 이 스크립트는 그 한 곳을 읽어 파생물만 만든다.
//
// 규격: WebP · 장변 800px 내외(발주). 원본은 1080×1080 정사각이다.
//
// 실행: `node scripts/recruit-cards.mjs`
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import sharp from 'sharp';

const SRC = 'docs/tasks/cards';
const OUT = 'public/recruit';
const EDGE = 800;

/**
 * 선정·순서·alt 는 **앱이 든다**(`src/app/recruit/cards.ts`) — 목록이 둘이면 파일과 alt 가 어긋난다.
 * 이 스크립트는 그 한 곳을 읽어 파생물을 만들 뿐이다. 파싱이 실패하면 **조용히 넘어가지 않고 멈춘다.**
 */
function readCards() {
  const src = readFileSync('src/app/recruit/cards.ts', 'utf8');
  const rows = [...src.matchAll(/\{\s*n:\s*(\d+),\s*src:\s*'([^']+)'/g)].map((m) => ({
    n: Number(m[1]),
    out: m[2].replace(/^\/recruit\//, ''),
    file: `card_${String(m[1]).padStart(2, '0')}.png`,
  }));
  if (rows.length === 0) throw new Error('cards.ts 에서 목록을 읽지 못했다 — 형식이 바뀌었는지 본다');
  return rows;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const cards = readCards();
  const manifest = [];

  for (const c of cards) {
    const src = `${SRC}/${c.file}`;
    if (!existsSync(src)) throw new Error(`원본 없음: ${src}`);
    const before = readFileSync(src);
    const meta = await sharp(before).metadata();

    const name = c.out;
    const buf = await sharp(before)
      // `fit: 'inside'` — 잘라내지 않는다. 카드뉴스는 글자가 가장자리까지 차 있어
      //   크롭하면 문장이 잘린다. 정사각 원본이라 결과도 800×800 이다.
      .resize({ width: EDGE, height: EDGE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    writeFileSync(`${OUT}/${name}`, buf);

    // **원본이 그대로인지 확인한다** — 읽기만 했으므로 바이트가 같아야 한다.
    if (Buffer.compare(before, readFileSync(src)) !== 0) throw new Error(`원본이 변했다: ${src}`);

    manifest.push({ n: c.n, src: `/recruit/${name}` });
    const pct = Math.round((buf.length / before.length) * 100);
    console.log(
      `  카드 ${String(c.n).padStart(2)} → ${name}  ${meta.width}x${meta.height} → ${EDGE}px  ` +
        `${(before.length / 1024).toFixed(0)}KB → ${(buf.length / 1024).toFixed(0)}KB (${pct}%)`,
    );
  }

  console.log(`\n  총 ${manifest.length}장 · ${OUT}/`);
  console.log('  원본 무접촉 확인 완료 — 바이트 동일');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
