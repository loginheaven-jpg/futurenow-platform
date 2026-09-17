# 워크북 사진 — 완주 보고 (ADR-197)

> 매 회차 갈무리 맨 위 「오늘 워크북 갈무리」 · 「인도자 열람」 참여자 선택 · 장수 무제한 · 미리보기 · 편지 사진 합침 · 모아 보기 제외
> 마이그레이션 `20260918090001` **적용됨**(2026-09-18) · `main` 배포 · 실화면 전항 통과

## 0. 결정 기록 (2026-09-18 · 릴레이)

| 항목 | 결정 |
|---|---|
| 자리 | 매 회차 갈무리 **맨 위** · 제목 「오늘 워크북 갈무리」(제목만) |
| 편지 사진 | **합친다** — 1·2회차 블록에 안내 한 줄 「종이에 쓴 편지도 여기에 촬영해 첨부하십시오.」 · 편지 칸의 첨부 문장은 **삭제** |
| 열람 | 「인도자 열람」 체크 — **기본 체크** · 회차 단위로 **묶어서** 공개/비공개 |
| 장수 | 제한 없음 · 작은 미리보기 |
| 모아 보기 | 사진 **제외** |
| 적용 | **1회차부터**(2기 1회차 9/20) |
| 계약·권한 변경 | **이 지시로 승인**(불변식 3) |
| 보관 공지 | 2기 모집 자료에 들어 있다(동의 근거) |

## 1. 구현 파일 · 상태

| 파일 | 상태 | 무엇 |
|---|---|---|
| `supabase/migrations/20260918090000_workbook_photos_rollback.sql` | 완 · 먼저 섰다 | 정책·RPC 를 직전 모양 그대로 되돌리고 표·함수를 걷는다 · ⚠ 적용 전 해제 행 수 0 확인 규칙 |
| `supabase/migrations/20260918090001_workbook_photos.sql` | 완 · **적용됨** | `checkin_photo_prefs` 표 · 판정 함수 `checkin_photos_staff_view` · 저장소 열람 정책 · 목록 RPC(판정 + 올린 순서) · 쓰기 RPC `checkin_photo_prefs_set` |
| `src/contracts/domain.ts` · `core-context.ts` | 완 · **승인된 변경** | `CheckinPhoto.thumbUrl?` · `getMyCheckinPhotoCoachView` · `setMyCheckinPhotoCoachView` |
| `src/core/checkinPhotos.ts` (신규) | 완 | 경로 규약 한 곳 — 버킷 · 미리보기 경로 · 원본 단위 묶기(순서 보존) |
| `src/core/context.ts` | 완 | 목록: 묶기 + 서명 한 번(`createSignedUrls`) · 삭제: 미리보기 함께 · 선택 읽기/쓰기 |
| `src/instruments/futurenow/checkin/workbook.ts` (신규) | 완 | 제목·체크 문안 한 곳 · '워크북' 금지어 예외 사유 |
| `index.ts` · `session1.ts` · `session2.ts` · `copyBaseline.json` | 완 | `workbook.help` 타입 · 1·2회차 안내 한 줄 · 편지 칸 첨부 문장 삭제 · 기준선 재생성(1·2회차만 델타) |
| `CheckinReadView.tsx` | 완 | 사진을 편지 자리 → **맨 위 제목 아래** · 미리보기 · 누르면 원본 · `WorkbookPhotoStrip` 공개(`overlay` 자리) |
| `WorkbookPhotos.tsx` (← `LetterPhotos.tsx`) | 완 | 여러 장 · capture 없음 · 원본 뒤 미리보기 · 「인도자 열람」 즉시 저장 · 미리보기 모드 서버 호출 0 |
| `[session]/CheckinCardClient.tsx` · `page.tsx` · `actions.ts` | 완 | 표지 아래 블록 · 선택 읽기(작성 화면만) · 목록/삭제(본인 경로만)/선택 액션 |
| `_lib/resizeImage.ts` | 완 | 미리보기 크기 상수 · 인자화 — **갈무리 사본 제거**(피드와 한 함수) |
| `coach/.../checkin/CoachPhotos.tsx` · `RosterDetail.tsx` · `page.tsx` | 완 | 명단 펼침 맨 위 · 운영자 삭제 표시를 모아 보기에서 **옮겨 옴** · 모아 보기 사진 제거 |
| `coach/.../checkin/rosterExpand.ts` (신규) | 완 · **배포 후 결함 수정** | 사진만 올린 참여자도 펼친다(§4) |
| `checkin/preview/CheckinPreviewClient.tsx` | 완 | 새 prop |
| `scripts/postdeployWorkbook.mjs` (신규) · `scripts/verify.mjs` | 완 | 실화면 검증 도구 · 스킵 사유 등록 |
| `architecture.md` | 완 | ADR-197 · ADR-83 개정 표시 · §5.4 표 목록 · §6.2 가시성 매트릭스(△ + 뜻) |

