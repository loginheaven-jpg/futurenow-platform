# CC ORDER — 6회차 갈무리 카드 (STEP 9·10) · 다중 되비추기 · 마지막 회차 구조

> 발신: 지휘부(최박사 + Claude) · 수신: 클로드코드(클코1)
> 작성: 2026-08-25
> 기준 커밋: `78af241` — 발행 직전 fresh clone(`--depth 12`)으로 대조함
> 신규 ADR: **ADR-115**(다중 되비추기) · **ADR-116**(마지막 회차 구조) · **ADR-117**(6회차 문안)
> 선행 ADR: 80 · 85 · 86 · 90 · 91 · 94 · 98 · 99 · 100 · 101 · 102 · 103 · 108 · 109
> 문서 자리: `docs/tasks/CC_ORDER_checkin_session6.md`

---

## 0. 이 문서의 지위

**6회차가 참여자 여정의 마지막 카드다.** 코드 주석 세 곳이 옛 배속(6회차=STEP 9 단독 · 7회차=STEP 10)을 전제하고 있는데, 확정 배속표는 **6회차=STEP 9+10(이중 STEP) · 7회차=인도자 세션(참여자 카드 없음)** 이다. 그 주석들도 이 지시서에서 함께 고친다(§7).

작업은 **두 갈래**다. 순서를 바꾸면 A의 테스트가 컴파일되지 않는다.

| 갈래 | 내용 | 순서 |
|---|---|---|
| **B** | 타입·순수함수·렌더 확장 — ADR-115 · ADR-116 | **먼저** |
| **A** | `session6.ts` 신설 + 레지스트리 + 테스트 + 기준선 — ADR-117 | 나중 |

**중간 확인 하나를 둔다.** B가 1~5회차 렌더 경로를 함께 건드린다. **B 커밋 직후 1~5회차 화면 문자열 바이트 동일 보고를 받은 뒤 A로 간다.** 그 외에는 완주한다.

### 하지 않는 것

- **DB 마이그레이션** — 신규 키는 전부 `answers` JSONB 안이다
- **새 입력 형태** — 칩 단일·한 줄·여러 줄·칩 복수·슬라이더·체크박스·접힘 전부 기존 목록 안이다
- **`page.tsx` 수정** — `priorSessionNos`·`Priors`가 이미 깊이 일반이다. `priors[sessionNo - n]`에서 `n`은 회차 번호이고 결과가 깊이(back)다. 그대로 동작한다
- **1~5회차 문안 수정 — 한 글자도 건드리지 않는다**
- **7회차 카드** — 만들지 않는다. 인도자 세션에는 참여자 카드가 없다
- **`cohort_sessions` 6회차 행 시드** — 운영 작업이다. 인도자 콘솔에서 한다
- **사진 첨부** — `letter_line` 키를 쓰지 않으므로 `LetterPhotos`가 자동으로 안 그려진다. 코드를 바꾸지 않는다

---

## 1. 갈래 B — ADR-115 다중 되비추기

### 1-1. 왜 필요한가

6회차가 되비추기를 **한 블록에 여러 개** 요구한다. 두 자리다.

| 자리 | 무엇을 | 깊이 |
|---|---|---|
| 최상위 정체성 선언문 위 | 1회차 존재가치 선언문 · 2회차 인생의 한 문장 | back 5 · 4 |
| 마지막 한마디 위 | 1~5회차 `self_note` 다섯 줄 | back 5·4·3·2·1 |

현행 `BlockBase.mirror`는 **단수**이고 `Mirror.keys[]`는 **한 회차 안에서** 여러 키를 `' · '`로 잇는다. 서로 다른 회차를 각각 한 줄로 쌓을 수 없다.

**ADR-94 기준을 통과한다** — 반복이 한 회차 안에서 두 곳 확인됐다. 그리고 이 회차의 서사 자체가 두 자리에 걸려 있다: 존재가치 → 정체성 → 최상위 정체성의 3단 축적, 그리고 여섯 개 한마디의 연속체. 둘 다 종료 리포트의 헤드라인이다.

