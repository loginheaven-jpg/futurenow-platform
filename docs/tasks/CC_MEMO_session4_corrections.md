# CC MEMO - 4회차 지시서 정정 7건 (착수 승인)

> 발신: 지휘부(최박사 + Claude) · 수신: 클로드코드(클코1)
> 작성: 2026-08-16
> 확인 커밋: `f0d7fae` — 발행 직전 fresh clone 대조
> 지위: `CC_ORDER_checkin_session4_final.md` 의 **부분 정정**. 충돌 시 이 메모가 이긴다. 나머지는 원 지시서 그대로다.

---

## 0. 판정 — 일곱 건 전부 수용

소스로 전량 검증했다. **내 최종본에 결함이 넷 있었고 그중 둘은 자기 논리를 내가 어긴 것이다.**

| # | 내용 | 성격 |
|---|---|---|
| ① | `docs/adr/` 는 `.gitignore` 가 막는다 | 지휘부 오류 |
| ② | 보고서 명명이 관례와 다르다 | 지휘부 오류 |
| ③ | 4회차 등록이 기존 단언 둘을 깬다 | 지휘부 누락 |
| ④ | `priorSessionNos` 가 자기 수용기준과 모순 | 지휘부 오류 |
| ⑤ | `back?: 1 \| 2` 상한이 §4-0 근거와 어긋난다 | **지휘부 오류 · 가장 큼** |
| ⑥ | `project_due` placeholder 가 과거 날짜 | 지휘부 누락 |
| ⑦ | §9 심화 기본 접힘이 ADR-102 와 충돌 | 지휘부 오류 |

---

## 1. ① ADR 은 `architecture.md` 행으로 쓴다

`.gitignore:51` 이 `/docs/*` 로 기본 차단하고 `!/docs/tasks/` · `!/docs/reports/` 둘만 연다. `docs/adr/ADR-103-mirror-back.md` 를 만들면 **커밋되지 않고 조용히 사라진다.**

그리고 관례 자체가 다르다. ADR 은 `architecture.md` 표 행 102개로 관리돼 왔고, `CLAUDE.md` §11 이 그 표를 기준으로 번호 잇기를 명령한다. 별도 파일로 가면 **ADR 이 두 곳에 살고 단일 진실이 깨진다.**

**ADR-103·104 를 `architecture.md` 행으로 쓴다.** 원 지시서 §5 파일 목록에서 `docs/adr/*` 두 줄을 삭제한다.

§4-0 의 근거 문단은 **그 행 본문에 그대로 싣는다.** 지시서가 요구한 것은 문단이 남는 것이지 파일이 생기는 것이 아니다.

> `back` 을 지금 도입하는 이유는 4회차 심화의 값이 아니라 **5·6·7회차에서 두 회차 전을 되비출 일이 반복되기 때문**이다. 4회차 심화 되비추기는 2회차를 채운 참여자에게만 보이며 1기 실측 기준 그 수는 적다. 이 기능의 값은 남은 세 회차에서 회수된다.

## 2. ② 보고서 파일명

`docs/reports/README.md:11` 이 완료 보고서 형식을 `YYYY-MM-DD-<슬러그>-완료.md` 로 규정한다. **`docs/reports/2026-08-16-session4-완료.md`** 로 쓴다.

## 3. ③ 기존 단언 둘 — 지우지 말고 이어 쓴다

레지스트리에 한 줄 넣는 순간 아래가 즉시 레드다. 원 지시서 §6-4 에 없었다.

```
session2.test.ts:92   expect(getCheckinSession(4)).toBe(null)
session3.test.ts:48   expect(getCheckinSession(4)).toBeNull()
```

**조용히 지우지 않는다.** 그 단언은 "미등록 회차가 링크로 새어 나가지 않는다"는 가드이지 4회차 부재를 기록한 것이 아니다. **`getCheckinSession(5)` 로 이어 쓴다.** ADR-94 에서 책 참조 금지 단언을 뒤집을 때와 같은 처리이며, 사유를 ADR-104 행에 남긴다.

