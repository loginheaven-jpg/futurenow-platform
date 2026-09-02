# 퓨처나우 홈 화면 히어로 개선 v2 — 코딩 AI 적용 지시서

**작성일:** 2026-09-02  
**대상:** 홈 화면(`/`) 히어로 영역 — 시안 이미지(hero_redesign_v1) 수준 완전 재구현  
**원칙:** 헤더(로고·메뉴·로그인)는 **절대 변경하지 않음**. 히어로 영역만 이미지 수준으로 화려하게 재구현.

---

## 0. 가장 먼저 할 일 — HTML 시안을 구현 기준으로 열어 볼 것

`퓨처나우_홈화면_시안_v2.html`은 단순한 참고 파일이 아닙니다. **이번 작업의 시각적 기준선이자 인수 기준**입니다. 코딩 AI는 소스 수정을 시작하기 전에 반드시 이 파일을 브라우저에서 열어, 아래 요소의 구성·비례·표현을 확인해야 합니다.

> 구현의 목표는 “새 카피를 기존 홈 화면에 넣는 것”이 아닙니다. 제공된 HTML 시안과 같은 **장면성 있는 첫 화면**을 실제 Next.js 컴포넌트와 CSS로 재현하는 것입니다.

| 시안에서 반드시 재현할 요소 | 구현 기준 |
|---|---|
| 기존 헤더 | `퓨처나우 FUTURE NOW` 로고와 메뉴 6개, 로그인 버튼을 **그대로** 유지한다. 시안의 히어로만 변경한다. |
| 히어로 배경 | 별이 있는 밤하늘, 산 능선, 좌측 하단의 여명과 골드빛을 한 화면에 보이게 한다. 배경 이미지와 네이비 오버레이를 함께 적용한다. |
| 좌측 메시지 | 대형 2행 헤드라인, 골드 `꿈` 강조, 2개 CTA와 화살표, 3개 아이콘 피처를 시안과 같은 위계로 배치한다. |
| 우측 GROW+F | 텍스트 목록이 아니라, 골드 테두리의 **원형 노드 5개**와 세로 연결선·가로 연결선·설명 텍스트로 재현한다. |
| 화면 밀도 | 데스크톱 1440px 기준에서 히어로의 높이와 정보 밀도가 시안과 비슷해야 한다. 단색 배경 또는 단순 행 목록으로 축소하지 않는다. |

### HTML 시안의 사용 방법

1. `퓨처나우_홈화면_시안_v2.html`과 `hero_bg_dawn.png`를 같은 폴더 구조로 둔 뒤, HTML 파일을 브라우저에서 연다.
2. 실제 프로젝트에 배경 이미지를 복사하고, 지시서의 컴포넌트·카피·CSS 변경을 적용한다.
3. 데스크톱 너비 **1440px**에서 실제 `/` 화면을 캡처한다.
4. 실제 화면을 HTML 시안과 나란히 비교한다. 아래의 "시안 대조 인수 기준"을 모두 충족할 때만 작업을 완료한다.

---

## 1. 변경 범위 요약

| 구분 | 변경 여부 | 비고 |
|---|---|---|
| 헤더 (GNB) | ❌ 변경 없음 | 로고, 메뉴, 로그인 버튼, 햄버거 메뉴 모두 유지 |
| 히어로 영역 | ✅ 완전 재구현 | 배경 이미지, 원형 GROW+F 노드, 아이콘 피처, 화살표 버튼 |
| 카드 밴드 (3장) | ✅ 카피·스타일 개선 | 골드 상단 테두리, 호버 효과 |
| 6주 여정 타임라인 | ✅ 카피·스타일 개선 | 골드 라인 호버 효과 |
| 소식/모집 섹션 | ❌ 변경 없음 | 기존 유지 |

---

## 2. 필수 에셋

| 파일 | 용도 | 경로 |
|---|---|---|
| `hero_bg_dawn.png` | 히어로 배경 이미지 (산 실루엣·별·여명) | `tasks\hero_bg_dawn.png` |

**코딩 AI는 이 이미지를 프로젝트의 적절한 위치(예: `public/images/` 또는 `src/assets/`)에 복사하고, CSS의 `url()` 경로를 실제 경로로 교체해야 합니다.**

---

## 3. 파일별 변경 지시

