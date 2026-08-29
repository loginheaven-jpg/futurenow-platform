// 화면 크롬 표 — **제목과 뒤로는 라우트의 성질이다** (U-2 · 지휘부 판정 (다) 2026-08-31).
//
// **화면이 자기 제목을 아는 것은 우연이지 필연이 아니다.** 껍데기가 헤더를 그리려면
//   제목과 뒤로를 알아야 하고, 그 둘은 화면의 사정이 아니라 **라우트의 사정**이므로 여기 모은다.
//
// **왜 `_lib` 인가**(지휘부 조건 ②): 화면 디렉터리에 두면 다음 사람이 **화면 부속**으로 읽는다.
//
// **뒤로는 값이 아니라 규칙이다**(지휘부 조건 ③): 제목은 문자열이지만 **뒤로는 경로**라
//   박아 두면 라우트가 바뀔 때 낡는다. 기본은 **가장 가까운 조상 라우트**이고,
//   규칙이 안 통하는 자리만 값으로 박는다. `CLAUDE.md` §11 의 값 두 분류 그대로다.
//
// **표에 없는 라우트가 생기면 운다**(지휘부 조건 ①): `tests/screenChrome.test.ts` 가
//   껍데기 아래 모든 `page.tsx` 가 여기 있는지 잰다. 없으면 **빈 제목이 조용히 나온다.**
//
// ⚠ **여기 제목은 하나도 지어내지 않았다.** 전부 각 화면이 쓰던 `AppHeader title` 을 그대로 옮겼다.
//   한 번 지어냈다가 되돌렸다 — 터미널이 한글을 깨뜨린 출력을 옮겨 적어 다섯이 틀렸고,
//   파일로 뽑아 읽어 고쳤다(계열 ⑦ — 정본에서 읽지 않고 추측한 값).
import { VALUE_TOOL } from '@/instruments/futurenow/values/copy';

/**
 * 헤더 모드 — `AppHeader` 의 `variant` 셋에 `member` 를 더한다.
 *   `member` 는 **제목 바가 아니라 로고 GNB** 다(`SiteGnb variant="member"`).
 *   그 셋은 제목이 없다 — **없는 것을 지어내지 않으려고 타입으로 갈랐다.**
 */

export type ChromeKind =
  | { kind: 'gnb'; menu: true }
  | {
      kind: 'bar';
      variant: 'root' | 'sub' | 'flow';
      title: string;
      back?: string;
      menu: boolean;
      actions?: true;
      /**
       * **`flow` 아래 한 칸**(지휘부 판정 2026-08-29 · U-4 §5 후속).
       *
       * `flow` 가 뜻하는 것은 «진입 선형 플로우에서 **중간에 새는 것**을 막는다» 이지
       *   «나가는 길이 **하나도** 없다» 가 아니다. 둘을 한 낱말로 부르던 것이 표기의 오류였고,
       *   **표가 틀렸지 실물이 틀린 것이 아니다** — 화면은 그대로 두고 표를 실물에 맞춘다.
       *
       * 여기 적는 것은 **되돌아가는 문 하나**다. 가입을 그만두는 사람이 갈 곳이고,
       *   없으면 **가입을 시작한 사람이 갇힌다.**
       *   `sub` 로 올려 GNB 를 세우는 길을 쓰지 않는 이유가 여기 있다 —
       *   **되돌아가는 문 하나와 여섯으로 흩어지는 문은 다르다.**
       *
       * 문은 **본문이 든다**(화면을 바꾸지 않았다). 이 칸은 *그 문이 있어야 한다* 는 선언이고
       *   잠금이 그것을 잰다 — 걷히면 레드다.
       */
      exit?: { label: string; href: string; why: string };
    }
  /**
   * **껍데기를 두르지 않는다.** 표에서 빼지 않고 여기 둔다 —
   *   *예외가 규약 밖에 살면 다음 사람이 못 본다*(지휘부 판정 · `flow` 둘에 준 근거와 같다).
   *   빼면 잠금이 그 라우트를 안 세고, 다음 사람은 **왜 없는지도** 못 본다.
   */
  | { kind: 'none'; why: string };