`session4.test.ts` 에도 같은 가드를 둔다 — `getCheckinSession(5) === null`.

## 4. ④ `priorSessionNos` 시그니처

지시서 본문은 "문안이 요구할 때만 부르게 한다"고 옳게 적었는데 함수 시그니처가 그것을 반영하지 못했다. 그래서 §4-7 테스트 목록(`3회차 → [2,1]`)과 §12 수용기준(`3회차 왕복 1회`)이 서로 모순됐다.

⑤와 함께 처리한다 — 아래 §5 의 최종 형태를 쓴다.

## 5. ⑤ `back` 을 `number` 로 연다 (핵심)

**내가 §4-0 에 이렇게 써 놓고,**

> 회차별 특례로 처리하면 그때 하드코딩하게 되고, ADR-90 이 슬롯을 모양으로 일반화한 판단과 어긋난다.

**바로 아래 §4-2 에서 `back?: 1 | 2` 로 상한을 박았다.** 같은 문서 안에서 자기 논리를 어겼다.

종단 축이 갈망(1) → 한 문장(2) → 영역(3) → 원씽(4) → 환경(5) → 남은 시간(6) → 정체성 선언(7)이다. **7회차가 2회차 한 문장을 되비추려면 `back: 5`** 이고, 그건 우리가 설계한 축의 끝점이므로 반드시 온다. `1 | 2` 로 두면 그때 타입·`Priors`·페이지를 또 고친다.

일반화 비용이 거의 같다.

```ts
// index.ts
export type Mirror = {
  label: string;
  keys: string[];
  empty?: string;
  /**
   * 몇 회차 전을 읽는가. 기본 1(직전) — 기존 선언은 전부 그대로다.
   * 상한을 두지 않는다: 7회차가 2회차를 되비추면 5 다. 상한을 박으면 그때 타입을 다시 고치게 되고,
   * 그것이 ADR-90 이 없앤 특례다.
   * 병합하지 않고 봉투를 나누는 이유: step_what·mood·self_note 는 회차 공용 키라
   * 한 봉투에 합치면 지난 걸음 되비추기가 다른 회차 값을 읽을 수 있다.
   */
  back?: number;
};

// slots.ts
export type Priors = Record<number, Record<string, unknown> | null>;

export function resolveMirror(mirror: Mirror | undefined, priors: Priors): MirrorView {
  if (!mirror) return null;
  const prior = priors[mirror.back ?? 1] ?? null;
  // 이하 기존 본문 그대로 — 앵커 규칙·trim·원문 출력을 한 글자도 바꾸지 않는다
}

// 이 회차 문안이 요구하는 되비추기 깊이 전부. 회차 번호가 아니라 문안이 정한다.
export function neededBacks(copy: CheckinSession): number[];
```

`neededBacks` 는 문안의 모든 `mirror` 를 훑어 `back ?? 1` 의 **중복 없는 오름차순 배열**을 낸다. 1·2·3회차는 `[1]`, 4회차는 `[1, 2]` 다.

```ts
// page.tsx — 필요한 깊이만, 존재하는 회차만 부른다.
export function priorSessionNos(sessionNo: number, mode: 'edit' | 'read', backs: number[]): number[] {
  if (mode !== 'edit') return [];
  return backs.map((b) => sessionNo - b).filter((n) => n >= 1);
}

const backs = copy ? neededBacks(copy) : [];
const nos = priorSessionNos(sessionNo, initialMode, backs);
const rows = await Promise.all(nos.map((n) => ctx.getMyCheckin(cohortId, n).catch(() => null)));

const priors: Priors = {};
nos.forEach((n, i) => { priors[sessionNo - n] = rows[i] ? (rows[i]!.answers ?? {}) : null; });
```