### 3.1 `src/app/(public)/page.tsx`

**변경 내용:** 히어로 카피, 카드 밴드 카피, 6주 여정 카피

```tsx
// 변경 전 (line 60-66)
<SiteHero
  eyebrow={`6주의 여정 · ${CURRENT_INTAKE.label}`}
  headline={<>꿈꾸는 미래를<br />지금 <b>살자</b></>}
  lead="도서 『퓨처나우』를 바탕으로 한 6주 세미나입니다. 매주 손으로 쓰고, 함께 나누고, 한 걸음을 정합니다."
  ctas={[
    { href: '/recruit', label: '참여 신청', tone: 'primary' },
    { href: '/about', label: '프로그램 소개', tone: 'ghost' },
  ]}

// 변경 후
<SiteHero
  eyebrow={`6주, 꿈을 목표로 바꾸는 시간 · ${CURRENT_INTAKE.label}`}
  headline={<>잃어버린 <b>꿈</b>을<br />다시 꾸기 시작합니다</>}
  lead="꿈은 꾸는 것이 아니라, 이루는 것입니다. 6주 동안, 막연했던 꿈을 구체적인 목표로 바꾸고, 그 목표를 향한 첫 걸음을 함께 시작합니다."
  ctas={[
    { href: '/recruit', label: '지금 시작하기', tone: 'primary' },
    { href: '/about', label: '6주 여정 살펴보기', tone: 'ghost' },
  ]}
```

```tsx
// 변경 전 (line 80)
<SectionTitle title="이 세미나가 하는 일" desc="함께 걸으며, 나만의 인생책을 써 갑니다" />

// 변경 후
<SectionTitle title="이 세미나가 하는 일" desc="꿈을 목표로, 목표를 실행으로" />
```

```tsx
// 변경 전 (line 85)
<SectionTitle title="6주 여정" desc="회차마다 다음 결정을 이끌 기록이 하나씩 남습니다" />

// 변경 후
<SectionTitle title="6주 여정" desc="매주 한 걸음씩, 꿈에서 목표로, 목표에서 현실로" />
```

---

### 3.2 `src/app/_screens/site/programCopy.ts`

**변경 내용:** GROW+F 축, 카드 밴드, 6주 여정 카피

```typescript
// 변경 전 (line 19-25)
export const GROW_ROWS = [
  { letter: 'G', short: '목표', en: 'GOAL', ko: '과거와 미래의 나', note: '1-2회차' },
  { letter: 'R', short: '직면', en: 'REALITY', ko: '직면과 재구성', note: '3회차' },
  { letter: 'O', short: '옵션', en: 'OPTIONS', ko: '펼치고 하나를 고른다', note: '4회차' },
  { letter: 'W', short: '실행', en: 'WILL', ko: '의지가 아니라 환경', note: '5회차' },
  { letter: 'F', short: '믿음', en: 'FAITH', ko: '끝에서 오늘을 본다', note: '6회차' },
];

// 변경 후 — **desc 필드 추가** (원형 노드 옆 설명 텍스트)
export const GROW_ROWS = [
  { letter: 'G', short: '꿈찾기', en: 'GOAL', ko: '꿈을 찾다', desc: '나의 진짜 꿈과 가치를 발견합니다.', note: '1-2회차' },
  { letter: 'R', short: '직면', en: 'REALITY', ko: '현실을 직면하다', desc: '현재의 나를 객관적으로 돌아봅니다.', note: '3회차' },
  { letter: 'O', short: '선택', en: 'OPTIONS', ko: '목표를 선택하다', desc: '꿈을 구체적인 목표로 정의합니다.', note: '4회차' },
  { letter: 'W', short: '환경', en: 'WILL', ko: '환경을 설계하다', desc: '목표 달성을 위한 환경과 전략을 만듭니다.', note: '5회차' },
  { letter: 'F', short: '실천', en: 'FAITH', ko: '오늘을 살아내다', desc: '작은 실천으로, 위대한 변화를 만듭니다.', note: '6회차' },
];
```