/**
 * 라우트 패턴 → 크롬. 키는 Next 라우트 패턴 그대로다.
 * **라우트 그룹 `(member)` 는 키에 넣지 않는다** — URL 에 안 나타난다.
 */
export const SCREEN_CHROME: Record<string, ChromeKind> = {
  // ── 로고 GNB 셋 — 지금 `SiteGnb variant="member"` 를 그리는 화면들. 제목이 없다.
  '/home': { kind: 'gnb', menu: true },
  '/home/assessments': { kind: 'gnb', menu: true },
  '/my/cohorts/[cohortId]': { kind: 'gnb', menu: true },

  // ── 제목 바 — 제목·뒤로 전부 실측값이다.
  '/account': { kind: 'bar', variant: 'root', title: '내 정보', menu: true, actions: true },
  // 조상이 `/` 라 규칙이 안 통한다 — 회원의 처음 화면은 `/home` 이다.
  '/feed': { kind: 'bar', variant: 'sub', title: '동행', back: '/home', menu: true },
  '/pending': { kind: 'bar', variant: 'sub', title: '가입 신청', back: '/home', menu: true },
  '/my/cohorts': { kind: 'bar', variant: 'root', title: '내 차수', menu: true, actions: true },
  '/my/cohorts/[cohortId]/checkin/[session]': { kind: 'bar', variant: 'sub', title: '오늘의 갈무리', menu: true, actions: true },
  '/my/cohorts/[cohortId]/journey': { kind: 'bar', variant: 'sub', title: '나의 기록', menu: true, actions: true },
  // 조상은 차수 홈이나 **원래 목적지가 차수 목록**이었다 — 규칙을 덮는다.
  '/my/cohorts/[cohortId]/report': { kind: 'bar', variant: 'sub', title: '내 마음의 거울', back: '/my/cohorts', menu: true, actions: true },

  // ── `flow` 둘 — **메뉴를 달지 않는다.**
  //   `AppHeader` 정의가 *진입 선형 플로우용, 일부러 출구 없음* 이라 못 박았다.
  //   껍데기가 메뉴를 달면 **확정을 코드가 뒤집는다.** 규칙 2는 *메뉴는 한 자리에서만 열린다* 이지
  //   *모든 화면에 메뉴가 있다* 가 아니므로 부딪히지 않는다(지휘부 판정 2026-08-31).
  '/my/values': { kind: 'bar', variant: 'flow', title: VALUE_TOOL, menu: false },
  '/my/cohorts/[cohortId]/values': { kind: 'bar', variant: 'flow', title: VALUE_TOOL, menu: false },

  // ── 공개 영역이나 표를 함께 읽는다(지휘부 판정) — 껍데기가 하나이므로 표도 하나다.
  //   `/signup` 은 **단계가 없다**(실측: `step` 상태 0 · `AuthGate` 하나). 그래서 표로 풀린다.
  //   제목·모드는 `SignupClient` 가 넘기던 값 그대로다 — `title="회원가입"` · `onBack` 없음 → `flow`.
  //   **`flow` 이나 되돌아가는 문 하나가 있다**(지휘부 판정 2026-08-29). 아래 `exit` 이 그것이다.
  //   U-4 §5 에서 **4폭 실브라우저로 재어** 이 화면에는 로고가 서지 않음을 확인했다(로고 수 0) —
  //   그래서 여섯 화면에서 걷은 「처음으로」를 **여기서만 남겼다.** 걷었으면 유일한 출구가 사라진다.
  '/signup': {
    kind: 'bar', variant: 'flow', title: '회원가입', menu: false,
    exit: {
      label: '처음으로', href: '/',
      why: '가입을 그만두는 사람이 갈 곳. GNB 가 서지 않아(실측 로고 0) 이 문이 유일한 출구다.',
    },
  },

  // ── 껍데기 없음 — **제목이 설 자리가 없다**(실측 2026-09-01 · 지휘부 요구대로 재고 확정).
  //
  //   **성공하면 화면을 그리지 않는다.** 둘 다 마지막이 `redirect(...)` 다 —
  //     `/c/[code]/[session]` → `/my/cohorts/{id}/checkin/{session}`
  //     `/c/[code]/values`   → `/my/cohorts/{id}/values`
  //   **실패할 때만 안내 카드를 그린다.** 중앙정렬 한 덩이 + `홈으로` 하나다:
  //     `코드를 찾을 수 없어요.` · `{기수} 참여자 명단에 없어요.` · `Notice(SHORTCUT.notFound)` 등
  //
  //   그 안내는 **자기 문장을 이미 들고 있고 제목 슬롯이 없다.** 껍데기를 씌우면
  //   *안내 한 줄* 위에 제목 바가 얹혀 오히려 이상해진다 — 그래서 **문안 결재가 필요 없다.**
  //   지나가는 길이지 머무는 화면이 아니다.
  // ── 서가(A) — **목록은 표가 들고, 자료 제목은 통로가 든다.**
  //   `/library` 는 라우트의 성질이라 표가 든다. `/library/[id]` 의 제목은 **자료 제목**이라
  //   서버 데이터이고 표가 못 든다 — U-4 통로가 든다(`LibraryItemView`). 새 기제를 만들지 않았다.
  //   그래서 여기 `none` 이고, 그 사유가 «표가 들지 않는다» 다(`/join` 과 같은 형식).
  //   ★ `/library` 는 **`gnb` 다.** `bar` 로 두면 공개 껍데기가 GNB 와 푸터를 그리지 않아
  //     **로고가 사라진다** — U-4 §5 에서 「처음으로」를 걷을 때 «로고가 그 자리를 대신한다» 는
  //     실측을 근거로 삼았으므로, 여기서 로고를 없애면 **그 화면의 출구가 없어진다.**
  //     짓다가 한 번 `bar` 로 두었고 표 잠금이 아니라 **이 근거가 그것을 잡았다.**
  '/library': { kind: 'gnb', menu: true },
  '/library/[id]': { kind: 'none', why: '제목이 자료 제목이라 서버 데이터다 — 표가 들 수 없고 통로가 든다.' },

  // ── `/join` — **표가 정할 수 없는 자리**(U-4 §1). URL 은 하나인데 화면이 여덟이다.
  //   단계 크롬은 `(public)/join/joinChrome` 이 들고 화면이 통로로 알려 온다(표를 이긴다).
  //   여기 `none` 은 *크롬이 없다* 가 아니라 **표가 들지 않는다**는 뜻이고,
  //   통로가 `null` 을 주는 세 단계(`resolving`·`runner`·`done`)에서 실제로 민무늬가 된다 —
  //   **오늘과 같다.** 진입 선형 플로우에 GNB·푸터를 새로 달지 않는다(위 `flow` 둘과 같은 근거).
  '/join': { kind: 'none', why: '단계마다 크롬이 다르다 — 통로(useSetChrome)가 든다. 표는 라우트의 성질만 적는다.' },

  '/c/[code]/[session]': { kind: 'none', why: '알림·리다이렉트 진입점. 사람이 읽는 제목이 없다 — 문안 미정(최박사 결재).' },
  '/c/[code]/values': { kind: 'none', why: '알림·리다이렉트 진입점. 사람이 읽는 제목이 없다 — 문안 미정(최박사 결재).' },

  // ── 콘솔(U-3) — **제목·뒤로는 각 화면이 쓰던 값 그대로다.** 소스에서 뽑아 옮겼다.
  //
  //   **`subtitle` 은 표가 들지 않고 본문이 든다**(최박사 결재 2026-09-01).
  //     차수 이름·비교 문구는 **서버 데이터**라 라우트의 성질이 아니다.
  //     `/matrix`·`/values` 는 기수 이름을, `/group` 은 비교 문구를 **본문 첫 줄**에 그린다.
  //     **헤더 부제 통로가 서면 U-4 에서 옮길지 판단한다** — 지금은 통로가 없고,
  //     통로를 만드는 것은 새 기제라 이 회차의 범위가 아니다.
  '/coach': { kind: 'bar', variant: 'root', title: '콘솔', menu: true },
  '/coach/cohorts': { kind: 'bar', variant: 'sub', title: '모든 차수', back: '/coach', menu: true },
  '/coach/new': { kind: 'bar', variant: 'sub', title: '차수 개설', back: '/coach/cohorts', menu: true },
  '/coach/cohort/[cohortId]': { kind: 'bar', variant: 'sub', title: '기수 대시보드', back: '/coach/cohorts', menu: true },
  '/coach/cohort/[cohortId]/checkin': { kind: 'bar', variant: 'sub', title: '회차 갈무리 현황', menu: true },
  '/coach/cohort/[cohortId]/checkin/preview': { kind: 'bar', variant: 'sub', title: '갈무리 카드 미리보기', menu: true },
  '/coach/cohort/[cohortId]/group': { kind: 'bar', variant: 'sub', title: '그룹 리포트', menu: true },
  '/coach/cohort/[cohortId]/matrix': { kind: 'bar', variant: 'sub', title: '갈무리 격자', back: '/coach/cohort/[cohortId]/checkin', menu: true },
  '/coach/cohort/[cohortId]/member/[userId]': { kind: 'bar', variant: 'sub', title: '갈무리 기록', back: '/coach/cohort/[cohortId]/checkin', menu: true },
  '/coach/cohort/[cohortId]/report/[responseId]': { kind: 'bar', variant: 'sub', title: '개인 리포트', menu: true },
  '/coach/cohort/[cohortId]/values': { kind: 'bar', variant: 'sub', title: VALUE_TOOL, back: '/coach/cohort/[cohortId]', menu: true },
  '/admin': { kind: 'bar', variant: 'root', title: '본부', menu: true },
  // **신설 하나** — 지금 헤더가 없다. 승인 큐 «내용» 은 5-3 이 다루고 U-3 은 헤더만 세운다.
  '/admin/approvals': { kind: 'bar', variant: 'sub', title: '가입 승인', back: '/admin', menu: true },
};

