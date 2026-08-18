# CC ORDER - 4회차 갈무리 카드 (STEP 5·6) · 되비추기 깊이 확장

> 발신: 지휘부(최박사 + Claude) · 수신: 클로드코드(클코1)
> 작성: 2026-08-16 · **최종본 · 완주형** (4회차 대화창 발주서 + 지휘부 정정 6건)
> 기준 커밋: `f0d7fae` — 발행 직전 fresh clone 으로 대조함
> 신규 ADR: **ADR-103**(되비추기 깊이) · **ADR-104**(4회차 문안)
> 선행: ADR-85·90·91·98·100·101·102

---

## 0. 이 문서의 지위

4회차 대화창이 낸 발주서를 정본으로 삼되, 지휘부 검수에서 나온 **정정 여섯**을 반영했다. 원 발주서와 충돌하면 이 문서가 이긴다.

| # | 정정 | 위치 |
|---|---|---|
| 1 | ADR-103 근거를 "4회차 값"에서 "5~7회차 일반화"로 | §4-0 |
| 2 | `parked` 문안 — 한 문항 한 물음 | §3-4 |
| 3 | `아니어도 좋습니다` 판정 근거를 문자열 차이가 아니라 갈래 규칙으로 | §3-2 |
| 4 | `identity_statement` 키 확인 지시 삭제 (확인 완료) | §3-6 |
| 5 | 요약 열 — 원안 유지, 근거 보강 | §3-11 |
| 6 | 마음 낱말 겹침 없음을 주장이 아니라 검증 항목으로 | §6-1 |

**완주한다. 중간 확인을 요청하지 않는다.** 지휘부가 최종 결과물을 검수한다.

다만 ADR-103 이 살아 있는 1~3회차 렌더 경로를 함께 건드린다. 중간 게이트가 잡던 것을 **자동 검증으로 옮겼다**(§4-7). 사람이 보던 것을 테스트가 보게 하는 것이므로, 게이트를 없앤 것이 아니라 자리를 바꾼 것이다. 그 검증이 실패하면 **완주하지 말고 그 지점에서 보고한다.**

---

## 1. 무엇을 만드는가

4회차(STEP 5 삶의 옵션을 펼쳐라 · STEP 6 단 한 가지를 선택하라) 갈무리 카드다. 두 번째 이중 STEP 회차이며, 3회차가 만든 구조(`group` · `order` · `mirror`)를 그대로 쓴다.

| 갈래 | 내용 | 순서 |
|---|---|---|
| **B** | 되비추기 깊이 확장(ADR-103) | **먼저** |
| **A** | `session4.ts` 신설 + 레지스트리 + 테스트 | 나중 |

순서를 바꾸면 A 의 테스트가 컴파일되지 않는다.

### 하지 않는 것

- DB 마이그레이션 — 신규 키는 전부 `answers` JSONB 안이다
- 새 입력 형태 — 기존 목록 안에서 조립한다
- `readModel.ts` 수정 — 회차 분기가 없다
- **1·2·3회차 문안 수정 — 한 글자도 건드리지 않는다**
- 사진 첨부 — 4회차에 편지가 없다. `letter_line` 키를 쓰지 않으므로 `LetterPhotos` 가 자동으로 렌더되지 않는다(`CheckinCardClient.tsx:487` 이 키로 게이트한다). 이 동작에 의존하되 코드를 바꾸지 않는다
- 책 페이지 참조 — §11

---

## 2. 카드 구조

### 1면 슬롯 순서

```
order: ['areaPick', 'pairText', 'question', 'mood']
```

3회차는 `areaPick → question → pairText → mood` 였다. 4회차는 **`pairText` 가 `question` 앞**이다. 두 옮겨 적기(펼친 것 하나 · 고른 것 하나)가 붙어 있어야 묶음 경계가 화제 전환과 일치한다.

### 묶음 이정표

표지 부제 `옵션을 펼치고, 하나를 선택하다` 를 쪼개 쓴다.

| 슬롯 | `group` |
|---|---|
| `areaPick` | `옵션을 펼치고` |
| `pairText` | `하나를 선택하다` |
| `question` | `하나를 선택하다` |
| `mood` | (없음 — 회차 전체에 대한 물음) |

`slotBoundaries` 규칙이 그대로 적용된다 — 첫 블록 캡션만, 전이에서 hairline+캡션, 그룹 밖에서 hairline 만.

### 필수 6칸

| # | 묶음 | 키 |
|---|---|---|
| 1 | 영역 + 프로젝트 이름 + 마감일 | `project_area` · `project_name` · `project_due` |
| 2 | 첫 도미노 짝 | `domino_what` · `domino_effect` |
| 3 | 오늘의 마음 | `mood` (altKey `mood_custom`) |
| 4 | 지난 한 걸음 결산 | `last_step_result` |
| 5 | 다음 한 걸음 | `step_what` · `step_when` |
| 6 | 나에게 주는 한마디 | `self_note` |