```typescript
// 변경 전 (line 28-44)
export const BAND_CARDS = [
  {
    kicker: '손에 남는 것',
    title: '여섯 주의 기록',
    body: '매 회차 끝에 갈무리 카드를 쓴다. 흩어지지 않고 쌓인다. 6주 뒤 처음부터 되짚어 볼 수 있다.',
  },
  {
    kicker: '혼자가 아니다',
    title: '같이 걷는 사람',
    body: '7~12명이 한 기수를 이룬다. 매일의 걸음을 함께 올리고, 인도자가 함께 점검한다.',
  },
  {
    kicker: '시작과 끝',
    title: '사전·사후 진단',
    body: '시작할 때와 마칠 때 같은 자리를 재 본다. 등수를 매기지 않는다. 방향을 보기 위한 눈금이다.',
  },
];

// 변경 후
export const BAND_CARDS = [
  {
    kicker: '꿈이 목표가 되는 순간',
    title: '여섯 주의 기록',
    body: '매주 쓰는 갈무리 카드가 쌓이면, 막연했던 꿈이 구체적인 목표로 바뀝니다. 6주 뒤, 당신은 다른 사람이 되어 있을 것입니다.',
  },
  {
    kicker: '혼자가 아닌 함께',
    title: '같이 걷는 사람',
    body: '같은 꿈을 꾸는 사람들과 함께 걷습니다. 서로의 목표를 응원하고, 실행을 점검하며, 변화를 나눕니다.',
  },
  {
    kicker: '변화를 확인하는 시간',
    title: '사전·사후 진단',
    body: '6주 전과 후, 같은 질문에 답해 봅니다. 달라진 답변 속에서, 당신의 변화를 확인합니다.',
  },
];
```

```typescript
// 변경 전 (line 53-60)
export const WEEK_CELLS = [
  { n: '1회차', title: '과거의 나를 만나다', output: '존재가치 선언문' },
  { n: '2회차', title: '미래의 나를 만나다', output: '시각화 보드' },
  { n: '3회차', title: '직면하고 다시 짜다', output: '빛 스위치 하나' },
  { n: '4회차', title: '펼치고 하나를 고르다', output: '원씽 · 첫 도미노' },
  { n: '5회차', title: '의지가 아닌 환경', output: '골든타임 설계' },
  { n: '6회차', title: '끝에서 오늘을 보다', output: '여정의 갈무리' },
];

// 변경 후
export const WEEK_CELLS = [
  { n: '1회차', title: '잃어버린 꿈을 찾다', output: '나의 존재가치 선언' },
  { n: '2회차', title: '꿈의 모습을 그리다', output: '5년 뒤 나의 모습' },
  { n: '3회차', title: '현실과 마주하다', output: '현실 직면과 습관 재설계' },
  { n: '4회차', title: '목표를 선택하다', output: '인생을 바꿀 단 하나의 목표' },
  { n: '5회차', title: '환경을 설계하다', output: '실행을 돕는 환경 설계' },
  { n: '6회차', title: '오늘을 살아내다', output: '6주의 변화와 다음 걸음' },
];
```

---

### 3.3 `src/app/_screens/site/SiteHero.tsx` — **구조 변경 필요**

기존 `SiteHero`는 `aside` 슬롯에 `GrowAxis`를 넣는 구조입니다. 시안 이미지 수준으로 구현하려면 **히어로 내부 구조를 변경**해야 합니다.

**옵션 A: SiteHero 컴포넌트 수정 (권장)**

