# 내비게이션 `<Link>` 전환 + 액션 pending — 완료 보고 (ADR-120)

- 일자: 2026-08-26
- 지시: `docs/tasks/CC_ORDER_nav_link_pending_v1.md`(2026-08-25) · **검토 후 정정 넷 반영**
- 승인: ADR-52 번복 — 지휘부 2026-08-26
- 선행: P1(함수 리전 서울 전환) 최박사 완료
- 함께: `docs/reports/2026-08-25-성능감사.md`

---

## 0. 요약

발주서를 그대로 따르지 않았습니다. **검토에서 사실 오류 셋과 성립하지 않는 전제 하나를 찾아** 지휘부 승인을 받고 정정해 실행했습니다.

| | |
|---|---|
| 전환 | 내부 앵커 **57곳 / 25파일** → `next/link` |
| 예외 | **3곳** (tel·mailto·`error.tsx`) — grep 으로 증명 |
| 추가 | 눌림 피드백(발주서에 없던 항목) · 잠김 결함 4건 · `vercel.json` |
| 실증 | **`loading.tsx` 가 처음으로 발동** — 실브라우저 캡처 |
| 검증 | tsc 0 · eslint 0 · vitest **816** · build 성공 |

---

## 1. 선행 실측 (§3.1) — P1 효과 확정

발주서가 정지 조건으로 건 항목입니다.

| 경로 | `icn1::iad1` (전) | `icn1::icn1` (후) |
|---|---|---|
| **`/login`** (DB 호출 0) | **349~452ms** | **150~236ms** |
| `/recruit` (엣지 캐시) | 150ms | 150~173ms |

`X-Vercel-Id` 가 **`icn1::iad1::` → `icn1::icn1::`** 로 바뀐 것을 헤더로 확인했습니다. **정지 조건 통과 — 작업을 진행했습니다.**

> **발주서 §3.1 정정**: 대조 기준이 `median 1573ms(warm-min 899)` 였으나 ADR-66 실물은 `1573 → 1596(warm-min 1141 → 899)` 로, **개선 전 median 과 개선 후 warm-min 을 한 쌍으로 묶은 것**입니다. 짝을 맞추면 전 `1573/1141` · 후 `1596/899` 입니다.
>
> **§3.1 이 지정한 `/home`·`/my/cohorts/[id]`·`/coach` 는 재지 못했습니다** — 인증 세션이 필요합니다. `/login` 을 baseline 으로 대체했고, 인증 3면은 지휘부 계정 확인이 필요합니다(성능감사 §7-1).

---

## 2. 전환 (§3.2) — 잔존 `<a>` 증명

```
$ grep -rn "<a " src --include="*.tsx"
src/app/coach/.../MemberProfilePanel.tsx:34   href={`tel:${...}`}
src/app/coach/.../MemberProfilePanel.tsx:37   href={`mailto:${...}`}
src/app/error.tsx:32                          href="/"
```

**잔존 3곳 == 예외 목록**입니다.

| 예외 | 사유 |
|---|---|
| `tel:` · `mailto:` | §2-6 외부 스킴 |
| `error.tsx:32` | 에러 경계에서 홈으로 갈 때는 **전체 새로고침이 의도**(상태 초기화) |

`global-error.tsx` 는 §2-5 가 예외로 지정했으나 **애초에 `<a>` 가 없어** 해당 사항이 없었습니다.

전환 후: `<Link>` **60개** · `next/link` import **25파일**. `className`·`style`·`aria-*` 는 그대로 옮겼습니다(시각 델타 0).

### `prefetch={false}` — 발주서 §3.2 정정

발주서는 *"prefetch 속성은 명시하지 않는다(기본값). force-dynamic 라우트는 Next 가 loading 경계만 선적재하므로 서버 부하 우려 없음"* 이라 했습니다. **이 앱에서는 성립하지 않습니다.**

| 근거 | |
|---|---|
| `prefetching.md:308` | *"**많은 링크 목록을 렌더할 때**(예: 무한 스크롤 표) 불필요한 자원 사용을 피하려 prefetch 를 끄고 싶을 수 있다"* |
| `linking-and-navigating.md:88` | 동적 라우트는 프리페치가 건너뛰어지거나 **`loading.tsx` 가 있으면 부분 프리페치**된다 |
| `loading.md:78·88` | `loading.js` 는 `page.js` **와 그 아래 모든 자식**을 Suspense 로 감싼다 |

루트 `loading.tsx` 가 하위 전부를 덮으므로 **28/32 동적 라우트가 전부 프리페치 대상**이 되고, **프리페치 RSC 요청도 `proxy.ts` matcher 를 지나 `getUser()`(네트워크)를 부릅니다.**

격자는 **9명 × 7회차 = 한 화면에 링크 72개**입니다.

