// F-5 총검증 화면 목록 — **단일 출처** (4차 F-5 준비).
//
// F-1~F-4 는 회차마다 캡처 경로를 따로 만들었다(`captures/f1`·`f2`·`f2b`·`f3`·`f4`).
//   **여기서 하나로 묶는다** — 목록이 다섯 곳에 흩어져 있으면 F-5 에서 한 화면이 조용히 빠진다.
//
// **두 묶음으로 가른다**(지휘부 지시):
//   · `public` — 비인증. **오늘 바로 실라우트로 찍는다**(서버를 띄워 진짜 화면을 본다)
//   · `auth`   — 인증 뒤. **QA 계정 대기**. 계정이 오기 전에는 `fixture`(표시 층 SSR)로 대신한다
//
// 경계는 추측이 아니라 **`PROTECTED_PREFIXES` 실측**이다
//   (`src/proxy.guard.ts` — `/home` `/my` `/coach` `/admin` `/account` `/preview` `/feed`).

/** 개요 §2 의 넷. 이 밖의 폭을 쓰지 않는다. */
export const WIDTHS = [1280, 1024, 768, 390];

/**
 * 공개 화면 — **비인증으로 실라우트를 연다.**
 * `path` 가 곧 URL 이고 `name` 이 곧 파일 이름이다.
 */
export const PUBLIC_SCREENS = [
  { name: 'home',     path: '/',          note: '공개 현관 — 시안 P1·A (F-2)' },
  { name: 'about',    path: '/about',     note: '소개 — 원고 §1~§4 (F-2b)' },
  { name: 'recruit',  path: '/recruit',   note: '모집 랜딩 — lg 2단 + 카드 4 (F-4 후속)' },
  { name: 'news',     path: '/news',      note: '소식 목록' },
  { name: 'library',  path: '/library',   note: '자료실' },
  { name: 'contact',  path: '/contact',   note: '문의' },
  { name: 'login',    path: '/login',     note: '로그인' },
  { name: 'signup',   path: '/signup',    note: '회원가입 — 진입 퍼널' },
  { name: 'join',     path: '/join',      note: '코드 입장 — 진입 퍼널' },
  { name: 'pending',  path: '/pending',   note: '승인 대기 안내' },
  { name: 'reset',    path: '/reset',     note: '비밀번호 재설정' },
];

/**
 * 인증 뒤 화면 — **QA 계정이 오면 실라우트로 연다.**
 *
 * `fixture` 가 있는 것은 계정 전에도 **표시 층을 SSR 로 그려** 대신 찍을 수 있다는 뜻이다
 * (F-1~F-4 가 그렇게 했다). `fixture` 가 없는 것은 **계정 없이는 아예 못 본다.**
 *
 * `path` 의 `{cohort}` 는 QA 차수 코드가 아니라 **차수 id** 로 치환한다(실행 시 주입).
 */
export const AUTH_SCREENS = [
  { name: 'member-home',   path: '/home',                          fixture: 'home',        role: 'user',  note: '로그인 홈 — 시안 B (F-3)' },
  { name: 'member-sheet',  path: '/home',                          fixture: 'home-sheet',  role: 'user',  note: '전체 메뉴 시트 — 시안 E (F-3) · 햄버거를 눌러야 보인다' },
  { name: 'cohort-home',   path: '/my/cohorts/{cohort}',           fixture: 'cohort',      role: 'user',  note: '차수 홈 — 시안 C (F-4)' },
  { name: 'assessments',   path: '/home/assessments',              fixture: 'assess',      role: 'user',  note: '진단 홈 — 시안 F (F-4)' },
  { name: 'preview-site',  path: '/preview/site',                  fixture: 'gallery',     role: 'user',  note: '부품 전시 15종 (F-1~F-2b)' },
  { name: 'my-cohorts',    path: '/my/cohorts',                                            role: 'user',  note: '내 기수 목록' },
  { name: 'journey',       path: '/my/cohorts/{cohort}/journey',                           role: 'user',  note: '되비추기' },
  { name: 'feed',          path: '/feed',                                                  role: 'user',  note: '동행 피드 — QA 차수 kind=seminar 라 열린다(A안)' },
  { name: 'account',       path: '/account',                                               role: 'user',  note: '내 정보 · 로그아웃' },
  { name: 'coach-console', path: '/coach',                                                 role: 'coach', note: '인도자 콘솔 홈 — **사이드바 lg↑/미만**(3차 T-4)' },
  { name: 'coach-cohort',  path: '/coach/cohort/{cohort}',                                 role: 'coach', note: '차수 상세 — 명단·회차' },
];

/** 표시 층 SSR 픽스처 이름 → 하네스가 쓰는 산출 파일. `tests/site.snapshot.test.tsx` 가 만든다. */
export const FIXTURE_FILES = {
  gallery: { body: 'body.html', full: true },
  'gallery-sheet': { body: 'body-sheet.html', full: false },
  home: { body: 'home.html', full: true },
  'home-sheet': { body: 'home-sheet.html', full: false },
  cohort: { body: 'cohort.html', full: true },
  assess: { body: 'assess.html', full: true },
};

/** 계정이 오기 전 **못 보는** 화면 — 보고서에 그대로 적는다(빠뜨린 것과 못 본 것은 다르다). */
export const AUTH_ONLY_NO_FIXTURE = AUTH_SCREENS.filter((s) => !s.fixture).map((s) => s.name);