```tsx
// 변경 전 (line 32-61)
export function SiteHero({
  eyebrow,
  headline,
  lead,
  ctas = [],
  aside,
}: {
  eyebrow?: string;
  headline: React.ReactNode;
  lead?: React.ReactNode;
  ctas?: SiteHeroCta[];
  aside?: React.ReactNode;
}) {
  return (
    <section className="site-hero">
      <div className="site-hero__in">
        <div>
          {eyebrow ? <div className="site-hero__eyebrow">{eyebrow}</div> : null}
          <h1 className="site-hero__h1">{headline}</h1>
          {lead ? <p className="site-hero__lead">{lead}</p> : null}
          {ctas.length > 0 ? (
            <div className="site-hero__cta">
              {ctas.map((c) => (
                <Link
                  key={c.href}
                  href={c.href}
                  className={`ui-btn ${c.tone === 'primary' ? 'ui-btn--primary' : 'ui-btn--ghost'}`}
                  style={
                    c.tone === 'primary'
                      ? { background: 'var(--color-accent)', color: 'var(--color-text-on-gold)', textDecoration: 'none' }
                      : { color: 'var(--color-text-on-accent)', borderColor: 'var(--navy-500)', textDecoration: 'none' }
                  }
                >
                  {c.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
        {aside ? <div>{aside}</div> : null}
      </div>
    </section>
  );
}

// 변경 후 — **features 슬롯 추가, aside는 그대로 유지**
export function SiteHero({
  eyebrow,
  headline,
  lead,
  ctas = [],
  aside,
  features, // 새 슬롯: 하단 아이콘 피처 3개
}: {
  eyebrow?: string;
  headline: React.ReactNode;
  lead?: React.ReactNode;
  ctas?: SiteHeroCta[];
  aside?: React.ReactNode;
  features?: React.ReactNode; // 새 슬롯
}) {
  return (
    <section className="site-hero">
      <div className="site-hero__in">
        <div>
          {eyebrow ? <div className="site-hero__eyebrow">{eyebrow}</div> : null}
          <h1 className="site-hero__h1">{headline}</h1>
          {lead ? <p className="site-hero__lead">{lead}</p> : null}
          {ctas.length > 0 ? (
            <div className="site-hero__cta">
              {ctas.map((c) => (
                <Link
                  key={c.href}
                  href={c.href}
                  className={`ui-btn ${c.tone === 'primary' ? 'ui-btn--primary' : 'ui-btn--ghost'}`}
                >
                  {c.label}
                  <span className="ui-btn__arrow">›</span>
                </Link>
              ))}
            </div>
          ) : null}
          {features ? <div className="site-hero__features">{features}</div> : null}
        </div>
        {aside ? <div>{aside}</div> : null}
      </div>
    </section>
  );
}
```

**옵션 B: page.tsx에서 직접 히어로 마크업 (더 빠름)**

`SiteHero`를 사용하지 않고 `page.tsx`에 직접 히어로 마크업을 작성합니다. 이 경우 `SiteHero.tsx`는 변경하지 않습니다.

---

### 3.4 `src/app/_screens/site/GrowAxis.tsx` — **구조 변경 필요**

기존 `GrowAxis`는 단순 나열형입니다. 시안 이미지의 **원형 노드 + 연결선** 구조로 변경해야 합니다.

```tsx
// 변경 전 (line 25-38)
export function GrowAxis({ rows }: { rows: GrowRow[] }) {
  return (
    <div className="site-grow">
      {rows.map((r) => (
        <div key={r.letter} className={`site-grow__row${r.short ? ' has-short' : ''}`}>
          <span className="site-grow__l">{r.letter}</span>
          <span className="site-grow__en">{r.en}</span>
          <span className="site-grow__ko">{r.ko}</span>
          {r.short ? <span className="site-grow__short">{r.short}</span> : null}
          {r.note ? <span className="site-grow__note">{r.note}</span> : null}
        </div>
      ))}
    </div>
  );
}

// 변경 후 — **원형 노드 + 연결선 + 설명 텍스트**
export function GrowAxis({ rows }: { rows: GrowRow[] }) {
  return (
    <div className="grow-orbit">
      {rows.map((r) => (
        <div key={r.letter} className="grow-node">
          <div className="grow-node__circle">{r.letter}</div>
          <div className="grow-node__link"></div>
          <div className="grow-node__text">
            <div className="grow-node__title">{r.ko}</div>
            {r.desc ? <div className="grow-node__desc">{r.desc}</div> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
```

**타입 정의도 함께 변경:**

```typescript
// 변경 전
export interface GrowRow {
  letter: string;
  short?: string;
  en: string;
  ko: string;
  note?: string;
}

// 변경 후
export interface GrowRow {
  letter: string;
  short?: string;
  en: string;
  ko: string;
  desc?: string; // 새 필드: 노드 옆 설명
  note?: string;
}
```

---

### 3.5 `src/app/_screens/site/site.css` — **대폭 추가**

기존 CSS에 아래 내용을 **추가**합니다. 기존 `.site-hero`, `.site-grow` 관련 스타일은 **새 스타일로 대체**하거나 **주석 처리**합니다.