**1번이 세 필드인 근거.** STEP 5 의 유일한 판별 기준이 '끝나는 날'이다. 마감일을 선택으로 내리면 이 회차의 원리가 카드에서 빠지고, 이름과 한 칸에 합치면 한 문항이 두 가지를 묻게 된다. 참여자는 워크북 활동 4 정의서에 이름과 마감일을 이미 써 두었으므로 옮겨 적기이고 값이 싸다. `RequiredGroup.fields` 가 배열이라 세 필드도 그대로 동작하며, 결측 안내는 비어 있는 것만 낸다.

**선택 칸** — `parked`(보이는 선택) · `onething`(심화) · `last_step_note` · `step_blocker` · `confidence` · 인도자 상자. 세지 않는다.

이중 STEP 이라 옮겨 적기가 둘이어서 필수가 하나 늘 자리인데, **그 증가분을 서술 질문에서 회수한다** — 3회차 `stuck_named` 와 같은 처리다.

### 신규 키 일곱

`project_area` · `project_name` · `project_due` · `domino_what` · `domino_effect` · `parked` · `onething`

`future_area`(2회차) · `gap_area`(3회차)를 **재사용하지 않는다.** 2회차는 가장 가슴 뛴 영역, 3회차는 가장 간절한 영역, 4회차는 실제로 손대는 영역이다. 세 값이 어긋날 때가 인도자에게 가장 값진 정보인데 같은 키를 쓰면 그 차이가 덮인다.

---

## 3. 문안 — 리터럴. 조사 하나 바꾸지 않는다

어조는 ADR-102 진취 전환을 따른다. 허락 어휘(`하셔도 됩니다` · `않으셔도 됩니다` · `괜찮습니다` · `아니어도 됩니다` · `충분합니다` · `충분해요`)를 쓰지 않는다. **임의 윤문 금지.**

### 3-1. 표지

```
brand:    'FUTURE NOW · 4회차'
title:    '오늘의 갈무리'
subtitle: '옵션을 펼치고, 하나를 선택하다'
counter:  (n) => `필수 6칸 중 ${n}칸 채움 · 약 5분`
band:     '오늘 펼친 것과, 그중에 고른 하나를 적어 둡니다.'
firstVisitOnce: 없음
```

### 3-2. ① areaPick — 영역 + 프로젝트 (필수)

```
group:   '옵션을 펼치고'
key:     'project_area'
label:   '오늘 다섯 영역에 프로젝트를 펼치셨지요. 그중 이번에 시작할 하나는 어느 영역인가요?'
help:    '가장 많이 적힌 칸이 아니어도 좋습니다. 지금 손이 가는 하나를 고르십시오.'
options: ['일', '재정', '관계', '건강', '기여']
lines:
  [0] key: 'project_name'
      label: '그 프로젝트의 이름'
      placeholder: '주 한 번씩 현업 선배 만나기'
  [1] key: 'project_due'
      label: '끝나는 날'
      help: '이름만 있으면 결심이고, 끝나는 날이 붙으면 프로젝트가 됩니다.'
      placeholder: '6월 30일'
mirror:
  label: '지난 시간에 가장 간절하다고 고르신 영역'
  keys:  ['gap_area', 'gap_want']
```

**`아니어도 좋습니다` 판정(정정 3).** BANNED 와 문자열이 다르다는 것은 근거가 아니다. **근거는 갈래다** — 이 문장은 `~여도 좋습니다` 가 **범위를 넓히는 예시**로 쓰인 경우이며, 원칙 §1 축1 의 '오답 방지' 갈래에 해당한다(가장 많이 적힌 칸을 골라야 한다는 오해를 막는다). 뒷문장이 명령형으로 값을 회수한다. ADR-104 에 이 갈래 규칙을 근거로 인용한다.

`project_due` 의 `help` 가 STEP 5 의 핵심 원리를 진다. 이 문장을 지우면 마감일 칸이 단순 서식이 된다.

### 3-3. ② pairText — 첫 도미노 짝 (필수)

```
group:     '하나를 선택하다'
label:     '오늘 고른 첫 도미노 하나를 옮겨 주세요.'
help:      '가장 급한 일도, 가장 쉬운 일도 아닙니다. 그것 하나가 되면 나머지가 쉬워지는 하나를 고르십시오.'
from:      { key: 'domino_what',   label: '이번 달에 쓰러뜨릴 하나는' }
connector: '↓ 그것이 넘어지면'
to:        { key: 'domino_effect', label: '함께 넘어갈 것은' }
mirror:
  label: '지난 시간에 이름 붙이신 우당탕탕 프로젝트'
  keys:  ['rough_project']
  (empty 없음)
```

3회차 습관 짝과 같은 **구조 강제** 장치다. 아래 칸이 검산기 노릇을 한다 — 함께 넘어갈 것을 못 적으면 그것은 첫 도미노가 아니라 그냥 해야 할 일 중 하나다. **인도자가 판정하지 않고 참여자가 스스로 안다.**

`rough_project` 는 3회차에서 선택이므로 비어 있을 수 있다. `empty` 를 두지 않아 그때는 상자가 그려지지 않는다.

### 3-4. ③ question — 오늘의 질문 (보이는 선택)

