// site 부품 렌더 단언 (4차 F-1).
//
// **"무엇이 깨지면 안 되는가"에 맞춘다**(2차 §11.4 규율). 존재 확인이 아니라
//   **부품이 지키기로 한 성질**을 단언한다 — 슬롯이 비면 그리지 않는가, 잠긴 회차를 감추지
//   않는가, 상태를 색만으로 말하지 않는가.
//
// 렌더는 `renderToStaticMarkup` 이다(이 저장소 관행 · jsdom 없음).
//   상호작용(focus trap·ESC·바깥 탭)은 순수 판정으로 떼어 `sheetKeys.test.ts` 가 전수한다.
import { describe, expect, it, vi } from 'vitest';
// `PublicGnb` 가 U-1 부터 `usePathname()` 으로 현재 경로를 스스로 안다 — prop 이 아니다.
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
import { renderToStaticMarkup } from 'react-dom/server';
import { SiteHero } from './SiteHero';
import { GrowAxis } from './GrowAxis';
import { CardBand3 } from './CardBand3';
import { WeekTimeline } from './WeekTimeline';
import { SiteRoleCard } from './RoleCard';
import { QuickTiles } from './QuickTiles';
import { SessionChipStrip } from './SessionChipStrip';
import { MenuSheet } from './MenuSheet';
import { SiteGnb } from './SiteGnb';
import { readFileSync } from 'node:fs';
import { PublicGnb } from './PublicGnb';
import { SectionTitle } from './SectionTitle';
import { NewsRow } from './NewsRow';
import { RecruitCard } from './RecruitCard';
import { SiteFooter } from './SiteFooter';
import { LeaderCard } from './LeaderCard';
import { BookPanel } from './BookPanel';

