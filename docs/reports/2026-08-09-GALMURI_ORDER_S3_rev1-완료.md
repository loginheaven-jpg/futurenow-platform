# 완료 보고서 — 갈무리 발주서 개정 3회차 개정 1차 (ADR-98)

> 수신: 지휘부 · 발신: 클로드코드(클코1)
> 작성: 2026-08-09 · 대상 지시서: [`docs/tasks/GALMURI_ORDER_S3_rev1.md`](../tasks/GALMURI_ORDER_S3_rev1.md)
> 선행 검토서: [`2026-08-09-GALMURI_ORDER_S3_rev1-검토.md`](2026-08-09-GALMURI_ORDER_S3_rev1-검토.md)
> 지휘부 결정: `areaPick.lines` 배열 승격(권고안) · 배포 시점 **ⓐ 감수하고 당일 배포**

---

## 1. 구현·변경 파일

| 파일 | 상태 | 내용 |
|---|---|---|
| `checkin/index.ts` | 완 | `areaPick.line` → **`lines: readonly CheckinField[]`** |
| `checkin/session3.ts` | 완 | 개정 1~5 전부 + `REQUIRED_3` 순서·라벨 + `summaryFields` 넷째 |
| `checkin/session2.ts` | 완 | `lines` 배열로 (문안 변경 **0**) |
| `checkin/readModel.ts` | 완 | 줄 순회 |
| `CheckinCardClient.tsx` | 완 | 줄 순회 렌더 + 줄별 `help` 지원 |
| `checkin/copyBaseline.json` | 완 | `session3` 재생성 85 → **88** |
| `checkin/copyRegression.test.ts` | 완 | ADR-98 명시 단언 4건 신설 |
| `checkin/session3.test.ts` | 완 | 순서·결측·나눔열·열람 단언 갱신·신설 |
| `checkin/session2.test.ts`·`readModel.test.ts` | 완 | `lines` 대응 |
| `architecture.md` | 완 | ADR-98 |

**보류 0.** 지시서 §1 개정 1~5 전부 반영.

---

## 2. 검증

| 항목 | 결과 |
|---|---|
| `tsc --noEmit` | **0** |
| `eslint src` | **0 errors** (기존 경고 1건, 미접촉 `contracts/instrument.ts`) |
| `vitest` | **496 passed** / 5 skipped (489 → 496) |
| `next build` | 성공 |

### 음성 대조 — 새 잠금에 이빨이 있는가

`connector` 와 `REQUIRED_3` 순서를 개정 전으로 되돌린 뒤 실행:

```
× session3: 스냅샷의 모든 문자열이 그대로 남아 있다
× session3: 스냅샷에 없는 문자열이 새로 생기지 않았다
× 습관 짝 — 기입 순서 반전에 맞춘 라벨·연결선
× 습관 짝에 connector 가 있다
→ 4 failed | 150 passed        (원복 후 154 passed)
```

**보안 관련 변경 없음** — 역할별 RLS 실측 해당 없음(문안·렌더 변경, DB 접근 경로 불변).

---

## 3. `architecture.md` 정합

**ADR-98 신설.** 번호 중복·결번 없음(최대 98). 개정 근거·미수용 사유·배포 시점 판단·이월 항목(6축 신앙 · `조급함` · 한 걸음 동질화 · 워크북 개정 시 `identity_gap` 페이지)을 전부 기록.

---

## 4. 계약 대비 이탈

**없음.** `/src/contracts` 미접촉. `CheckinSession` 은 `/src/instruments` 안이라 §1 승인 게이트 밖이며, 지휘부가 `lines` 승격을 승인했다.

**계약 0 · 코어 0 · DB 0 · 마이그레이션 0.**

---

## 5. 착수 후 확정한 것 (검토서 대비)

### ① 개정 2의 실제 수정 지점은 **일곱**이었다

지시서는 `REQUIRED_3` 의 **순서**만 말했으나 **라벨 문자열**도 바뀝니다. 한쪽만 고치면 결측 안내가 화면과 다른 문안을 읽어 줍니다.

```
- { key: 'habit_stop',  label: '줄이거나 없애기로 한 것' }
- { key: 'habit_start', label: '그 자리에 들이기로 한 것' }
+ { key: 'habit_start', label: '이번 주에 새로 시작하거나 늘릴 것' }
+ { key: 'habit_stop',  label: '줄이거나 없앨 것' }
```

결측 라벨 순서가 화면과 같은지 단언을 새로 달았습니다.

### ② 열람은 카드 순서를 따르고, 나눔 열은 의미 방향을 지킨다

둘이 갈립니다. `readModel` 의 짝은 **시작 → 없앰**(카드를 되비추는 것이므로), `summaryFields` 는 **`{from: habit_stop, to: habit_start}`** 그대로(의미 방향). 지시서 판단대로이며 양쪽에 단언을 달았습니다.

### ③ `summaryFields` 우당탕탕은 **마지막** 자리

선택 항목이고 과제 시점이 "다음 주까지"라 빈 칸이 가장 많이 날 항목입니다. 가운데면 빈 칸이 목록 한복판에 생기고, 끝이면 있는 사람만 덧붙는 모양이 됩니다.

### ④ `lines` 승격이 1·2회차 문안을 건드리지 않음을 양방향으로 확인

`session2` 는 한 줄짜리 배열이 될 뿐이고 리터럴 잠금이 무변동입니다. 1·2회차에 새 문구가 새어 들지 않았다는 단언도 함께 달았습니다.

---

## 6. 판단 필요 사항 · 이월

1. **워크북 개정안 승인 시** `identity_gap` 108~111 → 121~123. 그때 **셋을 함께** 고쳐야 합니다 — 문안 · `session3.test.ts` 의 열거 단언 · `copyBaseline`.
2. **6축(신앙) 승인** 시 칩 다섯과 진단 축을 함께 조정.
3. **마음 낱말 `조급함`** 은 3회차 제출 데이터로 4회차에 판단(지시서 §4-②).
4. **한 걸음 동질화**(여섯 중 다섯이 같은 항목)는 카드로 막을 문제가 아니라 스크립트북 사안(지시서 §4-③).
5. `copy.wrap.confidence.min/max` 죽은 선언 — 4회차 작업 때(ADR-94 이월).
6. **1·2회차 마음 낱말 통일** — 2기 시작 전(저장값이 없을 때).

---

## 7. 커밋

`architecture.md` 갱신 후 단일 커밋으로 푸시. 해시는 채팅 보고에 포함.