→ **격자(`MatrixView`)·로스터(`RosterDetail`)만 `prefetch={false}`**, 나머지는 기본값입니다.

---

## 3. loading.tsx 발동 실증 (§3.3)

**실브라우저(Playwright)** 로만 판정했습니다 — `fetch 200 ≠ browser normal`.

`/login` → `/signup` 전환, RSC 응답을 1.6초 지연시켜 느린 네트워크를 재현했습니다.

| 검사 | 결과 |
|---|---|
| 자원 오류 0건 | PASS |
| 출발 화면에 로딩 요소 **없음** | PASS |
| **전환 중 `main[aria-busy="true"]` 가 보인다** | **PASS** |
| 그 문구가 `불러오는 중…` | PASS |
| **클라이언트 전환이다(`document` 재요청 0건)** | **PASS** |
| 전환 뒤 로딩 사라짐 | PASS |
| `/signup` 도달 | PASS |

**`loading.tsx` 가 만들어진 뒤 처음으로 화면에 떴습니다.**

### 위양성 하나를 잡았습니다

첫 시도에서 **클라이언트 전환이 안 되는 것처럼** 보였습니다 — `document` 요청 + 전체 JS 재다운로드. 원인은 포트 3000 에 남아 있던 **이전 빌드의 좀비 프로세스**였습니다(`EADDRINUSE` 로 새 서버가 바인드 실패). 청크 매니페스트가 안 맞아 JS 가 **500 여섯 건** → 하이드레이션 실패 → 앵커 기본 동작.

**문자열 검사(`'불러오는 중' in content()`)로는 PASS 가 나왔습니다** — 로딩 문구가 flight 페이로드에 이미 들어 있기 때문입니다. **요소 가시성으로 바꿔 판정한 것이 위양성을 잡았습니다.**

---

## 4. 액션 pending (§3.4) — 발주서 §1-3 정정

> 발주서: *"`JoinClient` 만 자체 `busy` 가드 보유"*

**사실이 아닙니다.** `busy` 는 **34개 파일**에 있고, `router.refresh` 를 쓰는 **8개 파일 전부**가 갖고 있습니다. 발주서가 *"우선하라"* 고 지목한 `CheckinCardClient` 는 이미 `disabled={busy}` 완비였습니다.

### 전수 조사 (§3.4 요구)

| 파일 | 판정 | 조치 |
|---|---|---|
| `CohortDetailClient.run()` | **무가드** | `useTransition` + `if (pending) return` |
| `CohortDetail.tsx` | 완비(`try/finally` × 7 · `disabled` × 10) | 선택 prop `actionPending` 추가 |
| `CheckinCardClient.doSubmit` | 가드 있으나 **`finally` 없음** | `try/catch/finally` |
| `LoginClient.onSubmit` | **`catch` 없음** | `try/catch` |
| `CoachPhotos` | `finally` 없음 | `try/finally` |
| `ScheduleSeedClient` (2곳) | `finally` 없음 | `try/finally` |
| `LogoutButton` | 안전(`catch` 에서 해제) | 무변경 |
| `AdminClient` · `ConsentGate` · `JoinClient` | 자체 가드 보유 | 무변경 |

### 왜 `finally` 가 없으면 심각한가

**async 이벤트 핸들러의 예외는 React 에러 경계로 가지 않습니다** — unhandled rejection 이 되고 컴포넌트는 살아남습니다. 그래서 `busy` 가 `true` 로 남아 **새로고침 전까지 버튼이 죽습니다.**

- `CheckinCardClient.doSubmit` — **참여자 제출**. 배포 스큐(`Failed to find Server Action`)나 네트워크 끊김에서 발동
- `LoginClient.onSubmit` — **현관**. 잠기면 아무 데도 못 갑니다

### `run()` — refresh 구간까지 덮습니다

`CohortDetail` 은 자체 `busy` 로 `onXxx()` 동안 버튼을 잠그지만, `run()` 은 그것이 resolve 된 **뒤에** `router.refresh()` 를 돌립니다. 그 구간에 버튼이 살아났습니다.

`useTransition` 이 refresh 재렌더까지 pending 에 포함하므로 *"눌렀는데 아무 일도 없다"* 구간 전체를 덮습니다. `CohortDetail` 에 **선택 prop** `actionPending` 을 더해(기본 `false` → 다른 호출부 무변경) 그 구간에도 비활성이 되게 했습니다. **이름 변경(낙관적·ADR-62)은 §2 대로 건드리지 않았습니다.**

---

## 5. 발주서에 없던 항목 — 눌림 피드백

**증상 2 의 나머지 절반입니다.** `<Link>` 로는 안 고쳐집니다.

```css
/* node_modules/tailwindcss/preflight.css:45 */
-webkit-tap-highlight-color: transparent;
```