```
group: '하나를 선택하다'
key:   'parked'
label: '오늘 하나를 고르면서 뒤로 미뤄 둔 것 중, 가장 아까운 하나는 무엇이었나요?'
help:  '버린 것이 아니라 순서가 뒤로 간 것입니다. 언제쯤 다시 볼지 정해 두셨다면 함께 적으십시오.'
badge: '선택'
```

**정정 2.** 원안 `언제쯤 다시 볼지도 함께 적으십시오` 는 한 칸에 두 물음을 넣는다(원칙 §2-3). 보조로 내렸어도 명령형이라 초대가 아니다. `정해 두셨다면` 을 넣어 조건절로 바꾼다 — 정한 사람만 적고, 안 정한 사람은 넘어간다.

접힘으로 감싸지 않는다. 이 회차의 핵심 경험을 받는 자리다.

4회차의 아픔은 직면이 아니라 **상실**이다. 스무 개를 펼쳐 놓고 하나만 남기는 날이라, 카드가 이틀 뒤 열릴 때 그 아쉬움이 그대로 남아 있다. 세션에서는 이것을 '대기열'이라 부르지만 **카드에서는 그 낱말을 쓰지 않는다**(§7).

### 3-5. ④ mood (필수)

```
key:       'mood'
label:     '이 시간을 마치고 나온 지금, 마음은 어떤가요?'
help:      '두 개까지 고르실 수 있습니다.'
options:   ['선명함', '아쉬움', '두근거림', '망설임', '든든함', '딱 맞는 말이 없음']
exclusive: '딱 맞는 말이 없음'
max:       2
group:     없음
moodCustom:
  key: 'mood_custom'
  placeholder: '직접 쓰기 (선택)'
  promptPlaceholder: '그럼, 지금 마음에 가까운 말을 한마디로 적어 주세요'
```

이 회차는 **펼칠 때 벅찼다가 고를 때 아픈** 결이라 앞선 세 회차와 정서가 다르다. 부정 쪽은 아쉬움·망설임 **둘**이다(3회차 상한 셋). `망설임` 을 넣은 이유는 첫 도미노를 아직 못 고른 사람이 반드시 나오기 때문이다. 그 상태에 이름이 없으면 카드 앞에서 자기를 탓한다.

앞 다섯 낱말이 1·2·3회차와 겹치지 않는다(지휘부 실측 확인). **주장으로 두지 말고 §6-1 검증 항목으로 고정한다**(정정 6).

### 3-6. 심화 — 인생의 원씽 (선택 · 한 칸)

```
title:   '여기서부터가 진짜입니다'
summary: '인생의 원씽 — 세 원이 겹치는 자리'
fields:
  [0] key:   'onething'
      label: "오늘 세워 본 '인생의 원씽' 문장을 그대로 옮겨 주세요."
      help:  '오늘 세우신 것은 가설입니다. 다음 회차에 고쳐 쓰는 것이 정상입니다.'
      mirror:
        label: "2회차에 쓰신 '인생을 이끌어갈 하나의 문장'"
        keys:  ['identity_statement']
        back:  2
```

3회차 선례대로 심화는 **한 칸**이다. 인생의 원씽은 가설이므로 필수로 두지 않는다. 필수로 두면 못 찾은 사람이 카드를 닫지 못한다.

**정정 4.** 원안의 "실제 키를 `session2.ts` 에서 확인하라"는 지시를 **삭제한다.** 지휘부가 확인했다 — `session2.ts:65` 가 `identity_statement` 이며 표기가 맞다. 지시서에 불확실을 남기면 실행자가 판단하게 되고, 이 건은 판단할 것이 없다.

### 3-7. ⑤ 지난 한 걸음 결산 (필수)

**3회차와 완전 동일하다.** 문안·선택지·되비추기·`empty` 어느 것도 바꾸지 않는다.

```
key:     'last_step_result'
label:   '지난 한 걸음은 어떻게 되었나요?'
options: ['했습니다', '조금 했습니다', '잊고 지냈습니다', '하려다 막혔습니다']
note:    { key: 'last_step_note', label: '한 줄만 덧붙여 주세요',
           help: '여기 정직하게 적는 것이 다음 한 주를 바꿉니다.' }
mirror:  { label: '지난 시간의 한 걸음', keys: ['step_what', 'step_when'],
           empty: '이번 회차부터 한 걸음이 쌓입니다.' }
```

### 3-8. ⑥ 다음 한 걸음 (필수)

```
title:   '다음 시간까지 할 작은 실천 하나를 정해 봅시다.'
help:    '오늘 정하신 첫 도미노를 향해, 이번 주에 몸을 움직여 할 수 있는 가장 작은 것 하나면 됩니다. 10분 안에 끝나는 것일수록 좋습니다.'
what:    { key: 'step_what', label: '무엇을 하시겠어요?',
           help: "계획이 아니라 동작으로 적으십시오. '책 읽기'가 아니라 '오늘 밤 그 책을 가방에 넣기'입니다." }
when:    { key: 'step_when', label: '언제, 어디서 하시겠어요?',
           placeholder: '토요일 아침, 집 앞 카페에서',
           help: "이미 하고 있는 행동 뒤에 붙이면 훨씬 잘 켜집니다. '양치한 다음'처럼요." }
blocker: { key: 'step_blocker', label: '못 하게 될 것 같은 때가 있다면 언제일까요?',
           placeholder: '야근이 늦게 끝나는 날',
           help: '여기 적어 두신 것이 다음 시간의 재료가 됩니다.' }
share:   { notice: '이번 한 걸음은 다음 시간을 열 때 이름과 함께 나눕니다.',
           toggleLabel: '이번 한 걸음은 나만 볼게요' }
```