### 1-2. 타입 (`index.ts`)

`Mirror`는 **건드리지 않는다.** 새 타입을 얹는다.

```ts
/**
 * 다중 되비추기(ADR-115) — 서로 다른 회차를 각각 한 줄로 쌓아 보여 준다.
 *
 * 단수 `mirror` 와 가르는 기준은 **회차 수**다. 한 회차 안의 여러 키는 `Mirror.keys` 가 ' · ' 로 잇고,
 * 여러 회차는 여기서 줄로 쌓는다. `Mirror.keys` 에 다른 회차 값을 섞을 수 없는 이유는
 * `Mirror.back` 이 블록당 하나이기 때문이고, 그것은 봉투 분리(ADR-103)의 귀결이다.
 *
 * caption 은 줄들을 묶는 한 줄이다. 없으면 각 항목의 label 만 그린다 —
 * 정체성 3단은 항목마다 캡션이 다르고(존재가치 · 인생의 한 문장), 한마디 다섯은 캡션이 하나다.
 */
export type MirrorSet = { caption?: string; items: Mirror[] };

export type BlockBase = { group?: string; mirror?: Mirror; mirrors?: MirrorSet };
```

`wrap.selfNote`도 확장한다. **지금까지 되비추기가 없던 자리다.**

```ts
selfNote: CheckinField & { mirrors?: MirrorSet };
```

### 1-3. 순수 함수 (`slots.ts`)

**`neededBacks`가 새 자리 둘을 더 훑는다.** 빠뜨리면 깊이를 안 부르고 되비추기가 조용히 사라진다.

```ts
export function neededBacks(copy: CheckinSession): number[] {
  const out = new Set<number>();
  const take = (m: Mirror | undefined) => { if (m) out.add(m.back ?? 1); };
  const takeSet = (s: MirrorSet | undefined) => { if (s) for (const m of s.items) take(m); };
  for (const s of orderedSlots(copy)) { take(s.block.mirror); takeSet(s.block.mirrors); }
  for (const f of copy.deepen.fields) take(f.mirror);
  take(copy.step.lastStep?.mirror);
  takeSet(copy.wrap.selfNote.mirrors);
  return [...out].sort((a, b) => a - b);
}
```

판정 함수를 더한다. `resolveMirror`를 재사용한다 — 앵커 규칙·trim 규칙·`empty` 규칙이 그대로 상속돼야 한다.

```ts
export type MirrorSetView = { caption?: string; rows: { label: string; value: string }[] } | null;

/** 값이 있는 항목만 줄로 남긴다. 하나도 없으면 null — 상자 자체를 그리지 않는다. */
export function resolveMirrorSet(set: MirrorSet | undefined, priors: Priors): MirrorSetView {
  if (!set) return null;
  const rows = set.items
    .map((m) => resolveMirror(m, priors))
    .filter((v): v is { kind: 'value'; label: string; value: string } => v?.kind === 'value')
    .map(({ label, value }) => ({ label, value }));
  return rows.length ? { caption: set.caption, rows } : null;
}
```

`MirrorSet` 항목에는 `empty`를 쓰지 않는다. 다섯 줄 중 셋이 비었을 때 빈 문구 셋이 쌓이면 화면이 결손 목록이 된다.

### 1-4. 렌더 (`CheckinCardClient.tsx`)

`MirrorOf` 옆에 `MirrorsOf`를 더한다. **하나의 상자 안에 줄을 쌓는다.** 회색 상자 다섯 개를 세로로 붙이지 않는다.

- 상자 스타일은 기존 `MirrorLine`과 같은 계열(왼쪽 골드 세로선 · 표면1 배경)
- `caption`이 있으면 상자 맨 위에 작게 한 줄
- 각 행은 `label`(작게, 앞) + `value`(본문 색)
- 행 사이 hairline. 첫 행 위에는 선을 두지 않는다

붙는 자리 둘.

| 자리 | 위치 |
|---|---|
| 1면 슬롯 | 기존 `MirrorOf` 바로 다음. 즉 `mirror` → `mirrors` 순 |
| `wrap.selfNote` | 라벨 아래, 입력 상자 위 |