```css
/* ═══════════════════════════════════════════════════════════════════════════
   히어로 v2 — 시안 이미지 수준 완전 재구현
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── 히어로 배경 ─────────────────────────────────────────────── */
.site-hero {
  position: relative;
  padding: 90px var(--space-6) 70px;
  overflow: hidden;
  /* 배경 이미지 — 코딩 AI는 이 경로를 실제 에셋 경로로 교체 */
  background: 
    linear-gradient(180deg, rgba(6,13,26,0.55) 0%, rgba(10,22,40,0.35) 50%, rgba(6,13,26,0.75) 100%),
    url('/images/hero_bg_dawn.png') center/cover no-repeat,
    linear-gradient(135deg, var(--navy-950) 0%, var(--navy-800) 100%);
  background-color: var(--navy-950);
}

.site-hero__in {
  max-width: 1280px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr;
  gap: 56px;
  align-items: center;
  position: relative;
  z-index: 1;
}

/* ── 좌측 콘텐츠 ─────────────────────────────────────────────── */
.site-hero__eyebrow {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.22em;
  color: var(--color-accent-strong);
  margin-bottom: var(--space-5);
}

.site-hero__h1 {
  font-size: 40px;
  line-height: 1.18;
  font-weight: 900;
  letter-spacing: -0.03em;
  color: var(--white);
  margin: 0;
  text-shadow: 0 2px 20px rgba(0,0,0,0.4);
}

.site-hero__h1 b {
  color: var(--color-accent-strong);
  font-weight: 900;
}

.site-hero__lead {
  margin-top: 26px;
  font-size: 16.5px;
  line-height: 1.8;
  color: var(--navy-200);
  max-width: 480px;
  text-shadow: 0 1px 8px rgba(0,0,0,0.3);
}

/* ── CTA 버튼 (화살표 포함) ──────────────────────────────────── */
.site-hero__cta {
  margin-top: 40px;
  display: flex;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.ui-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 700;
  padding: 16px 32px;
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.25s ease;
  min-height: 56px;
}

.ui-btn--primary {
  background: linear-gradient(135deg, var(--gold-400) 0%, var(--gold-500) 100%);
  color: var(--color-text-on-gold);
  box-shadow: 0 6px 24px rgba(212, 175, 55, 0.4);
}

.ui-btn--primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 32px rgba(212, 175, 55, 0.55);
}

.ui-btn--ghost {
  background: rgba(10, 22, 40, 0.4);
  color: var(--white);
  border: 1.5px solid var(--gold-500);
  backdrop-filter: blur(4px);
}

.ui-btn--ghost:hover {
  background: rgba(212, 175, 55, 0.12);
  border-color: var(--gold-400);
}

.ui-btn__arrow {
  font-size: 18px;
  font-weight: 400;
  transition: transform 0.25s ease;
}

.ui-btn:hover .ui-btn__arrow {
  transform: translateX(4px);
}

/* ── 하단 아이콘 피처 3개 ────────────────────────────────────── */
.site-hero__features {
  margin-top: 64px;
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

.hero-feature {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.hero-feature__icon {
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-accent-strong);
}

.hero-feature__title {
  font-size: 14px;
  font-weight: 700;
  color: var(--white);
  line-height: 1.35;
}

.hero-feature__sub {
  font-size: 12px;
  color: var(--navy-300);
  margin-top: 2px;
}

@media (min-width: 768px) {
  .site-hero__features {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-5);
  }
  .hero-feature {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
  }
}

/* ── 우측: 원형 GROW+F 노드 ──────────────────────────────────── */
.grow-orbit {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
  padding-left: 0;
}

.grow-node {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  position: relative;
  padding: 6px 0;
}

/* 연결선 — 원 사이 세로선 */
.grow-node:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 39px;
  top: 84px;
  bottom: -6px;
  width: 2px;
  background: linear-gradient(180deg, var(--gold-500) 0%, rgba(212,175,55,0.3) 100%);
}

.grow-node__circle {
  flex: 0 0 80px;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 2px solid var(--gold-500);
  background: rgba(10, 22, 40, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34px;
  font-weight: 800;
  color: var(--color-accent-strong);
  box-shadow: 0 0 24px rgba(212, 175, 55, 0.25), inset 0 0 20px rgba(212,175,55,0.06);
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
}

.grow-node:hover .grow-node__circle {
  box-shadow: 0 0 36px rgba(212, 175, 55, 0.5), inset 0 0 24px rgba(212,175,55,0.12);
  transform: scale(1.05);
}

/* 노드와 텍스트 사이 골드 도트+선 */
.grow-node__link {
  flex: 0 0 28px;
  height: 2px;
  background: var(--gold-500);
  position: relative;
}

.grow-node__link::before {
  content: '';
  position: absolute;
  left: -4px;
  top: 50%;
  transform: translateY(-50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--gold-400);
  box-shadow: 0 0 8px rgba(212,175,55,0.7);
}

.grow-node__text {
  min-width: 0;
}

.grow-node__title {
  font-size: 19px;
  font-weight: 800;
  color: var(--white);
  letter-spacing: -0.01em;
  text-shadow: 0 1px 8px rgba(0,0,0,0.35);
}

.grow-node__desc {
  font-size: 13px;
  color: var(--navy-200);
  margin-top: 4px;
  line-height: 1.55;
}

/* 모바일: 노드 가로 스크롤 → 세로 간결화 */
@media (max-width: 1023px) {
  .grow-orbit {
    flex-direction: row;
    overflow-x: auto;
    gap: var(--space-4);
    padding-bottom: var(--space-3);
  }
  .grow-node {
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    min-width: 120px;
    text-align: center;
    padding: 0;
  }
  .grow-node:not(:last-child)::after { display: none; }
  .grow-node__circle {
    flex: 0 0 64px;
    width: 64px;
    height: 64px;
    font-size: 26px;
  }
  .grow-node__link { display: none; }
  .grow-node__title { font-size: 14px; }
  .grow-node__desc { display: none; }
}

@media (min-width: 1024px) {
  .site-hero {
    padding: 110px 48px 90px;
  }
  .site-hero__in {
    grid-template-columns: 1.05fr 0.95fr;
    gap: 80px;
  }
  .site-hero__h1 { font-size: 64px; }
}

/* ── 카드 밴드 개선 ──────────────────────────────────────────── */
.ui-card {
  border-top: 3px solid var(--gold-500);
}

/* ── 6주 여정 개선 ───────────────────────────────────────────── */
.site-weeks__cell::before {
  content: '';
  position: absolute;
  top: -3px;
  left: 0;
  width: 0;
  height: 3px;
  background: var(--color-accent);
  transition: width 0.3s ease;
}

.site-weeks__cell:hover::before { width: 100%; }
```