두 곳이 3회차와 다르다.

`what.help` 를 새로 붙였다. 워크북이 이 회차에서 '계획이 아니라 동작'을 강제하는데, 카드에도 같은 지시가 있어야 이틀 뒤에 큰 것을 적지 않는다.

`blocker.help` 를 3회차의 위로에서 **5회차 인계**로 바꿨다. STEP 7 이 환경 설계이고 여기 적힌 방해 요인이 그대로 그 시간의 재료가 된다. **이 회차에서는 방해에 대한 답을 주지 않는 것이 설계다.**

첫 도미노와 한 걸음은 **대체가 아니라 층 관계**다. 첫 도미노는 이번 달, 한 걸음은 이번 주 한 동작이다.

### 3-9. 마무리

`confidence` · `facilitatorBox` 는 3회차와 완전 동일. `defaultOpen` 을 두지 않는다.

```
selfNote:
  key:         'self_note'
  label:       '오늘 많은 것을 내려놓고 하나를 고른 나에게, 한마디만 건네주세요.'
  help:        '오늘의 나에게 지금 필요한 말을 적으십시오. 이 한 줄이 회차마다 쌓입니다.'
  placeholder: '다 하려다 아무것도 못 했잖아. 이번엔 하나만 하자'
```

`label` 은 회차마다 다르다. 4회차는 **내려놓은 일**을 정면으로 인정한다. `help` 는 ADR-102 확정 문안이므로 바꾸지 않는다.

### 3-10. save · done

3회차와 완전 동일. 그대로 복제한다.

### 3-11. summaryFields

```
[
  { label: '이번에 시작할 프로젝트', key: 'project_name' },
  { label: '첫 도미노', from: 'domino_what', to: 'domino_effect' },
  { label: '뒤로 미뤄 둔 것', key: 'parked' },
  { label: '인생의 원씽', key: 'onething' },
]
```

**정정 5 — 원안 넷을 유지한다.** 지휘부 검수에서 "3회차는 셋인데 넷은 많다"는 지적이 있었으나 **실측 결과 3회차도 넷이다**(`gap_want` · `rough_project` · 습관 짝 · `speech_habit`). 그중 `rough_project` 는 선택 칸이라 비는 자리이므로, 선택 칸이 섞이는 것도 이미 선례가 있다.

기준은 그대로다 — **나눌 수 있는 문장만.** 범주 낱말(`project_area`)과 날짜(`project_due`)는 제외한다. 날짜는 문장이 아니다. 자리는 카드 순서를 따른다(ADR-99).

`from → to` 는 **인과**이므로 화살표가 참이다 — '이것이 넘어지면 저것이 넘어간다'. 3회차 습관 짝(교체)과 종류는 다르나 방향성이 있다는 점에서 같은 자격이다.

---

## 4. ADR-103 — 되비추기 깊이 (`back`)

### 4-0. 왜 지금 하는가 (정정 1 — 근거 교체)

원 발주서는 이 기능의 근거를 4회차 심화 되비추기에 두었다. **그 근거를 바꾼다.**

`back: 2` 가 실제로 겨누는 것은 2회차 `identity_statement` 인데, 1기 실측 기준 **2회차 제출은 2건**이다. `empty` 를 두지 않았으므로 대다수 참여자에게 그 상자는 **그려지지 않는다.** 타입·순수함수·컴포넌트·페이지 넷을 고치고 조회 왕복을 하나 늘리는 대가로 얻는 것이 소수에게만 보이는 회색 상자 하나라면, ADR-94 에서 세운 기준("도구가 있는가를 먼저 묻는다")에 걸린다.

**그럼에도 진행한다. 근거는 일반화 시점이다.**

> `back` 을 지금 도입하는 이유는 4회차 심화의 값이 아니라 **5·6·7회차에서 두 회차 전을 되비출 일이 반복되기 때문**이다. 회차별 특례로 처리하면 그때 하드코딩하게 되고, ADR-90 이 슬롯을 모양으로 일반화한 판단과 어긋난다. 4회차 심화 되비추기는 2회차를 채운 참여자에게만 보이며 그 수는 적다. 이 기능의 값은 남은 세 회차에서 회수된다.

**ADR-103 본문에 위 문단을 그대로 적는다.** 값을 과장한 채 승인하면 나중에 "그때 왜 만들었지"를 다시 묻게 된다.

### 4-1. 왜 병합이 아닌가

`prior` 하나에 2·3회차를 병합하면 **키가 충돌한다.** `step_what` · `step_when` · `mood` · `self_note` 는 모든 회차가 공유한다. 병합하면 지난 걸음 되비추기가 두 회차 전 값을 읽을 수 있고, 참여자에게 **틀린 문장**이 보인다. 채택하지 않는다.

