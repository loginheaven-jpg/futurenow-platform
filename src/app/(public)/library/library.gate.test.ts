// 서가 관문 잠금 — **주소가 새지 않는가**(수용 기준 ★).
//
// 이 잠금은 **코드에 사는 사실**만 잰다. DB 판정(보류·회기·등급)은 `BEGIN…ROLLBACK` 예행으로
//   실계정을 건드리지 않고 재고 그 결과를 보고서에 적는다 — 여기서 흉내 내지 않는다.
//   **흉내 낸 판정은 내가 만든 것을 내가 부르는 것이라 아무것도 증명하지 못한다**(계열 ⑦).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (f: string) => readFileSync(f, 'utf8');

describe('§4 — 주소가 목록·화면으로 새지 않는다', () => {
  it('★ `LibraryItem` 타입에 **주소 칸이 없다** — 규칙이 아니라 타입으로 막았다', () => {
    const domain = read('src/contracts/domain.ts');
    const block = domain.slice(domain.indexOf('export interface LibraryItem'), domain.indexOf('export interface LibrarySource'));
    expect(block).not.toContain('storagePath');
    expect(block).not.toContain('url');
    // 주소는 **서버 안에서만 사는 타입**에만 있다.
    const src = domain.slice(domain.indexOf('export interface LibrarySource'), domain.indexOf('export interface LibraryAddInput'));
    expect(src).toContain('storagePath');
  });

  it('목록 화면·부품이 주소를 다루지 않는다', () => {
    for (const f of ['src/app/(public)/library/page.tsx', 'src/app/(public)/library/LibraryList.tsx']) {
      expect(read(f), `${f} 가 주소를 만진다`).not.toMatch(/storagePath|signedUrl|createSignedUrl/);
    }
  });

  it('★ 서명 URL 을 쓰지 않는다 — 잔여 창이 남기 때문이다(판정 ④)', () => {
    // 코어 전체에서 서가 서명 URL 경로가 사라졌는지 잰다. 되살아나면 여기서 운다.
    const core = read('src/core/context.ts');
    expect(core).not.toContain('signLibraryFile');
    expect(core).not.toContain("createSignedUrl(storagePath");
    // 대신 프록시가 **바이트를 흘린다.**
    const route = read('src/app/(public)/library/[id]/file/route.ts');
    expect(route).toContain('downloadLibraryFile');
    expect(route).not.toContain('redirect');
    expect(route, '중간 캐시가 들고 있으면 그것이 곧 잔여 창이다').toContain('no-store');
  });

  it('★ 자료 화면은 **게이트가 데이터보다 먼저다**', () => {
    const page = read('src/app/(public)/library/[id]/page.tsx');
    const gateAt = page.indexOf('openLibraryItem');
    const notFoundAt = page.indexOf('notFound()');
    const renderAt = page.indexOf('<LibraryItemView');
    expect(gateAt).toBeGreaterThan(0);
    expect(notFoundAt).toBeGreaterThan(gateAt);
    expect(renderAt, '게이트보다 먼저 그리면 못 보는 사람에게 내용이 간다').toBeGreaterThan(notFoundAt);
  });
});

describe('§3 — 등급 이름을 직접 비교하지 않는다', () => {
  it('화면이 `member_tool_access` 를 흉내 내지 않는다', () => {
    for (const f of ['src/app/(public)/library/page.tsx', 'src/app/(public)/library/UploadPanel.tsx',
                     'src/app/(public)/library/LibraryList.tsx']) {
      const s = read(f);
      expect(s, `${f} 가 등급을 직접 판정한다`).not.toMatch(/=== *'individual'|=== *'expired'|memberState/);
    }
  });

  it('올릴 자격은 **서버가 낸 값**을 그대로 쓴다', () => {
    expect(read('src/app/(public)/library/page.tsx')).toContain('canUploadLibrary');
    expect(read('src/app/(public)/library/UploadPanel.tsx')).toContain('canUpload');
  });
});

describe('§11 — 껍데기와 잇는다', () => {
  it('새 라우트 둘이 표에 있다', () => {
    const table = read('src/app/_lib/screenChrome.ts');
    expect(table).toContain("'/library':");
    expect(table).toContain("'/library/[id]':");
  });

  it('★ 화면이 헤더를 그리지 않는다 · 통로를 새로 만들지 않았다', () => {
    for (const f of ['src/app/(public)/library/page.tsx', 'src/app/(public)/library/[id]/page.tsx',
                     'src/app/(public)/library/[id]/LibraryItemView.tsx']) {
      expect(read(f), `${f} 가 헤더를 그린다`).not.toContain('<AppHeader');
    }
    // 제목은 U-4 가 세운 통로가 든다. 새 기제가 아니다.
    expect(read('src/app/(public)/library/[id]/LibraryItemView.tsx')).toContain('useSetChrome');
  });
});