---

## 4. 변경하지 않는 파일

| 파일 | 이유 |
|---|---|
| `src/app/_screens/site/SiteGnb.tsx` | 헤더는 변경하지 않음 |
| `src/app/_screens/site/PublicGnb.tsx` | 헤더는 변경하지 않음 |
| `src/app/_screens/site/PublicShell.tsx` | 헤더는 변경하지 않음 |
| `src/app/(public)/layout.tsx` | 레이아웃 구조 유지 |

---

## 5. 구현 옵션 비교

| 옵션 | 장점 | 단점 | 권장 대상 |
|---|---|---|---|
| **A. SiteHero + GrowAxis 수정** | 컴포넌트 재사용성 유지, 구조 깔끔 | 컴포넌트 2개 수정 필요 | 장기 유지보수를 고려할 때 |
| **B. page.tsx 직접 마크업** | 빠른 구현, 컴포넌트 변경 없음 | 재사용성 낮음, page.tsx 복잡해짐 | 빠른 프로토타이핑 |

**권장:** 옵션 A를 선택하되, 시간이 촉박하면 옵션 B로 먼저 구현 후 리팩토링합니다.

---

## 6. 검증 체크리스트

적용 후 아래 항목을 확인하세요.

### 6.1 시안 대조 인수 기준 — HTML 파일과 반드시 비교

아래 항목은 `퓨처나우_홈화면_시안_v2.html`을 열어 실제 `/` 화면과 직접 대조하는 **필수 검수**입니다. 하나라도 빠지면 카피만 적용한 불완전한 구현으로 판단합니다.