`mirror`와 `mirrors`가 동시에 선언된 블록은 6회차에 없다. 그래도 순서를 정해 둔다 — 나중에 생기면 판단이 또 필요해진다.

---

## 2. 갈래 B — ADR-116 마지막 회차 구조

여섯 장의 카드는 전부 **'다음 시간까지'** 라는 기한 위에 서 있었다. 마지막 카드에는 그 기한이 없다. 네 곳이 성립하지 않는다.

### 2-1. `step.companion` 신설

**세미나가 "의지가 아니라 설계"를 가르쳐 놓고 마지막 날 구조 없이 각자 돌려보내면 앞뒤가 맞지 않는다.** 다음 시간이 없어진 자리를 사람 한 명이 대신한다.

```ts
step: {
  lastStep?: …;
  title: string;
  help: string;
  what: CheckinField;
  when: CheckinField;
  blocker: CheckinField;
  /** 마지막 회차 전용(ADR-116). 다음 모임이 없는 자리를 사람으로 대신한다. blocker 다음에 그린다. */
  companion?: CheckinField;
  share?: …;
};
```

렌더는 `blocker` 바로 다음, `share` 앞이다.

### 2-2. `share.toggleLabel`을 선택으로

6회차에는 공개 토글이 없다. 다음 시간이 없어 화면에 띄울 자리가 없기 때문이다. 그러나 **열람 범위 고지는 남긴다** — 토글이 사라진다고 누가 읽는지까지 사라지면 안 된다.

```ts
share?: { notice: string; toggleLabel?: string };
```

렌더는 `toggleLabel`이 있을 때만 `CheckRow`를 그린다. 1~5회차는 값이 있으므로 출력 변화 0.

### 2-3. `save.notice2`를 선택으로

```ts
save: { button: string; notice1: string; notice2?: string };
```

**두 곳을 고쳐야 한다.** `CheckinCardClient.tsx:328`(열람)과 `:628`(작성). 둘 다 값이 있을 때만 그린다.

### 2-4. `facilitatorBox.defaultOpen`을 6회차에 쓴다

타입은 이미 있다. **주석만 틀렸다**(§7). 6회차 문안에서 `defaultOpen: true`를 선언한다.

### 2-5. `facilitatorBox.suggestion.help`를 렌더에 넘긴다

`suggestion`은 `CheckinField`라 `help`를 가질 수 있는데 렌더(`:561`)가 넘기지 않는다. **5회차 심화 placeholder(ADR-109)와 같은 종류의 결손이다.**

```tsx
<Field label={…suggestion.label} helpText={…suggestion.suggestion?.help}>
```

정확히는 `helpText={copy.wrap.facilitatorBox.suggestion.help}` 한 줄이다. `need`도 같은 자리이나 6회차가 요구하지 않으므로 **건드리지 않는다** — 반복이 확인되지 않은 일반화는 하지 않는다(ADR-94).

---

## 3. 갈래 A — ADR-117 · 6회차 문안

`src/instruments/futurenow/checkin/session6.ts`. **임의 윤문 금지 — 조사 하나 바꾸지 않는다.**

### 3-1. 표지

| 항목 | 값 |
|---|---|
| `brand` | `FUTURE NOW · 6회차` |
| `title` | `오늘의 갈무리` |
| `subtitle` | `끝에서부터 오늘을 다시 보다` |
| `counter` | `` (n) => `필수 6칸 중 ${n}칸 채움 · 약 5분` `` |
| `band` | `여섯 주를 걸어온 오늘, 마지막으로 한 줄을 남깁니다.` |

`firstVisitOnce` 없음.

### 3-2. 1면 슬롯 순서와 묶음

```
order: ['question', 'purpose', 'identity', 'mood']
```

부제를 쪼갤 수 없어 **STEP 이름으로** 묶음을 가른다. 5회차와 같은 방식이다.