/** 가장 가까운 조상 라우트 — 뒤로의 **규칙**. 값으로 박지 않는다. */
export function nearestAncestor(pattern: string): string | undefined {
  const segs = pattern.split('/').filter(Boolean);
  for (let i = segs.length - 1; i >= 1; i--) {
    const cand = `/${segs.slice(0, i).join('/')}`;
    if (SCREEN_CHROME[cand]) return cand;
  }
  return undefined;
}

/** 실제 경로를 라우트 패턴으로 되돌린다(`/my/cohorts/abc/journey` → `/my/cohorts/[cohortId]/journey`). */
export function patternOf(pathname: string, params: Record<string, string | string[] | undefined>): string {
  let out = pathname;
  for (const [k, v] of Object.entries(params)) {
    if (typeof v !== 'string' || !v) continue;
    out = out.split(`/${v}`).join(`/[${k}]`);
  }
  return out;
}

/** 뒤로 목적지를 실제 경로로 — 패턴의 `[x]` 를 지금 params 로 되돌린다. */
export function resolveBack(pattern: string, params: Record<string, string | string[] | undefined>): string | undefined {
  const c = SCREEN_CHROME[pattern];
  if (!c || c.kind !== 'bar') return undefined;
  const target = c.back ?? nearestAncestor(pattern);
  if (!target) return undefined;
  let out = target;
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === 'string' && v) out = out.split(`[${k}]`).join(v);
  }
  return out;
}