| 우선순위 | 시안 대조 항목 | 완료 기준 |
|---|---|---|
| P0 | 배경 장면 | 배경 이미지 `hero_bg_dawn.png`가 로드되며, 별·산 능선·여명 위에 충분한 네이비 오버레이가 적용된다. |
| P0 | 우측 프로세스 | G/R/O/W/F가 각 80px 원형 노드로 보이고, 노드 사이 세로선과 노드 옆 골드 선·도트가 보인다. |
| P0 | 좌측 행동 유도 | 헤드라인·리드·CTA 2개·아이콘 피처 3개가 히어로 내부에 모두 배치된다. CTA에는 화살표가 있다. |
| P0 | 헤더 보존 | 상단 헤더는 기존 공개 사이트의 로고·메뉴·로그인 버튼과 동일하다. 헤더 안에 `6주 자기개발 세미나`를 추가하지 않는다. |
| P1 | 시각 위계 | 헤드라인은 데스크톱에서 64px, 원형 노드는 80px이며, 골드 색상과 그림자로 시안과 같은 대비를 만든다. |
| P1 | 반응형 | 1024px 미만에서는 GROW+F 원형 노드가 가로 스크롤로 바뀌고, 좁은 화면에서 콘텐츠가 잘리지 않는다. |

적용 후 아래 항목을 확인하세요.

| 항목 | 확인 방법 |
|---|---|
| 헤더 로고·메뉴·로그인 버튼이 그대로인가? | 브라우저에서 `/` 접속 후 헤더 확인 |
| 히어로 배경에 산 실루엣·별·여명 이미지가 보이는가? | 브라우저에서 `/` 접속 후 확인 |
| 헤드라인이 `잃어버린 꿈을 다시 꾸기 시작합니다`로 변경되었는가? | 브라우저에서 `/` 접속 후 확인 |
| CTA 버튼에 화살표(`›`)가 있는가? | 브라우저에서 `/` 접속 후 확인 |
| 하단에 아이콘 피처 3개(소수 정예 그룹, 실전 중심 커리큘럼, 지속 가능한 성장)가 보이는가? | 브라우저에서 `/` 접속 후 스크롤 |
| 우측에 원형 GROW+F 노드 5개가 연결선과 함께 보이는가? | 브라우저에서 `/` 접속 후 확인 |
| 각 노드 옆에 제목과 설명이 있는가? | 브라우저에서 `/` 접속 후 확인 |
| 모바일에서 노드가 가로 스크롤로 표시되는가? | 브라우저 개발자 도구 → 모바일 뷰 |
| 기존 테스트가 통과하는가? | `npm test` 또는 `pnpm test` 실행 |

---

## 7. 롤백 방법

문제가 발생하면 아래 명령으로 원래 상태로 되돌립니다.

```bash
cd /home/ubuntu/futurenow_copy_audit/source
git checkout -- src/app/\(public\)/page.tsx src/app/_screens/site/programCopy.ts src/app/_screens/site/SiteHero.tsx src/app/_screens/site/GrowAxis.tsx src/app/_screens/site/site.css
```

---

## 8. 필수 전달물 및 역할

| 파일 | 역할 | 코딩 AI의 조치 |
|---|---|---|
| `퓨처나우_홈화면_시안_v2.html` | **필수 시각 기준 및 인수 기준.** HTML/CSS로 구현한 완성 시안 | **반드시 먼저 브라우저로 열어 본 뒤**, 실제 `/` 화면과 구성·비례·표현을 대조한다. 소스에 그대로 배포하는 파일은 아니며, Next.js 구현의 기준이다. |
| `퓨처나우_홈화면_시안_v2_스크린샷.png` | 빠른 시각 확인용 정적 미리보기 | HTML을 열 수 없는 경우에 한해 보조 참조로 사용한다. HTML 파일이 우선이다. |
| `assets/hero_bg_dawn.png` | 실제 서비스에 복사하여 사용할 **필수 배경 에셋** | `public/images/hero_bg_dawn.png`로 복사한 뒤 CSS `url('/images/hero_bg_dawn.png')`를 사용한다. |
| `코딩AI_적용지시서_v2.md` | 실제 프로젝트 파일 수정 명세 | 파일별 코드 변경을 적용하고 6.1의 시안 대조 인수 기준으로 결과를 확인한다. |

---

*이 지시서는 코딩 AI가 바로 적용할 수 있도록 작성되었습니다. 추가 질문이 있으면 언제든지 문의해 주세요.*