| 슬롯 | 담는 것 | `group` |
|---|---|---|
| `question` | 문항 1 · 끝까지 남는 것 | `남는 것을 가리고` |
| `purpose` | 문항 3 · 오늘의 질문 | `남는 것을 가리고` |
| `identity` | 문항 2 · 최상위 정체성 선언문 | `한 층을 얹다` |
| `mood` | 오늘의 마음 | (없음 — 회차 전체에 대한 물음) |

**발주서 순서에서 바뀌었다.** 발주서는 옮겨 적기 둘을 붙였으나, 그러면 묶음 경계가 STEP 경계와 어긋난다. 문항 1·3은 STEP 9이고 문항 2는 STEP 10이다. 4회차가 `pairText`를 `question` 앞으로 옮긴 것과 같은 판단이다.

**슬롯 배정 근거.** 슬롯 이름은 회차가 아니라 **모양**이다(ADR-90).
- 문항 1은 라벨 + 한 칸 서술이라 `question`의 모양이다. `badge`는 선택이므로 필수 칸에 써도 된다
- 문항 3은 보이는 선택이라 `badge`가 필요하고, `question`이 이미 찼다. `purpose`가 **기본 펼침 + badge + 여러 필드**이고 필드 하나로도 성립한다. 갈무리 규칙의 "접힘으로 감싸지 않는다"는 기본 펼침으로 충족된다
- 문항 2는 `identity`다. 이름까지 정확하다

**새 슬롯을 만들지 않는다.** 만들면 회차마다 슬롯이 늘어 레지스트리를 만든 이유가 사라진다.

### 3-3. 1면 문안

**`question` — 문항 1 · 필수**

```
key:   'lasting_one'
label: '오늘 마지막까지 남는다고 적으신 한 줄을 그대로 옮겨 적으십시오. (책 246~251쪽)'
help:  '그 자리를 비워 두고 오셨다면 지금 떠오르는 것을 적으십시오. 이 한 줄이 아래 정체성 문장의 재료가 됩니다.'
group: '남는 것을 가리고'
```

`badge` 없음. `placeholder` 없음 — 이 칸에 예시를 두면 남의 답이 정답이 된다.

**`purpose` — 문항 3 · 보이는 선택**

```
title: '오늘의 질문'
badge: '선택'
help:  '어느 쪽을 고르셨는지는 묻지 않습니다. 오늘 새로 보인 것만 받습니다.'
group: '남는 것을 가리고'
fields: [
  { key: 'worldview_seen',
    label: '두 세계관을 나란히 놓고 보았을 때, 무엇이 새로 보였습니까? (책 256~263쪽)',
    help: '머리로 동의해 온 자리와 실제로 살아온 자리가 달랐다면, 그 자리를 적으십시오.' }
]
```

블록 `help`와 필드 `help`가 서로 다른 것을 말한다 — 앞은 이 카드가 무엇을 묻지 **않는지**, 뒤는 무엇을 묻는지다. 중복이 아니다.

**세계관 표시 자체를 저장하지 않는다.** 현장에서도 공개하지 않기로 설계한 항목이라 카드가 물으면 설계가 어긋난다.

**`identity` — 문항 2 · 필수**

```
key:         'top_identity'
label:       '오늘 사다리 맨 윗줄에 쓰신 한 문장을 그대로 옮겨 적으십시오. (책 264~267쪽)'
help:        '쓰신 그대로 옮기십시오. 여섯 주 동안 세 번째로 쓰는 문장이고, 종료 리포트가 셋을 나란히 놓습니다.'
placeholder: '나는 ______ 이다'
group:       '한 층을 얹다'
mirrors: {
  items: [
    { label: '첫 시간에 쓰신 존재가치 선언문',   keys: ['identity_sentence'],  back: 5 },
    { label: '두 번째 시간에 쓰신 인생의 한 문장', keys: ['identity_statement'], back: 4 },
  ],
}
```

`caption` 없음 — 두 항목의 캡션이 서로 다르다. 키는 레포 실물에서 확인했다(`session1.ts:52` · `session2.ts:65`).

**`mood` — 필수 · 묶음 밖**