**검증 항목을 이렇게 고친다.**

```
□ neededBacks(SESSION_1·2·3) === [1] · neededBacks(SESSION_4) === [1,2]
□ priorSessionNos(1,'edit',[1]) === []          ← 0회차는 없다
□ priorSessionNos(2,'edit',[1]) === [1]
□ priorSessionNos(3,'edit',[1]) === [2]         ← 왕복 1. 이전과 같다
□ priorSessionNos(4,'edit',[1,2]) === [3,2]
□ priorSessionNos(4,'read',[1,2]) === []
□ 가상의 back:5 선언에서 priorSessionNos(7,'edit',[1,5]) === [6,2]   ← 상한 없음 증명
```

마지막 항목이 이 변경의 값을 잠근다. 7회차가 실제로 올 때 코드를 안 고치는 것이 목표다.

**하위호환.** `back` 미지정이 전부 `priors[1]` 을 읽으므로 1·2·3회차 출력이 변하지 않는다. §4-7(1) 스냅샷 잠금이 그것을 증명한다 — `priors` 에 다른 깊이를 채워 넣어도 결과가 변하지 않아야 한다는 항목을 **`{2: …, 5: …}` 형태로 확장**한다.

## 6. ⑥ `project_due` placeholder

4회차 개시가 8/16 인데 예시가 `6월 30일` 이다. 과거 날짜는 이 칸의 `help`(`이름만 있으면 결심이고, 끝나는 날이 붙으면 프로젝트가 됩니다.`)를 배반한다.

**`10월 31일` 로 바꾼다.** 1기 종료(9/13) 이후라 "세미나가 끝나도 이어지는 프로젝트"라는 결도 맞는다.

## 7. ⑦ §9 미리보기 확인 항목

`CheckinCardClient.tsx:475` 가 이미 `defaultOpen` 이다(ADR-102 Phase 1 · `onToggle` 제거 포함). 원 지시서 §9 가 옛 상태를 적었다.

```
✕ 심화가 기본 접힘이고 summary 줄이 보인다
○ 심화가 기본 펼침이고 summary 줄이 보인다
```

인도자 상자 기본 접힘은 맞다 — `facilitatorBox.defaultOpen` 은 7회차만 `true` 다.

---

## 8. 수용 기준 추가·정정

원 지시서 §12 에 아래를 반영한다.

```
정정
□ 「§4-7(2) priorSessionNos · needsBack2」 → 「neededBacks · priorSessionNos」
□ 「1·2·3회차 왕복 수 불변 — 3회차 1회」 유지 (⑤ 반영으로 실제로 성립)

추가
□ ADR-103·104 가 architecture.md 행으로 들어갔다. docs/adr/ 파일이 생기지 않았다
□ 보고서가 docs/reports/2026-08-16-session4-완료.md 다
□ session2.test.ts·session3.test.ts 의 미등록 가드가 getCheckinSession(5) 로 이어졌다
□ session4.test.ts 에도 같은 가드가 있다
□ back?: number · Priors 가 Record<number, …> 다. 1|2 상한이 없다
□ 가상 back:5 케이스가 테스트에 있다
□ §4-7(1) 스냅샷이 다른 깊이({2:…, 5:…})를 채워도 1~3회차 출력 불변
□ project_due placeholder 가 10월 31일이다
□ §9 심화 확인 항목이 '기본 펼침'이다
```

---

## 9. 착수

**완주한다.** 위 정정을 반영하고 §4-7 세 잠금이 통과하면 그대로 마친 뒤 보고한다. 잠금 중 하나라도 실패하면 그 지점에서 멈추고 보고한다.

이번 검토에서 지휘부 오류가 넷 나왔다. **그중 ⑤는 지시서가 자기 근거를 스스로 어긴 것**이고, 그런 종류는 실행자만 잡을 수 있다. 다음 지시서에서도 같은 강도로 봐 주기 바란다.