`src/` 에 되돌리는 선언이 **0건**이고, 저장소 전체 `:active` 규칙 **3개**가 전부 `.ui-btn--*`·`.ui-listrow--tappable` 전용인데 **헤더와 홈 카드 행은 인라인 스타일이라 그 클래스가 안 붙어 있었습니다.** → **탭한 사실 자체가 화면에 남지 않았습니다.**

### 새 색을 고르지 않았습니다 (§8)

`.ui-btn--primary:active` 가 이미 쓰는 **`brightness(0.94)`** 를 그대로 재사용하고, 탭 하이라이트를 `initial` 로 되돌렸습니다(브라우저 기본값 — 제가 고른 색이 아닙니다).

> 감사의 원안(`.ui-listrow--tappable` 부여)은 **쓸 수 없었습니다** — `ActivityRow` 배경이 이미 `--color-surface-1` 이라 그 `:active` 는 **같은 색**이 되어 눌러도 안 보입니다.

### 실증

실브라우저 computed style: 평상시 `filter: none` → 누르는 중 **`brightness(0.94)`** · 탭 하이라이트 복원 선언 존재. **전부 PASS.**

---

## 6. 함께 넣은 것

| 항목 | 사유 |
|---|---|
| **`vercel.json`** `{"regions":["icn1"]}` | P1 은 **대시보드 설정이라 코드에 없습니다.** 프로젝트 재연결·설정 되돌림으로 조용히 회귀합니다 |
| 홈 `내 세미나` 직결 | 차수가 하나면 `/my/cohorts` 가 즉시 리다이렉트하므로(`page.tsx:20`) 목록 경유는 **서버 렌더를 한 번 더** 돌립니다. 같은 파일 `reportHref` 와 같은 판정입니다. 테스트로 잠갔습니다 |

## 7. 하지 **않은** 것

| 항목 | 사유 |
|---|---|
| `force-dynamic` 정리 | **25곳 중 22곳이 no-op.** `cookies()`/`searchParams` 가 이미 동적으로 만듭니다. 지워도 1ms 도 안 바뀝니다 |
| `ResponseRunner` 에 `catch` 추가 | 감사가 지목했으나 **이미 `try/finally` 가 있습니다**. `catch` 를 더하면 에러를 삼키게 되어 §3 위반입니다 |
| `CHECKIN_ANSWERS_SCHEMA` 지연 생성 | 감사의 `-70KB` 는 맞으나 **지연 생성으로는 안 됩니다** — 클라이언트 4곳이 `createCoreContext` 를 **값으로** import 해서 모듈째 번들에 들어갑니다. 서버 전용 모듈 분리가 필요하고 그것은 §3 사전 보고 대상입니다 |
| 폰트 self-host · 스켈레톤 | §8 지휘부 소관 |

---

## 8. 검증

| 항목 | 결과 |
|---|---|
| `tsc --noEmit` | **0** |
| `eslint` | **0** (기존 경고 2건 — `contracts/instrument.ts`, 무관) |
| `vitest` | **816 통과** / 5 skip (812 → 816) |
| `next build` | 성공 |
| §4-2 잔존 `<a>` == 예외 목록 | **증명** (§2) |
| §4-3 실브라우저 발동 | **PASS 7/7** (§3) |
| §4-4 pending 실증 | 전수 조사 + `if (pending) return` (§4) |
| 눌림 피드백 실증 | computed style PASS (§5) |

**경계 준수**: 계약 0 · DB 0 · 마이그레이션 0 · `proxy.ts` 0 · 라우트/쿼리 0 · **문구 0**(pending 은 비활성화로만 알립니다) · `docs/tasks/` 지시서 0.

---

## 9. 질의 1건 (§3.4 가 올리라 한 것)

**`LoginClient` 예외 시 문구.**

- 기존 `이메일 또는 비밀번호를 확인해 주세요` 는 **네트워크 오류에 틀린 안내**입니다 — 사용자가 비밀번호를 반복해 다시 칩니다
- 새 문구 신설은 **§2-1 금지**
- 그래서 **잠김만 풀고 문구는 비웠습니다**

문구를 하나 주시면(예: `연결이 불안정합니다. 잠시 후 다시 시도해 주세요.`) 한 줄로 넣겠습니다.

---

## 10. 남은 것

1. **인증 페이지 실측** — `/home`·`/my/cohorts/[id]`·`/coach` 는 세션이 필요합니다(성능감사 §7-1)
2. **iOS Safari 탭 하이라이트** — 데스크톱 Chromium 으로만 확인했습니다(성능감사 §7-2)
3. **Hobby 플랜 `vercel.json` 리전 적용 여부** — 문서로 확인 못 했습니다. 배포 후 `x-vercel-id` 로 판정하십시오
4. 중기 항목(직렬 await·폰트·번들) — 성능감사 §4-B