### 4-2. 타입 — `checkin/index.ts`

```ts
export type Mirror = {
  label: string;
  keys: string[];
  empty?: string;
  /**
   * 몇 회차 전을 읽는가. 기본 1(직전) — 기존 선언은 전부 그대로다.
   * 병합하지 않고 봉투를 나누는 이유: step_what·mood·self_note 는 회차 공용 키라
   * 한 봉투에 합치면 지난 걸음 되비추기가 두 회차 전 값을 읽을 수 있다.
   */
  back?: 1 | 2;
};
```

### 4-3. 순수 함수 — `slots.ts`

**판정 로직(앵커 규칙 · `trim` · 원문 출력)을 한 글자도 바꾸지 않는다.** 시그니처만 바꾼다.

```ts
export type Priors = { back1: Record<string, unknown> | null; back2: Record<string, unknown> | null };

export function resolveMirror(mirror: Mirror | undefined, priors: Priors): MirrorView {
  if (!mirror) return null;
  const prior = (mirror.back ?? 1) === 2 ? priors.back2 : priors.back1;
  // 이하 기존 본문 그대로 (50~56행)
}
```

기존 호출부를 전부 `{ back1: prior, back2: null }` 형태로 고친다. **오버로드를 두지 않는다** — 두 갈래를 남기면 어느 쪽이 정본인지 알 수 없다.

### 4-4. 컴포넌트 — `CheckinCardClient.tsx`

- prop `prior` 를 `priors: Priors` 로 바꾼다
- `MirrorOf` 가 `priors` 를 받아 그대로 넘긴다
- 호출 세 곳(1면 슬롯 · 심화 필드 · 지난 걸음)을 함께 고친다
- **다른 동작을 바꾸지 않는다.** 편집 이동 시 서버가 되비추기를 다시 계산하는 흐름도 그대로다

### 4-5. 페이지 — `checkin/[session]/page.tsx`

```ts
// 두 번째 봉투를 부를지는 회차 번호가 아니라 문안이 정한다(§4-7).
//   sessionNo > 2 로 두면 3회차가 읽지도 않을 2회차 값을 가져온다.
const needsBack2 = copy ? hasBackTwo(copy) : false;

let priors: Priors = { back1: null, back2: null };
if (initialMode === 'edit' && sessionNo > 1) {
  const [p1, p2] = await Promise.all([
    ctx.getMyCheckin(cohortId, sessionNo - 1).catch(() => null),
    needsBack2 && sessionNo > 2
      ? ctx.getMyCheckin(cohortId, sessionNo - 2).catch(() => null)
      : Promise.resolve(null),
  ]);
  if (p1) priors.back1 = (p1.answers ?? {}) as Record<string, unknown>;
  if (p2) priors.back2 = (p2.answers ?? {}) as Record<string, unknown>;
}
```

지킬 것 넷.

- `initialMode === 'edit'` 게이트 유지 — 열람에는 싣지 않는다(ADR-86)
- **두 번째 호출은 `hasBackTwo(copy)` 가 참일 때만** — 문안이 `back: 2` 를 선언한 회차만 부른다. 회차 번호로 분기하면 5·6·7회차에서 다시 고쳐야 하고, 그것이 ADR-90 이 없앤 특례다. `sessionNo > 2` 는 하한 방어로만 남긴다(1·2회차에 두 회차 전이 없다)
- `Promise.all` 로 묶는다 — 직렬이면 응답 시간이 그만큼 는다
- 실패는 조용히 넘긴다 — 되비추기가 없다고 카드가 막히면 안 된다

`hasBackTwo` 는 `slots.ts` 에 순수 함수로 둔다 — 문안을 훑어 `mirror.back === 2` 가 하나라도 있는지 본다. `getCheckinSession` 으로 문안을 이미 읽고 있으므로 추가 비용이 0이다.

### 4-6. 미리보기 — `CheckinPreviewClient.tsx:88`

`prior={withPrior ? SAMPLE_PRIOR : null}` 을 새 prop 형태로 고친다. `SAMPLE_PRIOR_2`(최소 `identity_statement` 한 키)를 두고 `withPrior` 일 때 함께 넘긴다.

### 4-7. 하위호환 자동 증명 (중간 게이트 대체)

ADR-103 은 1·2·3회차가 쓰는 `resolveMirror` 시그니처를 바꾼다. **세 회차의 출력이 한 글자도 달라지지 않아야 한다.** 사람 눈으로 보던 것을 테스트로 옮긴다.

**(1) 되비추기 스냅샷 잠금** — `slots.test.ts` 에 신설한다.

세 회차의 모든 `mirror` 선언에 대해, 값이 있는 경우와 없는 경우의 `resolveMirror` 반환을 **객체 스냅샷으로 고정**한다. `back` 을 붙이지 않은 선언은 전부 `back1` 을 읽어야 하며, 반환의 `kind` · `label` · `value` 가 변경 전과 동일해야 한다.

