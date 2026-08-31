// 소개 상세(/about) 잠금 (4차 F-2).
//
// **현관에서 옮겨 온 것을 여기서 잠근다.** 시안 P1 의 현관에는 소개 3단락이 없어
//   `/` 에서 뺐다 — 그러면 `page.test.tsx` 가 지키던 `어떤 시간인가요…` 세 소제목이
//   **아무 데서도 지켜지지 않는다.** 옮긴 곳에 같은 잠금을 다시 건다.
//   (규율을 옮기지 않고 화면만 옮기면, 다음 사람이 지워도 아무도 모른다.)
import { describe, expect, it, beforeAll } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import About from './page';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

describe('/about — 소개 상세', () => {
  let html = '';
  beforeAll(() => {
    html = renderToStaticMarkup(<About />);
  });

  it('**소개 세 단락(의문형 소제목)** — `/` 에서 옮겨 온 잠금', () => {
    expect(html).toContain('어떤 시간인가요');
    expect(html).toContain('무엇이 달라지나요');
    expect(html).toContain('어떻게 진행되나요');
    expect(html).toContain('사전 체크'); // 진행 본문
  });

  it('참여 경로 셋이 다 있다 — 신청·로그인·단체 구매 문의', () => {
    // F-2b 에서 `/about` 구성이 발주 §4 순서로 바뀌었다. `/recruit` 대신 **신청 CTA 가 `/join`** 이다
    //   (원고 §7 — 신청 도착점은 `/join`). 로그인은 GNB, 문의는 도서 단체 구매 줄이 든다.
    // **`/login` 은 껍데기(GNB)로 옮겼다**(U-1) — `PublicShell.test.tsx` 가 잰다.
    //   본문이 스스로 거는 둘은 여기가 계속 잰다.
    for (const href of ['/join', '/contact']) {
      expect(html, href).toContain(`href="${href}"`);
    }
  });

  it('**골드 primary 는 세미나 신청 전용이다**(원고 §3.4 위계) — 구매 버튼은 ghost', () => {
    expect(html).toContain('--color-text-on-gold'); // 신청 CTA 만 골드 면
    const buy = html.slice(html.indexOf('kyobobook') - 200, html.indexOf('kyobobook') + 200);
    expect(buy, '구매 버튼이 골드면 위계가 무너진다').toContain('ui-btn--ghost');
    expect(buy).toContain('rel="noopener noreferrer"');
    expect(buy).toContain('target="_blank"');
  });

  it('공개 화면 규율 — 의미색 토큰 0', () => {
    for (const token of ['--care-', '--color-danger', '--color-warning']) {
      expect(html, token).not.toContain(token);
    }
  });

  it('**새 형태를 만들지 않았다** — 시안 없는 화면이라 승인 부품만 쓴다(불변식 20)', () => {
    // 부품이 남기는 클래스만으로 화면이 선다. `site-` 접두 밖의 새 조어가 없다는 뜻은 아니고,
    //   **§9.7 부품과 기존 `ui-` 공용 부품 밖의 형태를 새로 짓지 않았다**는 뜻이다.
    // `site-gnb`·`site-foot` 은 **껍데기가 그린다**(U-1) — 그 둘은 `PublicShell.test.tsx` 가 잰다.
    for (const cls of ['site-hero', 'site-grow', 'site-sect', 'site-leader', 'site-book']) {
      expect(html, cls).toContain(cls);
    }
    // 규칙 1 회귀 잠금 — 화면이 다시 그리기 시작하면 여기서 레드가 난다.
    for (const cls of ['site-gnb', 'site-foot']) expect(html, cls).not.toContain(cls);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 이미지 자산 (원고 §5) — **도착한 것만 그리고, 안 온 것은 자리표시자로 선다.**
//
// ★ **「배선했다」는 증거가 아니다.** `src` 를 넘기는 코드가 있어도 파일이 없으면
//   깨진 그림이 뜨고, 파일이 있어도 `<picture>` 짝이 어긋나면 폴백이 죽는다.
//   그래서 **렌더 산출물과 실제 파일 둘 다** 잰다.
describe('/about — 이미지 자산 (원고 §5)', () => {
  let html = '';
  beforeAll(() => { html = renderToStaticMarkup(<About />); });

  /** `public/` 에 실물이 있는가 — 화면이 가리키는 것과 같은 경로로 묻는다. */
  const present = (webPath: string) =>
    existsSync(join(process.cwd(), 'public', webPath.replace(/^\//, '')));

  it('★ 화면이 가리키는 이미지는 **전부 실재한다** — 깨진 그림이 없다', () => {
    const srcs = [...html.matchAll(/(?:src|srcSet)="(\/[^"]+\.(?:png|jpg|jpeg|webp))"/g)].map((m) => m[1]);
    // **물 것이 실재하는가**(계열 ⑦) — 하나도 못 찾으면 이 잠금은 헛돈다.
    expect(srcs.length, '화면에 이미지가 하나도 없다').toBeGreaterThan(0);
    for (const s of srcs) expect(present(s), `${s} 를 가리키는데 파일이 없다`).toBe(true);
  });

  it('★ WebP 와 폴백이 **짝으로** 있다 (원고 §5.4)', () => {
    // 부품이 `src.replace(/\.(jpg|png)$/, '.webp')` 로 짝을 찾는다.
    //   한쪽만 있으면 WebP 를 못 읽는 브라우저에서 그림이 사라지거나 그 반대가 된다.
    const fallbacks = [...html.matchAll(/src="(\/[^"]+\.(?:png|jpg))"/g)].map((m) => m[1]);
    expect(fallbacks.length, '폴백 이미지가 하나도 없다').toBeGreaterThan(0);
    for (const f of fallbacks) {
      const webp = f.replace(/\.(jpg|png)$/, '.webp');
      expect(present(webp), `${f} 의 WebP 짝(${webp})이 없다`).toBe(true);
      expect(html, `${webp} 가 <source> 로 걸리지 않았다`).toContain(webp);
    }
  });

  it('★ 도착한 자산은 그려지고, 안 온 자산은 **자리표시자**로 선다 (원고 §6.2)', () => {
    // 도착 여부를 손으로 적지 않는다 — `public/` 을 보고 그 사실로 기대를 만든다.
    //   그래야 남은 사진이 놓이는 날 이 잠금이 **저절로** 따라간다.
    const cases: [string, string][] = [
      ['/leaders/leader-lseungeun.jpg', '퓨처나우 저자이자 인도자 이승은'],
      ['/leaders/leader-cchulyoung.jpg', '퓨처나우 인도자 최철영 코치'],
      ['/book/book-cover-futurenow.png', '도서 퓨처나우 표지'],
    ];
    for (const [path, alt] of cases) {
      if (present(path)) {
        expect(html, `${path} 가 있는데 안 그려졌다`).toContain(path);
        expect(html, `${alt} 의 alt 가 없다`).toContain(alt);
      } else {
        // 자리표시자는 **이름을 남긴다** — 낭독기가 빈 상자를 읽지 않게.
        expect(html, `${path} 가 없는데 그려졌다`).not.toContain(path);
        expect(html, `${alt} 자리표시자가 없다`).toContain('준비 중');
      }
    }
  });

  it('★ 첫 화면 밖 이미지는 지연 로딩한다 (원고 §5.4)', () => {
    const imgs = [...html.matchAll(/<img[^>]*>/g)].map((m) => m[0]);
    expect(imgs.length, '이미지 태그가 없다').toBeGreaterThan(0);
    for (const t of imgs) expect(t, `지연 로딩이 없다: ${t.slice(0, 60)}`).toContain('loading="lazy"');
  });

  it('최철영 확대 상한이 코드로 막혀 있다 (원고 §5.2 — 전달본 329×427)', () => {
    // 원본이 작은 컷이라 키우면 뭉갠다. **주석이 아니라 코드로** 막는다.
    expect(html).toMatch(/max-width:\s*320px/);
  });
});
