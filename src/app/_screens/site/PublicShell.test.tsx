import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, readdirSync } from 'node:fs';
import { PublicShell } from './PublicShell';
import { SITE_NAME, SITE_ORG, PUBLIC_MENU_TITLE } from './publicNav';

// 공개 껍데기 — **화면에서 옮겨온 단언이 사는 자리** (U-1).
//
// `/` 와 `/about` 의 테스트가 헤더·푸터 링크를 재고 있었다. 그 층이 껍데기로 올라갔으므로
//   단언도 함께 올라온다 — **지우지 않고 옮겼다.** 지우면 *로그인 문이 있는가* 를
//   아무도 재지 않게 되고, 그것이 이 이관에서 잃기 가장 쉬운 것이다.
//  이 U-2 부터 크롬 표를 찾느라 `useParams` 도 쓴다.
// PublicShell 이 U-2 부터 크롬 표를 찾느라 useParams 도 쓴다.
vi.mock('next/navigation', () => ({ usePathname: () => '/', useParams: () => ({}) }));

const html = renderToStaticMarkup(<PublicShell><div id="본문" /></PublicShell>);

describe('공개 껍데기 — 상단바와 푸터가 한 곳에 선다', () => {
  it('상단바와 푸터를 그린다', () => {
    expect(html).toContain('site-gnb');
    expect(html).toContain('site-foot');
  });

  it('**본문을 그대로 통과시킨다** — 껍데기가 화면을 고쳐 쓰지 않는다', () => {
    expect(html).toContain('id="본문"');
  });

  it('로그인·인도자 진입 → `/login`·`/signup` (화면에서 옮겨온 단언)', () => {
    expect(html).toContain('href="/login"');
    expect(html).toContain('로그인');
    expect(html).toContain('href="/signup"');
    expect(html).toContain('인도자 회원가입');
  });

  it('공개 영역으로 가는 길이 있다 (화면에서 옮겨온 단언)', () => {
    for (const href of ['/about', '/library', '/contact', '/news']) {
      expect(html, href).toContain(`href="${href}"`);
    }
  });

  it('**서버 스냅샷은 비로그인이다** — 정적 HTML 이 그렇게 캐시되므로 같아야 한다', () => {
    // ADR-138 그대로다. 다르면 하이드레이션이 어긋나고 ISR 캐시가 거짓말을 한다.
    expect(html).toContain('href="/login"');
    expect(html).not.toContain('href="/home"');
  });

  it('로고는 처음 화면으로 이동만 한다 — 로그아웃이 아니다(§12.3 규칙 3)', () => {
    expect(html).toContain('href="/"');
    expect(html).not.toContain('로그아웃');
  });
});

describe('공개 모바일 메뉴 — 회원과 **같은 부품 한 벌** (최박사 문안 확정 2026-09-01)', () => {
  it('메뉴 여는 자리가 있다 — 768 미만에서 내비가 푸터만 들던 자리다', () => {
    expect(html, '햄버거가 없으면 모바일에서 메뉴를 열 길이 없다').toContain('site-gnb__burger');
  });

  it('**부품이 두 벌이 아니다** — 회원 껍데기가 쓰는 `MenuSheet` 을 그대로 문다', () => {
    const shell = readFileSync('src/app/_screens/site/PublicShell.tsx', 'utf8');
    const member = readFileSync('src/app/_screens/shell/MemberShell.tsx', 'utf8');
    // 공개는 `SiteGnb` 를 거쳐, 회원은 직접 — **부품 파일은 하나**다.
    expect(shell, '공개가 시트를 넘기지 않는다').toContain('sheet={{');
    expect(member).toContain("from '@/app/_screens/site/MenuSheet'");
    // 시트를 새로 만든 파일이 생기면 여기서 잡힌다.
    const sheets = readdirSync('src/app/_screens/site').filter((f) => /MenuSheet/.test(f) && !f.endsWith('.test.tsx'));
    expect(sheets, '메뉴 시트 부품이 둘 이상이다').toEqual(['MenuSheet.tsx']);
  });

  it('**문안을 지어내지 않았다** — 둘 다 이미 있는 말이고, 관계를 잠근다', () => {
    // 값이 아니라 **관계**를 잠근다 — 한쪽만 고치면 레드가 난다(`CLAUDE.md` §11).
    // ★ **전제가 바뀌었다**(릴레이 지시 2026-08-30) — 푸터에서 「청계로벤하임」을 걷어
    //   소속 표기가 서비스 이름과 **같아졌다**. 「전체는 쓰지 않으신다」가 가리키던 대상이 없어졌다.
    //   **결정으로 없어진 것을 잠금이 붙들면 그 잠금이 낡은 것이다** — 그래서 뒤집되,
    //   지키려던 것(둘이 갈리지 않는다)은 **더 강하게** 잠근다: 사본이 아니라 **같은 값**이어야 한다.
    expect(SITE_ORG.startsWith(SITE_NAME), '시트 머리 이름은 소속 표기의 앞부분이다').toBe(true);
    expect(SITE_ORG, '소속 표기가 서비스 이름과 갈렸다 — 사본을 만들지 않는다').toBe(SITE_NAME);
    const footer = readFileSync('src/app/_screens/site/SiteFooter.tsx', 'utf8');
    expect(footer, '묶음 제목은 푸터 내비가 이미 쓰던 이름이다').toContain(`aria-label="${PUBLIC_MENU_TITLE}"`);
  });
});