```
□ 1회차 — mirror 선언 전수, 값 있음/없음 두 경우
□ 2회차 — identity(1회차 값) · lastStep(step_what 앵커)
□ 3회차 — areaPick · pairText · lastStep
□ 위 전부에서 priors.back2 를 채워 넣어도 결과가 변하지 않는다   ← 봉투 분리 증명
```

마지막 항목이 핵심이다. `back2` 에 값을 넣었는데 1~3회차 출력이 달라지면 봉투가 새는 것이다.

**(2) 왕복 수 잠금** — `page.tsx` 의 조회 분기를 순수 함수로 뽑아 테스트한다.

```ts
// 몇 회차 전을 읽을지 결정한다. 페이지에서 분리해 테스트 가능하게 둔다.
export function priorSessionNos(sessionNo: number, mode: 'edit' | 'read'): number[] {
  if (mode !== 'edit' || sessionNo <= 1) return [];
  return sessionNo > 2 ? [sessionNo - 1, sessionNo - 2] : [sessionNo - 1];
}
```

```
□ priorSessionNos(1,'edit') === []
□ priorSessionNos(2,'edit') === [1]        ← 왕복 1, 이전과 같다
□ priorSessionNos(3,'edit') === [2, 1]     ← 3회차는 2회차 값을 안 쓰지만 왕복이 는다(아래)
□ priorSessionNos(4,'edit') === [3, 2]
□ priorSessionNos(4,'read') === []
```

**3회차에서 왕복이 하나 느는 것을 여기서 확정한다.** 원 발주서는 `sessionNo > 2` 조건으로 "3회차 이하는 왕복이 늘지 않는다"고 적었으나, 그 조건에서 3회차는 `3 > 2` 가 참이라 **두 번 부른다.** 3회차 문안에 `back: 2` 선언이 없으므로 읽지 않는 값을 가져오는 셈이다.

조건을 `sessionNo > 3` 으로 좁히지 않는다. 회차 번호로 분기하면 5회차에 `back: 2` 가 생길 때 다시 고쳐야 하고, 그것이 ADR-90 이 없앤 특례다. **대신 문안이 요구할 때만 부르게 한다.**

```ts
// 이 회차의 문안이 back:2 를 선언했는가. 회차 번호가 아니라 문안이 정한다.
const needsBack2 = hasBackTwo(copy);   // slots.ts 의 순수 함수. §4-5 참조
```

`getCheckinSession(sessionNo)` 로 문안을 이미 읽고 있으므로 추가 비용이 없다. 이 판정도 순수 함수로 뽑아 테스트한다.

```
□ hasBackTwo(SESSION_1·2·3) === false · hasBackTwo(SESSION_4) === true
□ 3회차 왕복 1회 — 이전과 동일
```

**(3) 문안 불변 잠금** — `copyRegression` 이 이미 세 회차를 잠그고 있다. B 커밋에서 `session1·2·3.ts` 가 diff 에 나타나면 안 된다.

세 잠금이 서면 사람이 스크린샷으로 보던 것보다 강하다. 스냅샷은 회차가 늘어도 자동으로 따라오지만 사람 눈은 그렇지 않다.

---

## 5. 파일 목록

**신규**

```
src/instruments/futurenow/checkin/session4.ts
src/instruments/futurenow/checkin/session4.test.ts
docs/adr/ADR-103-mirror-back.md
docs/adr/ADR-104-checkin-session4-copy.md
```

**수정**

```
src/instruments/futurenow/checkin/index.ts            ← Mirror.back + getCheckinSession 한 줄 + import
src/instruments/futurenow/checkin/slots.ts            ← resolveMirror 시그니처 + hasBackTwo 신설
src/instruments/futurenow/checkin/slots.test.ts       ← 호출부 갱신 + back 케이스
src/instruments/futurenow/checkin/copyBaseline.json   ← session4 스냅샷
src/instruments/futurenow/checkin/copyRegression.test.ts ← 잠금 대상 편입
src/app/my/cohorts/[cohortId]/checkin/[session]/page.tsx
src/app/my/cohorts/[cohortId]/checkin/[session]/CheckinCardClient.tsx
src/app/coach/cohort/[cohortId]/checkin/preview/CheckinPreviewClient.tsx
```

레지스트리는 한 줄이다 — `if (n === 4) return CHECKIN_SESSION_4;`

---

## 6. 테스트

### 6-1. `session4.test.ts`

`session3.test.ts` 를 본으로 삼되 아래를 반드시 포함한다.