```
options:   ['뭉클함', '평안함', '숙연함', '시원섭섭함', '허전함', '딱 맞는 말이 없음']
exclusive: '딱 맞는 말이 없음'
max:       2
label:     '이 시간을 마치고 나온 지금, 마음은 어떤가요?'
help:      '두 개까지 고르실 수 있습니다.'
```

**발주서 낱말 넷을 교체했다.** 발주서 안(뭉클함·홀가분함·먹먹함·든든함·아쉬움)은 `홀가분함`이 3회차와, `먹먹함`이 1회차와, `든든함`·`아쉬움`이 4회차와 **문자열이 같다.** 5회차가 같은 이유로 홀가분함→가뿐함, 든든함→단단함으로 바꿨고 `session5.test.ts`가 그것을 잠근다.

교체 근거는 회차별로 다르다. `평안함`은 STEP 10의 '여유가 아니라 평안'과 호응하고, `숙연함`은 이 회차가 다룬 유한성의 무게를 받으며, `시원섭섭함`과 `허전함`은 여정이 끝나는 자리의 양가감정을 나눠 받는다. 어감 겹침은 허용한다 — 문자열까지 겹치지 않게 하면 쓸 낱말이 남지 않는다.

정서 균형: 부정 쪽은 `숙연함`·`허전함` 둘이다. 셋 미만이므로 기준을 통과한다.

`moodCustom`은 5회차와 동일하다.

### 3-4. 심화 — 문항 4 · 오늘의 한 사람

```
title:   '여섯 주가 닿는 자리'
summary: '이번 주에 만날 한 사람'
fields: [
  { key: 'love_person', label: '이번 주에 만날 한 사람은 누구입니까? (책 274~279쪽)', placeholder: '어머니' },
  { key: 'love_act',    label: '그 사람에게 할 가장 작은 한 가지',
    help: '문자 한 줄이 이 회차의 착지점입니다. 크기가 아니라 이번 주 안에 하느냐가 결과를 만듭니다.',
    placeholder: '안부 문자 보내기' },
]
```

`deepen`은 타입상 필수 블록이라 6회차도 반드시 하나를 갖는다. 문항 4가 그 자리다. 발주서는 이것을 1면 '보이는 선택'으로 뒀으나 1면 슬롯이 이미 넷이고, 새 슬롯을 만드는 것보다 심화가 싸다.

`love_person`에 `help`를 두지 않는다 — `placeholder`가 관계로 적어도 된다는 것을 이미 보여 준다.

### 3-5. 2면

**`lastStep`**

```
key:     'last_step_result'
label:   '지난 한 걸음은 어떻게 되었나요?'
options: ['했습니다', '조금 했습니다', '잊고 지냈습니다', '하려다 막혔습니다', '크기나 내용을 바꿨습니다']
note:    { key: 'last_step_note', label: '한 줄만 덧붙여 주세요', help: '여기 정직하게 적는 것이 앞으로 90일을 바꿉니다.' }
mirror:  { label: '지난 시간의 한 걸음', keys: ['step_what', 'step_when'] }
```

선택지 다섯은 5회차가 신설한 것을 그대로 잇는다. `empty`를 두지 않는다 — 6회차까지 온 참여자에게 "이번 회차부터 쌓입니다"는 틀린 말이고, 값이 없으면 상자를 안 그리는 편이 낫다.

**한 걸음**

```
title: '앞으로 90일 동안 이어 갈 한 걸음을 정합니다.'
help:  '다음 모임이 없습니다. 그래서 기한을 90일로 잡고, 아래에서 함께 볼 사람을 정합니다.'

what:      { key: 'step_what', label: '무엇을 하시겠어요?' }
when:      { key: 'step_when', label: '언제, 어디서 하시겠어요?',
             placeholder: '토요일 아침, 집 앞 카페에서',
             help: '이미 하고 있는 행동 뒤에 붙이면 90일을 견딥니다.' }
blocker:   { key: 'step_blocker', label: '못 하게 될 것 같은 때가 있다면 언제일까요?',
             placeholder: '일이 몰리는 달',
             help: '미리 적어 두면 그 순간에 덜 무너집니다.' }
companion: { key: 'step_companion', label: '이 걸음을 함께 봐 줄 한 사람의 이름을 적으십시오.',
             help: '이 과정에서 만난 분이든 원래 알던 분이든 상관없습니다. 이름 한 칸이 90일을 지탱합니다.' }

share: { notice: '적으신 90일 한 걸음은 인도자와 나만 봅니다.' }
```