describe('1 · SiteHero', () => {
  it('빈 슬롯은 그리지 않는다 — 없는 것을 자리로 남기지 않는다', () => {
    const html = renderToStaticMarkup(<SiteHero headline="제목" />);
    expect(html).not.toContain('site-hero__eyebrow');
    expect(html).not.toContain('site-hero__lead');
    expect(html).not.toContain('site-hero__cta');
  });

  it('강조는 `<b>` 슬롯으로 받는다 — 부품이 문장을 쪼개지 않는다', () => {
    const html = renderToStaticMarkup(<SiteHero headline={<>5년 뒤의 <b>나</b>는</>} />);
    expect(html).toContain('<b>나</b>');
  });

  it('CTA 두 톤이 서로 다른 부품 클래스를 쓴다', () => {
    const html = renderToStaticMarkup(
      <SiteHero headline="t" ctas={[{ href: '/a', label: '신청', tone: 'primary' }, { href: '/b', label: '소개', tone: 'ghost' }]} />,
    );
    // ★ **클래스 이름이 바뀌었다**(ADR-171) — 히어로는 어두운 면이라 `--on-dark` 갈래를 쓴다.
    //   이 잠금이 지키던 것은 **「두 톤이 서로 다른 클래스를 쓴다」** 이지 이름 자체가 아니다.
    //   이름을 따라 옮겨 적되 **지키던 것을 그대로 잰다.**
    expect(html).toContain('ui-btn--on-dark');
    expect(html).toContain('ui-btn--on-dark-ghost');
    // 밝은 면 갈래가 히어로에 섞이면 배경에 묻힌다 — 그것이 이 잠금의 뜻이다.
    expect(html, '밝은 면 갈래가 섞였다').not.toMatch(/ui-btn--primary|ui-btn--ghost"/);
  });
});

describe('2 · GrowAxis', () => {
  it('다섯 축이 전부 prop 이다 — 부품이 G·R·O·W·F 를 알지 않는다', () => {
    const html = renderToStaticMarkup(<GrowAxis rows={[{ letter: 'X', en: 'XX', ko: '한글' }]} />);
    expect(html).toContain('>X<');
    expect(html).not.toContain('GOAL'); // 부품에 박힌 축 이름이 없다
  });
});

describe('3 · CardBand3', () => {
  it('키커가 없으면 그리지 않는다', () => {
    const html = renderToStaticMarkup(<CardBand3 cards={[{ title: 'T', body: 'B' }]} />);
    expect(html).not.toContain('site-band__kicker');
  });
});

describe('4 · WeekTimeline', () => {
  it('**현재 회차는 prop 이다** — 부품이 날짜를 보지 않는다(불변식 10 계열)', () => {
    const cells = [{ n: '1', title: 'a' }, { n: '2', title: 'b' }];
    const none = renderToStaticMarkup(<WeekTimeline cells={cells} />);
    expect(none, 'currentIndex 가 없으면 아무 칸도 강조하지 않는다').not.toContain('is-current');
    const one = renderToStaticMarkup(<WeekTimeline cells={cells} currentIndex={1} />);
    expect((one.match(/is-current/g) ?? []).length, '강조는 한 칸뿐이다').toBe(1);
    expect(one).toContain('aria-current="step"');
  });
});

describe('5 · RoleCard(site)', () => {
  it('CTA 가 있으면 카드 전체가 링크다 — 폰에서 탭 대상이 넓어야 정확하다', () => {
    const html = renderToStaticMarkup(<SiteRoleCard title="T" cta={{ href: '/home', label: '가기' }} />);
    expect(html).toContain('<a');
    expect(html).toContain('href="/home"');
  });
  it('CTA 가 없으면 링크가 아니다 — 갈 곳 없는 링크를 만들지 않는다', () => {
    const html = renderToStaticMarkup(<SiteRoleCard title="T" />);
    expect(html).not.toContain('<a');
  });
});

describe('6 · QuickTiles', () => {
  it('아이콘이 인라인 SVG 다 — 이모지가 아니다(발주 §5-3)', () => {
    const html = renderToStaticMarkup(<QuickTiles tiles={[{ icon: 'feed', title: '동행', href: '/feed' }]} />);
    expect(html).toContain('<svg');
    expect(html).toContain('stroke="currentColor"');
  });
});

describe('8 · SessionChipStrip', () => {
  const chips = [
    { no: 1, state: 'done' as const, href: '/1' },
    { no: 2, state: 'current' as const, href: '/2' },
    { no: 3, state: 'locked' as const },
  ];
  it('**잠긴 회차를 감추지 않는다** — 여정의 전체 길이가 보여야 한다', () => {
    const html = renderToStaticMarkup(<SessionChipStrip chips={chips} />);
    expect(html).toContain('is-locked');
    expect(html).toContain('3회차 잠김');
  });
  it('잠긴 회차는 링크가 아니다 — 갈 수 없는 곳으로 보내지 않는다', () => {
    const html = renderToStaticMarkup(<SessionChipStrip chips={chips} />);
    const locked = html.slice(html.indexOf('is-locked') - 40);
    expect(locked.startsWith('<a')).toBe(false);
  });
  it('**상태를 색만으로 말하지 않는다**(design_system §10) — aria-label 이 상태를 적는다', () => {
    const html = renderToStaticMarkup(<SessionChipStrip chips={chips} />);
    expect(html).toContain('1회차 완료');
    expect(html).toContain('2회차 진행 중');
    expect(html).toContain('aria-current="step"');
  });
});

describe('7 · MenuSheet', () => {
  const groups = [{ title: '여정', items: [{ href: '/a', label: '가' }] }];
  it('닫혀 있으면 아무것도 그리지 않는다 — 열림은 prop 이다', () => {
    expect(renderToStaticMarkup(<MenuSheet open={false} onClose={() => {}} name="나" groups={groups} />)).toBe('');
  });
  it('대화상자 시맨틱을 갖는다 — role·aria-modal·이름', () => {
    const html = renderToStaticMarkup(<MenuSheet open onClose={() => {}} name="나" groups={groups} />);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-label="전체 메뉴"');
  });
  it('회차 칩이 없으면 그 구획을 만들지 않는다', () => {
    const html = renderToStaticMarkup(<MenuSheet open onClose={() => {}} name="나" groups={groups} />);
    expect(html).not.toContain('site-sheet__chips');
  });
  it('**#8 을 품는다**(발주 §3-7) — 칩을 주면 스트립이 함께 선다', () => {
    const html = renderToStaticMarkup(
      <MenuSheet open onClose={() => {}} name="나" groups={groups} chips={[{ no: 1, state: 'locked' }]} />,
    );
    expect(html).toContain('site-sheet__chips');
    expect(html).toContain('site-chip');
  });
});

describe('9 · SiteGnb', () => {
  // ★ **헤드벨트 투명은 홈에서만이다**(ADR-171). 변이를 물려 보니 이 자리에 잠금이 **없었다** —
  //   전 공개 화면을 투명하게 만들어도 아무도 울지 않았다. 그래서 둘로 잠근다:
  //   ⑴ prop 이 **실제로 모양을 바꾸는가**(행동) ⑵ 판정이 **홈으로 한정되는가**(화면 층).
  //
  //   왜 한정이 중요한가 — 다른 공개 화면에는 배경 이미지가 없다. 투명해지면
  //   **흰 바탕에 흰 로고**가 된다. 취향이 아니라 안 보이는 것이다.
  it('★ transparent prop 이 띠의 모양을 바꾼다 — 기본은 불투명이다', () => {
    const on = renderToStaticMarkup(<SiteGnb logo="로고" transparent />);
    const off = renderToStaticMarkup(<SiteGnb logo="로고" />);
    expect(on).toContain('is-transparent');
    expect(off, '기본이 투명이다').not.toContain('is-transparent');
  });

  it('★★ 판정은 화면 층이 하고 **홈으로 한정된다**', () => {
    const src = readFileSync('src/app/_screens/site/PublicGnb.tsx', 'utf8');
    // 상수로 켜면 열두 공개 화면이 함께 투명해진다.
    expect(src, '헤드벨트를 무조건 투명하게 켰다').not.toMatch(/transparent=\{true\}|transparent(?!=)/);
    expect(src, '홈 한정 판정이 없다').toContain("currentPath === '/'");
    // 부품은 판정하지 않는다 — 경로를 부품이 알면 그 순간 사본이 둘이다.
    const cmp = readFileSync('src/app/_screens/site/SiteGnb.tsx', 'utf8');
    expect(cmp, '부품이 경로를 안다').not.toContain("=== '/'");
  });

  const items = [{ href: '/about', label: '소개' }, { href: '/library', label: '자료실' }];
  const login = { href: '/login', label: '로그인' };

  it('**현재 경로가 prop 이다** — 부품이 라우터를 읽지 않는다(강조 ①)', () => {
    const none = renderToStaticMarkup(<SiteGnb logo="로고" items={items} login={login} />);
    expect(none, 'currentPath 가 없으면 아무 항목도 현재가 아니다').not.toContain('aria-current');
    const on = renderToStaticMarkup(<SiteGnb logo="로고" items={items} login={login} currentPath="/about" />);
    expect((on.match(/aria-current="page"/g) ?? []).length).toBe(1);
  });

  it('하위 경로도 현재로 친다 — `/library/3` 에서 자료실이 꺼지지 않는다', () => {
    const html = renderToStaticMarkup(<SiteGnb logo="로고" items={items} login={login} currentPath="/library/3" />);
    const at = html.indexOf('aria-current="page"');
    expect(at).toBeGreaterThan(-1);
    expect(html.slice(at, at + 60)).toContain('자료실');
  });

  it('시트 내용이 없으면 햄버거를 그리지 않는다 — 열 것이 없는 버튼을 두지 않는다', () => {
    const html = renderToStaticMarkup(<SiteGnb logo="로고" items={items} login={login} />);
    expect(html).not.toContain('site-gnb__burger');
  });
});

// ── 4차 F-2 가 더한 넷 (§9.7 #10~#13) ──────────────────────────

describe('10 · SectionTitle', () => {
  it('부제·액션이 없으면 그리지 않는다', () => {
    const html = renderToStaticMarkup(<SectionTitle title="소식" />);
    expect(html).not.toContain('site-sect__d');
    expect(html).not.toContain('site-sect__a');
  });

  it('**제목 층위는 prop 이다** — 부품이 h2/h3 를 판정하지 않는다', () => {
    expect(renderToStaticMarkup(<SectionTitle title="가" />)).toContain('<h2');
    expect(renderToStaticMarkup(<SectionTitle title="가" as="h3" />)).toContain('<h3');
  });
});

describe('11 · NewsRow', () => {
  it('빈 목록에 빈 상자를 남기지 않는다', () => {
    expect(renderToStaticMarkup(<NewsRow items={[]} />)).toBe('');
  });

  it('**갈 곳이 없으면 링크가 아니다** — 눌리는데 아무 일도 없는 줄을 만들지 않는다', () => {
    const html = renderToStaticMarkup(<NewsRow items={[{ id: 'a', title: '제목' }]} />);
    expect(html).not.toContain('<a');
  });

  it('배지·날짜는 있을 때만 그린다 — 판정이 아니라 지정이다', () => {
    const bare = renderToStaticMarkup(<NewsRow items={[{ id: 'a', title: 'T', href: '/n/a' }]} />);
    expect(bare).not.toContain('site-news__badge');
    expect(bare).not.toContain('site-news__d');
    const full = renderToStaticMarkup(<NewsRow items={[{ id: 'a', title: 'T', href: '/n/a', badge: '모집', date: '8.20' }]} />);
    expect(full).toContain('모집');
    expect(full).toContain('8.20');
  });
});

describe('12 · RecruitCard', () => {
  it('CTA 가 없으면 버튼을 만들지 않는다 — 모집 여부는 화면이 판정한다', () => {
    const html = renderToStaticMarkup(<RecruitCard title="T" />);
    expect(html).not.toContain('ui-btn');
    expect(html).not.toContain('site-recruit__k');
    expect(html).not.toContain('site-recruit__b');
  });
});

describe('13 · SiteFooter', () => {
  it('**링크가 없으면 그 줄을 그리지 않는다** — 없는 페이지로 보내지 않는다', () => {
    const html = renderToStaticMarkup(<SiteFooter org="퓨처나우" />);
    expect(html).not.toContain('site-foot__nav');
    expect(html).not.toContain('<a');
  });

  it('링크를 주면 이름 붙은 내비가 선다', () => {
    const html = renderToStaticMarkup(<SiteFooter org="퓨처나우" links={[{ href: '/contact', label: '문의' }]} />);
    expect(html).toContain('aria-label="이용 안내"');
    expect(html).toContain('href="/contact"');
  });
});

// ── 4차 F-2b 가 더한 둘 (§9.7 #14~#15) ─────────────────────────

describe('14 · LeaderCard', () => {
  const base = { name: '홍길동', title: '직함', intro: '소개문', photo: { alt: '홍길동 사진' } };

  it('**사진이 없으면 이니셜 자리표시자가 선다** — 빈 상자를 남기지 않는다', () => {
    const html = renderToStaticMarkup(<LeaderCard {...base} />);
    expect(html).not.toContain('<img');
    expect(html).toContain('site-leader__ph');
    expect(html).toContain('>홍<'); // 이름 첫 글자
    expect(html, '스크린리더에 준비 중임을 알린다').toContain('사진 준비 중');
  });

  it('**`maxSize` 를 코드로 막는다** — 원본 도착 전 확대 금지(원고 §5.2)', () => {
    const html = renderToStaticMarkup(<LeaderCard {...base} photo={{ alt: 'a', maxSize: 320 }} />);
    expect(html).toContain('max-width:320px');
    expect(html).toContain('max-height:320px');
    // 상한이 없으면 규격(§5.0)대로 자란다 — 인라인 상한을 걸지 않는다.
    expect(renderToStaticMarkup(<LeaderCard {...base} />)).not.toContain('max-width:320px');
  });

  it('사진이 있으면 WebP 폴백과 지연 로딩을 건다(원고 §5.4)', () => {
    const html = renderToStaticMarkup(<LeaderCard {...base} photo={{ src: 'a.jpg', alt: '대체 문구' }} />);
    expect(html).toContain('<picture>');
    expect(html).toContain('a.webp');
    expect(html).toContain('type="image/webp"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('alt="대체 문구"');
  });

  it('약력이 없으면 그 목록을 그리지 않는다', () => {
    expect(renderToStaticMarkup(<LeaderCard {...base} />)).not.toContain('site-leader__bio');
  });
});

describe('15 · BookPanel', () => {
  const base = { facts: [{ k: '제목', v: '퓨처나우' }], intro: ['한 단락'] };

  it('**구매 버튼은 ghost 다** — 골드 primary 는 세미나 신청 전용(원고 §3.4 위계)', () => {
    const html = renderToStaticMarkup(<BookPanel {...base} buy={{ href: 'https://x.test/b', label: '구매' }} />);
    expect(html).toContain('ui-btn--ghost');
    expect(html).not.toContain('ui-btn--primary');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('표지가 없으면 자리표시자가 선다 — **3D 목업이 아니다**', () => {
    const html = renderToStaticMarkup(<BookPanel {...base} cover={{ alt: '표지' }} />);
    expect(html).not.toContain('<img');
    expect(html).toContain('site-book__ph');
    expect(html).toContain('이미지 준비 중');
  });

  it('소개 단락을 합치지 않는다 — 단락이 곧 호흡이다', () => {
    const html = renderToStaticMarkup(<BookPanel {...base} intro={['가', '나', '다']} />);
    // `site-book__ph`(표지 자리표시자)까지 세지 않도록 닫는 따옴표까지 본다.
    expect((html.match(/site-book__p"/g) ?? []).length).toBe(3);
  });

  it('구매·고지·단체 구매·표지가 없으면 그리지 않는다', () => {
    const html = renderToStaticMarkup(<BookPanel {...base} />);
    expect(html, 'cover 자체가 없으면 표지 칸을 만들지 않는다').not.toContain('site-book__cover');
    expect(html).not.toContain('ui-btn');
    expect(html).not.toContain('site-book__notice');
    expect(html).not.toContain('site-book__bulk');
  });
});

// ── 5차 소건 1-바 · 공개 헤더가 세션을 본다 ────────────────────────────────
describe('PublicGnb — 서버 렌더는 비로그인 모습이다 (ISR 무손상의 대가)', () => {
  it('정적 HTML 은 `로그인`으로 그려진다 — 캐시본과 같아야 하이드레이션이 어긋나지 않는다', () => {
    const html = renderToStaticMarkup(
      <PublicGnb logo="로고" en="FUTURE NOW" items={[{ href: '/about', label: '소개' }]} />,
    );
    expect(html).toContain('로그인');
    expect(html).toContain('/login');
    expect(html).not.toContain('내 홈');
  });

  it('부품에 login prop 을 내려 준다 — **부품은 여전히 계산하지 않는다**', () => {
    const html = renderToStaticMarkup(
      <PublicGnb logo="로고" items={[{ href: '/about', label: '소개' }]} />,
    );
    expect(html).toContain('site-gnb__login');
  });
});