**문서 델타**: `architecture.md` 위 넷. `design_system.md` **0** — 새 부품이 없다(`Field`·`CheckRow`·기존 사진 칸 모양 재사용 · 불변식 20). `plan.md` **0** — 남는 후속(해제 사진의 주기 sweep · 형식 동의 기록)은 ADR-83·197 본문에 이미 있다.

## 2. 설계에서 정한 것 (결정 밖이라 근거를 적는다)

1. **선택의 단위는 (사람, 회차) — 회기 칸이 없다.** ADR-87 이후 사진은 경로의 회기가 아니라 (user, session) 으로 갈무리에 붙고 본인 카드도 그 묶음 전체를 보인다. (회기, 사람, 회차) 로 두면 같은 사진 묶음에 선택이 둘 생기고, **같은 인도자가 맡은 두 회기에 같은 사람이 있으면 한쪽의 열람이 다른 쪽의 해제를 연다.**
2. **판정은 SQL 함수 하나.** 저장소 열람 정책(서명 URL 발급)과 목록 RPC 가 같은 함수를 부른다. 목록만 막으면 경로를 아는 사람이 직접 서명할 수 있다. 권한 없는 사람에게는 늘 거짓 — 남의 선택을 캐묻는 창구가 아니다.
3. **올리기·체크는 작성 화면에서만.** 읽기 화면은 서버 쓰기 0 규율(ADR-86)이 있다.
4. **운영자 삭제 표시는 명단 펼침으로.** 모아 보기에서 사진을 빼면 운영자가 사진을 지울 곳이 사라졌다. 사진이 보이는 자리에 같은 줄(`WorkbookPhotoStrip`)을 쓰고 표시만 얹었다 — 읽는 화면은 삭제를 모른다.
5. **'워크북' 금지어 — 제목 한 자리만 예외.** 초판 근거가 「책은 배포 · 워크북은 미배포」였는데 전제가 바뀌었다(2기 모집 문안 「워크북 증정」 · 4회차 문안이 참여자가 워크북에 써 둔 것을 전제). 회차 문안의 금지는 그대로이고, 잠금이 주석을 걷은 코드에서 「그 한 줄뿐」을 잰다.
6. **미리보기는 브라우저가 만든다.** 저장소 이미지 변환이 이 테넌트에 없다(서가 실측). 원본 옆 같은 폴더 `{uuid}.thumb.jpg` — 정책이 경로 [1]·[2]·[3] 을 읽으므로 폴더를 더 파지 않았다.

## 3. 검증

### 3.1 완주 검증 — `node scripts/verify.mjs` 출력 전문 (2026-09-18)

eslint 경고 셋은 **변경 전 트리에도 같은 셋**이다(`dashboard.tsx:77` · `not-found.tsx:23` · `contracts/instrument.ts:14` — `git stash` 후 실측).