`toggleLabel` 없음 → `CheckRow`가 그려지지 않는다.

### 3-6. 3면

**`confidence`**

```
label: '이 한 걸음, 90일 동안 어느 정도로 해내실까요?'
help:  '낮게 적힌 숫자가 인도자에게는 가장 쓸모 있습니다. 종료 뒤 연락의 우선순위가 됩니다.'
min: 0 · max: 10 · leftLabel: '아직 자신 없음' · rightLabel: '완전 성공'
```

**`facilitatorBox`** — 5회차와 동일하되 둘이 다르다.

```
defaultOpen: true
suggestion: { key: 'suggestion', label: '세미나에 대해 바라는 점이 있나요?',
              help: '이번이 마지막입니다. 여기 적히는 것이 다음 기수 설계에 그대로 들어갑니다.' }
```

나머지(`title`·`summary`·`need`·`suggestionAnon`·`contactRequest`)는 5회차 그대로다.

**`selfNote`**

```
key:   'self_note'
label: '여섯 주를 걸어온 나에게, 마지막으로 한마디 건네주세요.'
mirrors: {
  caption: '지금까지 나에게 준 말들',
  items: [
    { label: '1회차', keys: ['self_note'], back: 5 },
    { label: '2회차', keys: ['self_note'], back: 4 },
    { label: '3회차', keys: ['self_note'], back: 3 },
    { label: '4회차', keys: ['self_note'], back: 2 },
    { label: '5회차', keys: ['self_note'], back: 1 },
  ],
}
```

**`help`를 두지 않는다.** 1~5회차의 `help`는 무엇을 적을지 알려 주는 자리인데, 6회차는 다섯 줄의 자기 문장이 그 일을 대신한다. 앞 회차 문안은 건드리지 않는다.

`placeholder`도 두지 않는다. 다섯 줄을 읽은 다음이라 예시가 필요 없고, 예시를 두면 그 여섯 번째가 남의 문장이 된다.

**`save` · `done`**

```
save: { button: '갈무리 저장', notice1: '언제든 다시 열어 고쳐 쓸 수 있습니다' }
done: { title: '갈무리를 저장했습니다.', stepHeading: '앞으로 90일의 한 걸음',
        toHome: '차수 홈으로', edit: '고쳐 쓰기' }
```

`notice1`에 기한이 없다. `notice2` 없음(§2-3).

### 3-7. 필수 6칸

```ts
const REQUIRED_6: RequiredGroup[] = [
  { fields: [{ key: 'lasting_one', label: '오늘 마지막까지 남는다고 적으신 한 줄을 그대로 옮겨 적으십시오. (책 246~251쪽)' }] },
  { fields: [{ key: 'top_identity', label: '오늘 사다리 맨 윗줄에 쓰신 한 문장을 그대로 옮겨 적으십시오. (책 264~267쪽)' }] },
  { kind: 'list', fields: [{ key: 'mood', label: '이 시간을 마치고 나온 지금, 마음은 어떤가요?', altKey: 'mood_custom' }] },
  { fields: [{ key: 'last_step_result', label: '지난 한 걸음은 어떻게 되었나요?' }] },
  { fields: [
    { key: 'step_what', label: '무엇을 하시겠어요?' },
    { key: 'step_when', label: '언제, 어디서 하시겠어요?' },
  ] },
  { fields: [{ key: 'self_note', label: '여섯 주를 걸어온 나에게, 마지막으로 한마디 건네주세요.' }] },
];
```

라벨은 위 문안과 **같은 문자열**이다(ADR-91 — 결측 안내가 그대로 읽어 준다).

