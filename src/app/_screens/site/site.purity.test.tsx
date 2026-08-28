// **부품은 계산하지 않는다** — 9종 전부에 대한 수입 가드 (4차 F-1 · 지휘부 강조 ①).
//
// 발주 §3-8 은 8번에만 적었으나 지휘부가 *"9종 전부에 적용"* 으로 못 박았다.
// 규칙으로 두면 매번 사람이 확인해야 하지만, **수입을 금지하면 어길 경로가 없다.**
//   (assessmentAccess 수입 가드 · resizeImage 값 잠금과 같은 계열)
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIR = 'src/app/_screens/site';

/** 발주 §3 의 아홉. 아래 순수성 가드는 **이 아홉에만** 건다. */
const PARTS = [
  // F-1 의 아홉
  'CardBand3.tsx', 'GrowAxis.tsx', 'MenuSheet.tsx', 'QuickTiles.tsx', 'RoleCard.tsx',
  'SessionChipStrip.tsx', 'SiteGnb.tsx', 'SiteHero.tsx', 'WeekTimeline.tsx',
  // F-2 가 더한 넷 (§9.7 #10~#13)
  'NewsRow.tsx', 'RecruitCard.tsx', 'SectionTitle.tsx', 'SiteFooter.tsx',
  // F-2b 가 더한 둘 (§9.7 #14~#15 — 발주 F2b §3 사양 승인분)
  'LeaderCard.tsx', 'BookPanel.tsx',
];
/** 부품이 아닌 동거 파일. **명시하지 않으면 통과하지 못한다** — 새 파일이 조용히 끼어들 자리를 없앤다.
 *
 *  `PublicGnb.tsx` 는 5차 소건 1-바 로 생겼다. **부품이 아니라 화면 층**이다 —
 *  세션 유무를 읽어(`document.cookie`) 판정 결과를 `SiteGnb` 에 prop 으로 내려준다.
 *  그래서 아래 순수성 가드(데이터 수입 금지 · 시간 금지)를 걸지 않는다.
 *  **이 파일이 부품 목록에 들어가면 안 된다** — 들어가면 가드가 그것을 부품으로 재게 되고,
 *  반대로 목록 어디에도 없으면 위 첫 테스트가 막는다. 둘 중 하나를 고르게 되어 있다. */
const NOT_PARTS = ['SiteGallery.tsx', 'galleryFixture.tsx', 'PublicGnb.tsx'];

const files = readdirSync(DIR).filter((f) => /\.tsx$/.test(f) && !f.includes('.test.'));

describe('site 부품 — 계산하지 않는다', () => {
  it('15종이 모두 있고, 그 밖의 파일은 이름이 적혀 있다', () => {
    expect(files.filter((f) => !NOT_PARTS.includes(f)).sort()).toEqual([...PARTS].sort());
    // 적어 둔 비-부품이 실제로 있는지도 본다 — 지워진 이름이 목록에 남으면 가드가 헐거워진다.
    for (const f of NOT_PARTS) expect(files, `${f} 가 없다 — NOT_PARTS 에서 지워라`).toContain(f);
  });

  it('**데이터에 접근하지 않는다** — CoreContext·supabase 수입 0(발주 §5-4)', () => {
    for (const f of PARTS) {
      const src = readFileSync(join(DIR, f), 'utf8');
      const imports = src.split('\n').filter((l) => /^\s*import\b/.test(l)).join('\n');
      for (const banned of ['@/core/supabase', 'createServerContext', 'createBrowserSupabase', '@/contracts/core-context']) {
        expect(imports, `${f} 가 ${banned} 를 수입한다 — 데이터는 화면(page) 층의 일이다`).not.toContain(banned);
      }
    }
  });

  it('**시간을 보지 않는다** — 상태·판정은 prop 이다', () => {
    // 지금이 몇 회차인지·열렸는지는 서버가 안다. 부품이 날짜를 보면 진실이 둘이 된다.
    for (const f of PARTS) {
      const src = readFileSync(join(DIR, f), 'utf8');
      const code = src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
      for (const banned of ['Date.now(', 'new Date(', 'Math.random(']) {
        expect(code, `${f} 가 ${banned} 를 쓴다 — 판정은 서버가 한다`).not.toContain(banned);
      }
    }
  });

  it('**이모지 아이콘을 쓰지 않는다**(발주 §5-3) — 인라인 SVG 만', () => {
    // 이모지는 기기마다 다른 그림이 나오고 색을 제어할 수 없다.
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    for (const f of PARTS) {
      const src = readFileSync(join(DIR, f), 'utf8');
      const code = src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
      const hit = code.match(emoji);
      expect(hit, `${f} 에 이모지 ${hit?.[0]} 가 있다`).toBeNull();
    }
  });

  it('**@media 임의 수치가 없다** — §3.1 브레이크포인트만(발주 §2)', () => {
    const css = readFileSync(join(DIR, 'site.css'), 'utf8');
    const widths = [...css.matchAll(/@media[^{]*?(\d+)px/g)].map((m) => Number(m[1]));
    expect(widths.length, '반응형 규칙이 있어야 한다').toBeGreaterThan(0);
    for (const w of widths) {
      expect([640, 768, 1024, 1280], `${w}px 는 §3.1 브레이크포인트가 아니다`).toContain(w);
    }
  });

  it('**시안 색값을 옮기지 않았다**(발주 §1.1·§5-3)', () => {
    // 시안 팔레트는 네이비 #1B2A41 · 골드 #C9A24B 이고 앱 정본과 다르다.
    for (const f of [...files, 'site.css', 'siteTokens.ts', 'publicNav.ts', 'programCopy.ts', 'siteContent.ts']) {
      const src = readFileSync(join(DIR, f), 'utf8').toLowerCase();
      expect(src, `${f} 에 시안 네이비가 있다`).not.toContain('#1b2a41');
      expect(src, `${f} 에 시안 골드가 있다`).not.toContain('#c9a24b');
    }
  });

  it('참여자 노출 부품에 순위·집계·경고색이 없다(불변식 9·11 · 발주 §3 금지 재확인)', () => {
    for (const f of ['RoleCard.tsx', 'QuickTiles.tsx', 'MenuSheet.tsx', 'SessionChipStrip.tsx']) {
      const src = readFileSync(join(DIR, f), 'utf8');
      const code = src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
      for (const banned of ['--color-danger', '--color-care', 'sort(', '순위', '백분위']) {
        expect(code, `${f} 에 ${banned} 가 있다`).not.toContain(banned);
      }
    }
  });
});
