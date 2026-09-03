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
  { name: 'library',  path: '/library',   note: '서가' },
  { name: 'contact',  path: '/contact',   note: '문의' },
  { name: 'login',    path: '/login',     note: '로그인' },
  { name: 'signup',   path: '/signup',    note: '회원가입 — 진입 퍼널' },
  { name: 'join',     path: '/join',      note: '코드 입장 — 진입 퍼널' },
  // ★ **딥링크를 반드시 찍는다**(지휘부 채택 2026-08-29). U-4 는 `/join` 첫 단계만 찍어
  //   `?code=` 경로를 **한 번도 열지 않았고**, 그것이 무한 재호출을 못 본 구멍의 절반이었다.
  //   실기수 화면을 **열기만** 한다 — 「들어가기」는 누르지 않는다(캡처는 클릭하지 않는다).
  { name: 'join-code', path: '/join?code=ZR4KB', note: '딥링크 — 차수 미리보기 단계' },
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
  // **눌러야 보이는 화면이다.** URL 이 `/home` 과 같으므로 `open` 이 없으면
  //   하네스가 홈을 두 번 찍는다(F-5 준비 실측에서 실제로 그랬다).
  { name: 'member-sheet',  path: '/home',                          fixture: 'home-sheet',  role: 'user',  open: '전체 메뉴 열기', full: false, note: '전체 메뉴 시트 — 시안 E (F-3)' },
  { name: 'cohort-home',   path: '/my/cohorts/{cohort}',           fixture: 'cohort',      role: 'user',  note: '차수 홈 — 시안 C (F-4)' },
  { name: 'assessments',   path: '/home/assessments',              fixture: 'assess',      role: 'user',  note: '진단 홈 — 시안 F (F-4)' },
  { name: 'preview-site',  path: '/preview/site',                  fixture: 'gallery',     role: 'user',  note: '부품 전시 15종 (F-1~F-2b)' },
  { name: 'my-cohorts',    path: '/my/cohorts',                                            role: 'user',  note: '내 기수 목록' },
  { name: 'journey',       path: '/my/cohorts/{cohort}/journey',                           role: 'user',  note: '되비추기' },
  { name: 'feed',          path: '/feed',                                                  role: 'user',  note: '동행 피드 — QA 차수 kind=seminar 라 열린다(A안)' },
  { name: 'account',       path: '/account',                                               role: 'user',  note: '내 정보 · 로그아웃' },
  { name: 'coach-console', path: '/coach',                                                 role: 'coach', note: '인도자 콘솔 홈 — **사이드바 lg↑/미만**(3차 T-4)' },
  { name: 'coach-cohort',  path: '/coach/cohort/{cohort}',                                 role: 'coach', note: '회기 상세 — 명단·회차' },
  // ★★ **운영자 둘이 U-6 에서 늘었다**(지휘부가 QA 운영자 계정을 만들어 주었다 — 2026-09-03).
  //   전에는 이 목록에 `/admin` 행이 **아예 없었고**, `admin` 픽스처는 `AdminMembers` 를 껍데기 없이
  //   단독 렌더한 것이라 `.console-title`·벨트·시트가 그림에 없었다 — **재는 창이 결함이 사는 층을 안 덮었다**(⑨-c).
  { name: 'admin-home',      path: '/admin',           fixture: 'admin', role: 'admin', note: '본부 — 인도자 신청 · 멤버 관리' },
  { name: 'admin-approvals', path: '/admin/approvals',                   role: 'admin', note: '가입 승인 큐 — U-6 이전에는 픽스처조차 없었다' },
];

/**
 * `open` — 캡처 전에 누를 버튼의 접근성 이름. 없으면 누르지 않는다.
 * `full` — 전체 높이 캡처 여부(기본 true). `position: fixed` 인 것은 뷰포트 한 화면이 맞다.
 */

/** 표시 층 SSR 픽스처 이름 → 하네스가 쓰는 산출 파일. `tests/site.snapshot.test.tsx` 가 만든다. */
export const FIXTURE_FILES = {
  gallery: { body: 'body.html', full: true },
  'gallery-sheet': { body: 'body-sheet.html', full: false },
  home: { body: 'home.html', full: true },
  'home-sheet': { body: 'home-sheet.html', full: false },
  cohort: { body: 'cohort.html', full: true },
  assess: { body: 'assess.html', full: true },
  // ★ **이제 실라우트로 본다**(U-6 — `QA_ADMIN_*` 가 생겼다). 픽스처는 표시 층 대조군으로 남긴다.
  //   ⚠ 이 픽스처는 `AdminMembers` **단독 렌더**라 껍데기(`.console-title`·벨트·시트)를 담지 않는다.
  //   그 한계를 적어 두지 않으면 다음 사람이 「봤다」고 읽는다.
  admin: { body: 'admin.html', full: true },
};

/** 계정이 오기 전 **못 보는** 화면 — 보고서에 그대로 적는다(빠뜨린 것과 못 본 것은 다르다). */
export const AUTH_ONLY_NO_FIXTURE = AUTH_SCREENS.filter((s) => !s.fixture).map((s) => s.name);