```

── tsc ──
오류 0

── eslint ──
77:3  warning  Unused eslint-disable directive (no problems were reported from 'react-hooks/purity')
  23:8  warning  Unused eslint-disable directive (no problems were reported from '@next/next/no-html-link-for-pages')
✖ 3 problems (0 errors, 3 warnings)
  0 errors and 2 warnings potentially fixable with the `--fix` option.

── vitest ──
Test Files  155 passed | 7 skipped (162)
      Tests  1774 passed | 87 skipped (1861)
   Duration  7.35s (transform 14.44s, setup 0ms, import 39.15s, tests 8.48s, environment 29ms)

  스킵 사유 — 전부 **의도된 옵트인**이다:
    tests/membership.integration.test.ts         실DB 옵트인 — RUN_RLS_INTEGRATION=1 일 때만 돈다
    tests/feed.integration.test.ts               실DB 옵트인 — 같은 스위치
    tests/rls.integration.test.ts                실DB 옵트인 — 같은 스위치
    tests/defaultPrivileges.integration.test.ts  실DB 옵트인 — 같은 스위치(pg_default_acl 실측)
    tests/memberDirectoryMask.integration.test.ts 실DB 옵트인 — 같은 스위치(마스킹 규칙을 함수에 먹인다)
    tests/workbookPhotos.integration.test.ts     실DB 옵트인 — 같은 스위치 + QA 계정 env(「인도자 열람」 역할별 판정 · 적용 전이면 본문을 트랜잭션 안에서 적용)
    tests/feedReactionsMulti.migration.test.ts   적용 전 전용 하네스 — 원장을 보고 스스로 건너뛴다(이미 적용됨)
    tests/site.snapshot.test.tsx                 캡처 산출 옵트인 — 출력 디렉터리가 있을 때만 돈다

── next build ──
성공
Route (app)                                       Revalidate  Expire
┌ ○ /                                                     5m      1y
├ ○ /_not-found
├ ○ /about
├ ƒ /account
├ ƒ /admin
├ ƒ /admin/approvals
├ ○ /api/version
├ ƒ /c/[code]/[session]
├ ƒ /c/[code]/values
├ ƒ /coach
├ ƒ /coach/cohort/[cohortId]
├ ƒ /coach/cohort/[cohortId]/checkin
├ ƒ /coach/cohort/[cohortId]/checkin/preview
├ ƒ /coach/cohort/[cohortId]/group
├ ƒ /coach/cohort/[cohortId]/matrix
├ ƒ /coach/cohort/[cohortId]/member/[userId]
├ ƒ /coach/cohort/[cohortId]/report/[responseId]
├ ƒ /coach/cohort/[cohortId]/values
├ ƒ /coach/cohorts
├ ƒ /coach/new
├ ƒ /contact
├ ƒ /feed
├ ƒ /home
├ ƒ /home/assessments
├ ƒ /join
├ ƒ /library
├ ƒ /library/[id]
├ ƒ /library/[id]/file
├ ƒ /library/[id]/thumb
├ ƒ /login
├ ƒ /my/cohorts
├ ƒ /my/cohorts/[cohortId]
├ ƒ /my/cohorts/[cohortId]/checkin/[session]
├ ƒ /my/cohorts/[cohortId]/journey
├ ƒ /my/cohorts/[cohortId]/report
├ ƒ /my/cohorts/[cohortId]/values
├ ƒ /my/values
├ ƒ /news
├ ƒ /news/[id]
├ ƒ /pending
├ ƒ /preview
├ ƒ /preview/console
├ ƒ /preview/entry
├ ƒ /preview/report
├ ƒ /preview/site
├ ○ /recruit                                              5m      1y
├ ƒ /reset
├ ƒ /reset/confirm
└ ƒ /signup
O 네 지표 전항 통과 — 위 출력 전문을 그대로 보고에 붙인다
```

### 3.2 총수 대조 — 직전 보고(`CC_REPORT_session6_v3.md`) 대비

| | 직전 | 지금 | 차 | 어디로 |
|---|---|---|---|---|
| Test Files | 150 passed · 6 skipped (156) | 155 passed · 7 skipped (162) | +6 | 통과 +5: `core/checkinPhotos` · `checkin/workbook` · `RosterDetail` · `[session]/actions` · `rosterExpand` / 스킵 +1: `tests/workbookPhotos.integration`(실DB 옵트인) |
| Tests | 1736 passed · 78 skipped (1814) | 1774 passed · 87 skipped (1861) | +47 | 스킵 +9 = 통합 9 / 통과 +38 = 새 파일 6+7+6+5+5 · `CheckinPreviewClient` +6 · `resizeImage` +2 · `CheckinReadView` +1 (`copyRegression` 은 수 불변 · 내용만 옮김) |

### 3.3 보안 — 역할별 실측 (실DB · `BEGIN … ROLLBACK`)