```
□ 레지스트리: getCheckinSession(4) === CHECKIN_SESSION_4
□ requiredTotal === 6
□ filledCount — 빈 답 0
□ filledCount — 1번 묶음은 project_area·project_name·project_due 셋 다 있어야 1
   (둘만 채운 상태에서 0인 것을 명시적으로 확인한다)
□ filledCount — pairText 는 domino_what·domino_effect 둘 다 있어야 1
□ filledCount — mood 가 비어도 mood_custom 만으로 충족 (ADR-101)
□ filledCount — 전부 채운 ANSWERS_4 에서 6
□ missingLabels — 쌍 문항은 비어 있는 쪽만, 화면 문구와 바이트 동일
□ missingKeys — missingLabels 와 길이·순서 동일
□ order === ['areaPick','pairText','question','mood']
□ slotBoundaries 가 [캡션만, 선+캡션, null, 선만] 을 낸다
□ 되비추기 — areaPick(gap_area 앵커) · pairText(rough_project 앵커) · lastStep(step_what 앵커)
□ 되비추기 — rough_project 가 비면 pairText 되비추기가 null
□ back:2 — 심화 onething 이 back2 봉투의 identity_statement 를 읽는다
□ back:2 — back1 에 identity_statement 가 있어도 읽지 않는다 (봉투 분리 증명)
□ readModel 이 신규 7키를 모두 렌더한다
□ summaryFields 네 열이 정의 순서대로 값을 낸다
□ **마음 낱말 앞 다섯이 1·2·3회차와 겹치지 않는다** (정정 6)
```

마지막 항목은 회차 세트를 순회해 교집합이 공집합임을 단언한다. 낱말은 회차마다 사람이 짜므로 5·6·7회차에서 겹칠 수 있다. **주장이 아니라 잠금으로 둔다.**

`ANSWERS_4` 는 원 발주서 §424 를 그대로 쓴다.

### 6-2. `copyRegression.test.ts`

- `S` 배열과 두 순회 루프에 `session4` 를 넣는다
- `copyBaseline.json` 에 `session4` 키 추가. **스냅샷은 `session4.ts` 완성 후에 뽑는다** — 먼저 뽑으면 미완성을 잠그고 즉시 깨진다
- BANNED 검사에 session4 포함. 통과해야 한다
- §3 다섯 자리 검사 순회에 session4 추가 — 연락 요청·익명 안내 두 문장이 4회차에도 있어야 한다
- ADR-104 고정 검사 신설

```ts
describe('4회차 문안이 되돌아가지 않는다 (ADR-104)', () => {
  const l = koreanLiterals('session4');
  it('첫 도미노 짝 — 검산 구조', () => {
    expect(l.has('↓ 그것이 넘어지면')).toBe(true);
    expect(l.has('함께 넘어갈 것은')).toBe(true);
  });
  it('마감일 — STEP 5 원리', () => {
    expect(l.has('이름만 있으면 결심이고, 끝나는 날이 붙으면 프로젝트가 됩니다.')).toBe(true);
  });
  it("'대기열' 을 참여자 문안에 쓰지 않는다", () => {
    expect([...l].some((s) => s.includes('대기열'))).toBe(false);
  });
  it('방해 요인 보조 문구는 5회차 인계다', () => {
    expect(l.has('여기 적어 두신 것이 다음 시간의 재료가 됩니다.')).toBe(true);
    expect([...l].some((s) => s.includes('사흘쯤 뒤에'))).toBe(false);
  });
});
```

### 6-3. `slots.test.ts`

- 기존 호출부를 새 시그니처로
- `back` 미지정이 back1 을 읽는다 (하위호환)
- `back: 2` 가 back2 를 읽고 back1 을 읽지 않는다
- back2 가 null 이면 `empty` 규칙이 그대로 적용된다

### 6-4. 회귀

- `required.test.ts` — 일반화 검사 대상에 4회차를 넣는다. 라벨 이중 진실이 없어야 한다
- `readModel.test.ts` · `CheckinReadView.test.tsx` — 깨지지 않는지 확인만 한다

---

## 7. 금지 어휘 자가 점검

참여자에게 보이는 모든 문안에서 0건이어야 한다.

```
설문 · 진단 · 지각 · 미제출 · 워크북 · 함정 · 점수 · 평가 · 게으름 · 회피 · 대기열
하셔도 됩니다 · 않으셔도 됩니다 · 괜찮습니다 · 아니어도 됩니다 · 충분합니다 · 충분해요
```

`대기열` 은 4회차 신규 금지어다. 세션 안에서만 통하는 내부 용어이며, 강의 어휘를 배우지 못하고 온 사람도 문장만으로 무엇을 쓸지 알아야 한다. 코드 주석과 이 문서에는 써도 된다.

---

## 8. 인수인계 사슬 검증

| 출처 | 키 | 4회차에서 쓰이는 곳 |
|---|---|---|
| 2회차 | `identity_statement` | 심화 되비추기 (`back: 2`) |
| 3회차 | `gap_area` · `gap_want` | areaPick 되비추기 |
| 3회차 | `rough_project` | pairText 되비추기 |
| 3회차 | `step_what` · `step_when` | lastStep 되비추기 |
| 4회차 → 5회차 | `step_what` · `step_when` | 5회차 lastStep 되비추기 |
| 4회차 → 5회차 | `step_blocker` · `domino_what` | 5회차 카드 설계의 재료 |

---

## 9. 미리보기 확인

`/coach/cohort/[cohortId]/checkin/preview` 에서 4회차를 그려 본다.

```
□ 묶음 경계 두 곳, 캡션이 '옵션을 펼치고' · '하나를 선택하다'
□ 되비추기 회색 상자 네 곳(areaPick · pairText · 심화 · lastStep)
□ withPrior 를 끄면 되비추기가 사라지고 lastStep 만 empty 문구
□ '딱 맞는 말이 없음' 을 고르면 다른 칩 해제 + placeholder 변경
□ 심화 기본 접힘 + summary 줄
□ 인도자 상자 기본 접힘
□ 사진 첨부 UI 가 나오지 않는다 (letter_line 없음)
□ 필수 카운터가 6 기준
```