세지 않는 것: `worldview_seen`(보이는 선택) · `love_person`·`love_act`(심화) · `last_step_note` · `step_blocker` · `step_companion` · `confidence` · 인도자 상자.

**`step_companion`을 세지 않는 이유.** 이 회차의 설계상 가장 지키고 싶은 칸이지만, 이름을 못 대는 참여자가 반드시 있고 그때 제출이 막힌다. 마지막 회차에서 제출을 막는 대가가 얻는 것보다 크다.

### 3-8. 나눔 후보 열

```ts
summaryFields: [
  { label: '남는 것',        key: 'lasting_one' },
  { label: '정체성 선언',    key: 'top_identity' },
  { label: '새로 보인 것',   key: 'worldview_seen' },
  { label: '이번 주의 한 가지', key: 'love_act' },
]
```

`love_person`을 넣지 않는다 — **제3자의 이름이 들어가는 유일한 칸**이라 나눔 화면에 올리지 않는다. 저장은 하고 개인 상세에만 남는다.

`step_companion`도 같은 이유로 넣지 않는다.

`worldview_seen`은 선택 칸이라 비는 자리가 있으나 비어 있을 가능성은 배제 사유가 아니다(ADR-99).

---

## 4. 되비추기 깊이와 비용

`neededBacks(session6)` = **`[1, 2, 3, 4, 5]`**.

지금까지 최대는 4회차의 `[1, 2]`였다. `page.tsx`가 `Promise.all`로 묶어 병렬 조회하므로 응답 시간은 왕복 하나에 가깝지만, **DB 조회가 다섯 건**이다.

**한 번에 여러 회차를 읽는 코어 메서드를 만들지 않는다.** 6회차 한 곳의 요구이고, 7회차 참여자 카드가 없어 반복이 확인되지 않는다(ADR-94). 대신 §6에 응답 시간 측정을 넣는다.

`priorSessionNos(6, 'edit', [1,2,3,4,5])` = `[5, 4, 3, 2, 1]`. 전부 1 이상이라 걸러지는 것이 없다.

---

## 5. 등록·회귀 갱신

| 파일 | 무엇을 |
|---|---|
| `index.ts` | `import { CHECKIN_SESSION_6 }` · `getCheckinSession` 에 `if (n === 6)` 한 줄 |
| `registry.guard.test.ts` | `FILES` 에 `6: CHECKIN_SESSION_6` 한 줄. 그 외 손대지 않는다 |
| `copyRegression.test.ts` | `S` 배열 **두 곳**(`:100` · `:163`)에 `'session6'` 추가 |
| `copyBaseline.json` | `session6` 항목 생성 |
| `session6.test.ts` | 신설 — 아래 |

`session6.test.ts`가 잠글 것.

- 필수 6칸 · 쌍 문항 `&&` 결합 · `worldview_seen` 미포함
- `missingLabels` 라벨이 화면 문안과 문자열 동일
- `order` = `['question','purpose','identity','mood']`
- `group` = `남는 것을 가리고` ×2 · `한 층을 얹다` ×1 · `mood` 없음
- **마음 낱말 앞 다섯이 1~5회차와 문자열 기준 겹침 0건** — 5회차 테스트와 같은 방식
- `neededBacks` = `[1,2,3,4,5]`
- `mirrors` 두 자리의 `back` 값과 키
- 금지어 0건 · BANNED 어휘 0건
- `save.notice2` 미선언 · `share.toggleLabel` 미선언 · `facilitatorBox.defaultOpen === true`

---

## 6. 수용 기준 — 스스로 통과시킨 뒤 보고한다

**채널 1 · 코드**

```
□ tsc 0 · eslint 0 · vitest 전건 통과 · build 성공
□ B 커밋 diff 에 session1~5.ts 변경 0
□ CheckinCardClient · readModel · slots 변경이 §1~§2 목록 밖으로 나가지 않았다
□ page.tsx 변경 0
□ 마이그레이션 파일 신설 0
```

**채널 2 · 계약**