`RUN_RLS_INTEGRATION=1 … npx vitest run tests/workbookPhotos.integration.test.ts` — **적용 전**(본문을 트랜잭션 안에서 적용해 잼)과 **적용 후** 둘 다 9/9. 픽스처는 QA 회기 · QA 계정 셋 · 어떤 행에도 없는 제3자 uuid · anon.

| 역할 | 기본(선택 없음) | 해제 후 | 다시 체크 |
|---|---|---|---|
| 본인(QA 참여자) | 본다 | **본다** | 본다 |
| 담당 인도자(QA 인도자) | 본다 | **못 본다**(정책·목록 둘 다) | 본다 |
| 운영자(QA 운영자) | 본다 | **못 본다**(정책·목록 둘 다 · 불변식 16) | 본다 |
| 제3자(authenticated) | 못 본다 | 못 본다 | — |
| anon | 판정 함수·쓰기 RPC 호출 **42501** | | |

그 밖에: 인도자가 쓰기 RPC 를 불러도 **자기 행**만 생기고 참여자 선택은 안 바뀐다 · 참여자의 표 직접 UPDATE **42501** · 표 읽기는 본인 행만 · 판정 함수는 제3자·해제 상태 인도자에게 거짓 · 목록은 올린 순서.

적용 후 출력:

```
 ✓ tests/workbookPhotos.integration.test.ts > 워크북 사진 — 「인도자 열람」 역할별 판정 > ⑦ 픽스처의 역할이 실재한다 — 운영자 · 담당 인도자 · 회기 멤버 · 회차 9ms
 ✓ tests/workbookPhotos.integration.test.ts > 워크북 사진 — 「인도자 열람」 역할별 판정 > 기본(선택 없음) — 본인·인도자·운영자는 보고, 남은 못 본다 160ms
 ✓ tests/workbookPhotos.integration.test.ts > 워크북 사진 — 「인도자 열람」 역할별 판정 > 본인이 해제하면 — **인도자도 운영자도** 못 본다(불변식 16) · 본인은 그대로 본다 158ms
 ✓ tests/workbookPhotos.integration.test.ts > 워크북 사진 — 「인도자 열람」 역할별 판정 > 판정 함수는 남의 선택을 캐묻는 창구가 아니다 — 권한 없는 사람에게는 늘 거짓 38ms
 ✓ tests/workbookPhotos.integration.test.ts > 워크북 사진 — 「인도자 열람」 역할별 판정 > 쓰기는 본인 것만 — 인도자가 RPC 를 불러도 **자기 행**이 생길 뿐 참여자 선택은 안 바뀐다 52ms
 ✓ tests/workbookPhotos.integration.test.ts > 워크북 사진 — 「인도자 열람」 역할별 판정 > 표 직접 쓰기는 막혀 있다(RPC 로만) · 읽기는 본인 행만 68ms
 ✓ tests/workbookPhotos.integration.test.ts > 워크북 사진 — 「인도자 열람」 역할별 판정 > anon 은 판정 함수도 선택 쓰기도 못 부른다 48ms
 ✓ tests/workbookPhotos.integration.test.ts > 워크북 사진 — 「인도자 열람」 역할별 판정 > 다시 체크하면 인도자·운영자에게 다시 보인다 67ms
 ✓ tests/workbookPhotos.integration.test.ts > 워크북 사진 — 「인도자 열람」 역할별 판정 > 목록은 **올린 순서**다 — 워크북은 쪽 순서가 뜻이다 27ms
 Test Files  1 passed (1)
      Tests  9 passed (9)
```

적용 후 실물: 원장 `20260918090001 workbook_photos` · 표 권한 `authenticated=SELECT` 하나(anon 0) · 함수 ACL 셋 다 `postgres · authenticated · service_role`(anon 0) · 열람 정책이 판정 함수를 부른다.

### 3.4 물려 본 잠금 (⑪ — 변이를 심고 심어진 것을 확인한 뒤 돌리고 되돌렸다)