---

## 10. 커밋

```
feat(checkin): 되비추기 깊이 확장 — 두 회차 전 읽기 (ADR-103)
feat(checkin): 4회차 갈무리 문안 — STEP 5·6 (ADR-104)
```

각 커밋이 독립적으로 `tsc` · `vitest` 를 통과해야 한다.

---

## 11. 책 페이지 참조 — 붙이지 않는다

근거는 ADR-88·89 다 — **확정된 값만 카드에 오른다.** 3회차 참조 다섯은 지휘부가 최종 조판 확정치로 선언한 뒤에 올랐다. STEP 5·6 구간은 그 대조가 끝나지 않았다.

`session4.ts` 상단에 남긴다.

```
// 책 페이지 참조 없음 — STEP 5·6 구간의 조판 확정본 대조가 끝나지 않았다(ADR-88·89:
//   확정된 값만 카드에 오른다). 확정되면 문자열 맨 끝에 '문장부호 뒤 + 반각 공백 1칸 +
//   (책 N~M쪽)' 형식으로 붙인다. 붙일 자리는 project_area.label · pairText.label · onething.label 셋이다.
```

---

## 12. 수용 기준

```
□ tsc 0 · eslint clean · vitest 전량 통과 · build 성공
□ copyRegression: session1·2·3 리터럴 삭제·변경·추가 0
□ copyRegression: session4 가 BANNED 통과
□ §7 금지 어휘가 참여자 문안에서 0건
□ §9 여덟 항목 확인
□ §4-7(1) 되비추기 스냅샷 — 1·2·3회차 전수, back2 를 채워도 불변
□ §4-7(2) priorSessionNos · needsBack2 순수함수 테스트 통과
□ 1·2·3회차 왕복 수 불변 — 3회차 1회 (needsBack2 로 판정)
□ B 커밋 diff 에 session1·2·3.ts 가 없다
□ 마음 낱말 겹침 0 (§6-1 잠금)
□ 계약·코어·DB·마이그레이션 델타 0
□ ADR-103 본문에 §4-0 근거 문단이 그대로 들어갔다
□ ADR-104 에 '아니어도 좋습니다' 갈래 규칙이 근거로 인용됐다
□ docs/adr/ADR-103 · ADR-104, docs/reports/CC_REPORT_checkin_session4.md 작성
```

**완료 보고에 포함할 것**

- 변경 파일별 diff 요약
- `filledCount` 6칸 판정 테스트 출력
- 미리보기 §9 렌더 블록 목록
- **§4-7 세 잠금의 테스트 이름과 통과 출력** — 봉투 분리·왕복 수·문안 불변
- 4회차 카드 렌더 결과(HTML 본문 문자열 대조 또는 블록 목록)
- 중단 없이 완주했는가. 중단했다면 어느 검증에서 멈췄는가

**멈춰야 할 때.** §4-7 의 세 잠금 중 하나라도 실패하면 완주하지 말고 그 지점에서 보고한다. 1~3회차가 이미 참여자에게 나가 있으므로, 그 회귀를 안고 4회차를 얹으면 원인 분리가 어려워진다.

---

## 부록. 설계 판단 기록

**`project_due` 를 나눔 열에 넣지 않은 이유.** 인도자 '문장 모아 보기'는 소리 내어 읽을 수 있는 것만 담는다. 날짜는 문장이 아니다. 마감일 자체는 열람(readModel)에서 그대로 보인다.

**`parked` 를 필수로 두지 않은 이유.** 이중 STEP 회차는 옮겨 적기가 둘이라 필수가 하나 늘 자리다. 3회차가 그 증가분을 서술 질문에서 회수했고 4회차도 같다. 옮겨 적기는 이관이라 값이 싸고, 서술은 비싸다.

**`onething` 을 심화에 둔 이유.** 인생의 원씽은 오늘 정하는 것이 아니라 가설이다. 1면에 두면 필수로 읽히고, 못 찾은 사람이 카드를 닫지 못한다. 세션 스크립트도 같은 판단을 한다.

**영역 칩이 세 번째로 반복되는 것에 대하여.** 2회차 가슴 뛴 영역, 3회차 간절한 영역, 4회차 실제로 손대는 영역이다. 반복으로 보이나 **세 값이 어긋날 때가 인도자에게 가장 값진 정보**다. 워크북 활동 2-6 이 현장에서 정확히 이 비교를 시키므로, 카드는 그 비교를 이틀 뒤에 한 번 더 하게 하는 장치다.

**`back` 을 Mirror 속성으로 둔 이유.** 페이지가 회차 번호로 분기해 두 봉투를 만들 수도 있었다. 그러면 4회차 특례가 되고 5·6·7회차에서 분기가 는다. ADR-90 이 슬롯을 모양으로 일반화한 것과 같은 판단으로, **어느 봉투를 읽을지는 문안이 안다.**
