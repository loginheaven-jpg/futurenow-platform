// 공개·홈 부품 공용 상수 (4차 F-1).
//
// **시안에서 가져오는 것은 치수·위계이지 색값이 아니다**(발주 §1.1). 시안 HTML 의 네이비·골드는
//   시안 제작 시의 근사값이고 **앱 팔레트가 정본**이다. 그 값을 여기 적지 않는다 —
//   파일에 있으면 다음 사람이 복사한다(순수성 테스트가 hex 존재 자체를 막는다).
//   여기 있는 것은 전부 **치수**이고 색은 역할 토큰으로만 참조한다 — **색값 이관 0**.
//
// **@media 임의 수치 금지**(발주 §2). 반응형은 `design_system.md` §3.1 브레이크포인트만 쓴다.
//   CSS 변수는 `@media` 조건에 못 들어가므로 숫자는 리터럴이고, 이 상수가 **사람이 대조할 한 곳**이다.

/** design_system §3.1 — 이 넷 외의 폭을 쓰지 않는다. */
export const BP = { sm: 640, md: 768, lg: 1024, xl: 1280 } as const;

/** design_system §3.1 — 영역별 최대 폭. */
export const W = { public: 1200, participant: 720, sidebar: 250 } as const;

/** 시안 P1 실측 치수 — 부품 사양(발주 §3)이 지목한 값. */
export const SPEC = {
  gnb: { height: 70, padX: 40, logo: 19, en: 10, enTracking: '.2em', gap: 30, login: 13.5 },
  hero: {
    padY: 74,
    eyebrow: 11.5,
    eyebrowTracking: '.24em',
    h1Lg: 52,
    h1Sm: 26,
    h1Tracking: '-.035em',
    lead: 16,
    leadLine: 1.85,
    leadMax: 460,
    cols: '1.05fr .95fr',
    gap: 64,
    gradient: 150,
  },
  growAxis: { padLeft: 34, letter: 36, letterW: 38, en: 10.5, enTracking: '.18em', ko: 15, rowPadY: 13 },
  cardBand: { gap: 22 },
  week: { gap: 12, ruleW: 2, num: 11, numTracking: '.1em', title: 14 },
  roleCard: { pad: '22px 20px', who: 12, title: 20, sub: 12.5, glowSize: 150, glowOffset: -46 },
  quick: { gap: 10, pad: 14 },
  chip: { size: 44, radius: 12, font: 14 },
  sheet: { topPad: '18px 20px 20px', name: 18, cohort: 10.5, groupH: 11, item: 14.5 },
} as const;

/** 시안 골드 hairline·방사광의 **투명도**(색은 토큰, 알파만 시안 값). */
export const GOLD_ALPHA = { hairline: 0.28, glow: 0.28, badgeBg: 0.18 } as const;