| 심은 변이 | 운 잠금 |
|---|---|
| 마이그레이션 판정 함수의 선택 확인 무력화(`AND false`) | 통합 3건(해제 후 인도자·운영자 · 캐묻기 · 쓰기 본인만) |
| 3회차 문안에 '워크북' | `workbook.test` 「한 줄뿐」 |
| 읽기 화면에서 사진을 맨 아래로 | `CheckinReadView.test` 「맨 위에 한 번」 |
| 참여자 삭제 액션의 본인 경로 확인 제거 | `actions.test` 2건 |
| 명단 펼침의 사진 조건 제거 | `rosterExpand.test` 「사진만 올린 사람도」 |

**잠금 자체의 결함 둘을 물려 보다가 고쳤다**: ① 금지어 잠금이 줄 끝 주석을 셌다 → 블록·줄 끝 주석을 걷도록 · ② 그 주석 걷기가 **CRLF 파일(session4·5)에서 안 물렸다**(`.` 이 `\r` 을 못 넘는다) → `\r` 먼저 뗌.

### 3.5 마이그레이션 — 예행 · 적용

- **되돌리는 문을 먼저 세우고 예행했다**: 트랜잭션 안에서 본문 → 롤백 → `ROLLBACK`. 롤백 후 열람 정책 · 목록 RPC 정의 · RPC 권한이 **글자 그대로 원형**, 표·판정 함수 없음, 실DB 잔여 0.
- **넓히는 변경 → 스키마 먼저**(CLAUDE §5): 적용 → 배포 순. 행이 0 이면 새 정책 결과가 옛 정책과 같아 옛 코드에 무해.
- ⚠ **롤백 주의**: 해제 선택을 버려 닫힌 사진을 연다 — `select count(*) from public.checkin_photo_prefs where not coach_view` 가 0 이 아니면 적용하지 않는다(파일 머리에 적었다).

### 3.6 배포 · 실화면 (눈으로 확인)

`node scripts/postdeploy.mjs` — 배포 신원 `3d5d5a3` · 전항 통과. 그리고 `node scripts/postdeployWorkbook.mjs`(QA 회기 · 글자만 적힌 가짜 이미지 · 조건 대기 + 상한 · 중단돼도 뒤처리):

```
[워크북 사진 실화면] https://future.yebom.org · QA 회기 · 1회차
  O 「인도자 열람」 기본 체크                     aria-checked=true
  O 올리기 칸 하나
  O 여러 장 · capture 없음
  O 제목이 첫 입력칸보다 위                      제목 y=267 · 첫 칸 y=575
  O 저장소 원본 2 + 미리보기 2                  0 → 4
  O 미리보기가 그려진다
  O 인도자 — 체크 상태에서 보인다                  img 2
  O 인도자 — 삭제 표시 없음                     0
  O 모아 보기 — 사진 0                       구간 1 · img 0
  O 운영자 — 체크 상태에서 보인다                  img 2
  O 운영자 — 삭제 표시 있음                     2
  O 해제 — 인도자에게 안 보인다                   img 0
  O 해제 — 운영자에게도 안 보인다                  img 0
  O 다시 체크 — 인도자에게 돌아온다
  O 뒤처리 — 원본·미리보기 함께 지워졌다              4 → 0

O 워크북 사진 실화면 전항 통과
```

캡처 `docs/reports/captures/workbook_photos/` — ① 카드 맨 위(기본 체크) ② 두 장 올린 뒤 ③ 인도자 명단 펼침(맨 위 사진 · 모아 보기 「아직 없어요」) ④ 해제 후 인도자 화면(펼침 표시조차 없음 — 「가림」과 「안 올림」이 구별되지 않는다) ⑤ 해제 상태 카드. **다섯 장 모두 직접 열어 봤다.**

뒤처리 실측: QA 참여자 사진 행 **0**(시작 전과 같음) · `checkin_photo_prefs` 1행(QA 참여자 · `coach_view=true` = 기본과 같은 상태 · 해제 행 0).

## 4. 배포 후 실화면이 잡은 것