```
□ getCheckinSession(6) 이 CHECKIN_SESSION_6 객체를 그대로 돌려준다(toBe)
□ getCheckinSession(7) 이 null 이다
□ registry.guard 의 연속성 단언 통과 (1~6 빈틈없음)
□ copyBaseline.json 에 session6 이 있고 1~5 항목 바이트 동일
□ session6 문안의 모든 한국어 리터럴에 BANNED 어휘 0건
```

**채널 3 · 실행** — 배포 후 **실기기**에서 확인한다. `tsc`·`vitest`·`build`를 다 통과하고도 필수 입력칸이 화면에서 사라진 전례가 있다.

```
□ 1~5회차를 한 번씩 열어 화면 문자열이 이전과 같다 (B 직후 · 중간 보고 대상)
□ 6회차 1면 — 묶음 캡션 둘, mood 위 hairline, '선택' 배지 둘(purpose·없음 확인)
□ 6회차 정체성 칸 위 되비추기 두 줄이 한 상자에 그려진다
□ 1·2회차 미작성 계정에서 그 줄이 빠지고 상자가 한 줄로 줄어든다
□ 1~5회차 전부 미작성 계정에서 마지막 한마디 위 상자가 아예 안 그려진다
□ 90일 한 걸음 아래 공개 토글이 없고 안내 한 줄만 있다
□ 저장 바에 문구가 한 줄이다
□ 인도자 상자가 펼쳐진 채로 열린다
□ 6회차 페이지 TTFB 를 1~5회차와 비교해 보고한다 (되비추기 다섯 건의 실제 비용)
```

**보고 형식** — `docs/reports/2026-08-25-checkin-session6-완료.md`. 커밋 해시 두 개(B·A)와 위 항목별 실측을 담는다. 통과 여부만 적지 말고 **무엇을 어떻게 확인했는지**를 적는다.

---

## 7. 함께 고치는 주석 셋 — 옛 배속 전제

배속이 바뀌었는데 주석이 따라오지 않았다. **틀린 이유를 문서로 남기지 않으면 7회차 판단에서 그대로 되살아난다.**

| 파일 | 현재 | 고칠 방향 |
|---|---|---|
| `index.ts` · `facilitatorBox.defaultOpen` | `7회차만 true 로 연다` | `마지막 참여자 회차(6회차)만 true 로 연다. 7회차는 인도자 세션이라 참여자 카드가 없다` |
| `slots.ts` · `Mirror.back` | `종단 축(… 남은 시간6 → 정체성 선언7)` | `종단 축(갈망1 → 한 문장2 → 영역3 → 원씽4 → 환경5 → 정체성 선언6). 6회차가 1회차를 되비추므로 back 은 실제로 5까지 온다` |
| `CheckinCardClient.tsx` · `GroupBoundary` | `단일 STEP 회차(1·2·6·7)는 group 이 전부 없어` | `단일 STEP 회차(1·2)는 group 이 전부 없어` |

`registry.guard.test.ts` 의 `PROBE` 상한 12는 그대로 둔다 — 넉넉한 상한이라 배속과 무관하다.

---

## 8. 미결 · 지휘부 판단 대기

착수를 막지 않는다. 아래 셋은 **문안 문자열 한 곳씩**이라 나중에 괄호만 더하면 된다. 위치를 `session6.ts` 상단 주석에 적어 둔다.

1. **`save.notice1` 의 기한.** 지금은 기한 없이 `언제든 다시 열어 고쳐 쓸 수 있습니다` 다. 마무리 체크 개시 시점이 정해지면 그 시점을 기한으로 넣을지 판단이 온다.
2. **`step_companion` 의 90일 리마인드.** 다음 회차가 없어 회수 장치가 없다. 90일 뒤 알림을 보낼지, 보낸다면 문안을 어떻게 할지는 별건으로 발주한다.
3. **책 페이지 세 곳** — 246~251 · 256~263 · 264~267 · 274~279 는 원전 파일 대조로 확정했으나, 쇄가 바뀌면 어긋난다. 인쇄본 기준 재확인이 오면 문자열만 고친다.