1. **제품 결함 — 명단 펼침이 글이 있어야 열렸다.** 행 펼침 조건이 `hasContent || submitted`(ADR-91 B4)라 **세미나 중에 사진만 먼저 올린 참여자**(이 기능의 중심 사례)의 사진을 인도자가 볼 길이 없었다. 정적 잠금은 전부 초록이었다 — 조건이 서버 페이지의 행 판정이라는 **다른 층**에 있었다(⑨-c). `rosterExpand.ts` 순수 함수로 「보이는 사진도 내용이다」를 더했다. 부채널 없음(해제 사진은 목록이 비어 온다). 인도자 개인 기록·나의 기록은 행만 있으면 사진을 그려 영향이 없었다. 수정 커밋 `1b9755e`.
2. **검증 도구의 자 셋**(제품 아님): ① 하이드레이션 전에 누른 삭제 단추 · ② 하이드레이션 전에 채운 로그인 입력(단추 비활성) — 둘 다 **글자가 보이는 것은 손이 붙었다는 뜻이 아니다** → `networkidle` 까지 기다림(상한) · ③ `getByRole(name)` 이 실재하는 운영자 삭제 단추를 0 으로 셌다(HTML 덤프로 확인) — **인도자 쪽 「없음」 통과가 자를 안 물린 0 이었다** → 정확한 CSS 선택자로 바꾸고 운영자 쪽 ≥ 2 로 자가 무는 것을 증명.

## 5. 계약 이탈

`/contracts` 변경 셋(`CheckinPhoto.thumbUrl?` · `getMyCheckinPhotoCoachView` · `setMyCheckinPhotoCoachView`) — **이 지시로 승인**(2026-09-18). 견고화 방향: 열람을 좁히는 선택이 생겼고 기존 두 메서드의 형상은 그대로다.

## 6. 막힌 지점 · 판단 필요

1. **해제한 사진은 완전삭제 때 회수되지 않는다.** 회기 완전삭제·참여자 영구삭제의 사진 회수(ADR-87)는 앱이 인도자·운영자 권한으로 목록을 읽어 지우는데, 해제 사진은 그 목록에 안 나온다. 운영자에게 열면 불변식 16 을 뚫는다. **인도자·운영자 누구도 열 수 없는 채로 남는다** — ADR-83 의 주기 sweep 백스톱(후속)이 그 자리다. 실기수 회기를 완전삭제하지 않는 한 발생하지 않는다.
2. **실기기 확인 요청** — `capture` 를 뺐으므로 폰마다 선택 창이 다르다. iPhone 은 「사진 찍기 / 사진 보관함」이 함께 뜨는 것이 표준이나, **Android 는 기종·Chrome 판에 따라 카메라 항목이 없을 수 있다**(이 환경에서 잴 수 없다). 9/20 전에 **Android 한 대 · iPhone 한 대**로 「＋ 사진」을 눌러 카메라가 뜨는지만 봐 주시기를 청한다. 없으면 카메라 앱으로 찍은 뒤 앨범에서 고르면 되고, 필요하면 「촬영」 칸을 따로 두는 안을 내겠다(새 문안이 생기므로 결재 사항).
3. **기존 통합 테스트 하나가 실DB 데이터에 기대고 있다(이번 변경과 무관)** — `tests/rls.integration.test.ts:252` 「비멤버는 RPC 로도 남의 차수에 행을 심지 못한다」가 **실DB `value_assessments` 가 0 행**이라고 전제한다. 2기 시작으로 실제 행이 생겨(개수만 확인) 실패한다. 게이트 자체(P0001)는 통과하고 뒤의 「0 행」 단언만 깨진다. 픽스처로 좁히는 수정은 이번 범위 밖이라 두었다.
4. **'워크북' 금지어를 제목 한 자리만 열었다** — 결정의 제목을 따른 것이며 회차 문안의 금지는 그대로다. 문안 규범(`futurenow_copy_principles.md`)에 이 예외를 적을지는 최박사 판단.

## 7. 커밋 · push

| 커밋 | 내용 |
|---|---|
| `a04abd1` | feat — 워크북 사진 본체 |
| `d9684ad` | merge → `main` (배포) |
| `1b9755e` | fix — 명단 펼침(배포 후 실화면) · 실화면 검증 도구 |
| `3d5d5a3` | merge → `main` (배포) |
| (이 보고) | docs — 보고 · 캡처 · 검증 도구 보완 |

push 증거(이 보고를 쓰기 직전 원격 조회 — 이 보고 커밋은 그 뒤에 붙는다):

```
1b9755e866428459c23cb683886b8e1754b908c3	refs/heads/feat/workbook-photos
3d5d5a3ddd5570eef40289d1edb61b3376bf62eb	refs/heads/main
```
