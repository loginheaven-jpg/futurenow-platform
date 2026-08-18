// 회차 갈무리 · 4회차 문안(ADR-104 · CC_ORDER_checkin_session4 §3). 임의 윤문 금지 — 조사 하나 바꾸지 않는다.
//   STEP 5(삶의 옵션을 펼쳐라) + STEP 6(단 한 가지를 선택하라)를 한 카드에 담는 **두 번째 이중 STEP 회차**다.
//   3회차가 만든 구조(group · order · mirror)를 그대로 쓴다. 새 입력 형태를 만들지 않는다.
//   1면 순서가 3회차와 다르다 — pairText 가 question 앞이다. 두 옮겨 적기(펼친 것 하나 · 고른 것 하나)가
//     붙어 있어야 묶음 경계가 화제 전환과 일치한다.
//   되비추기 네 곳: ①(3회차 영역+바람) · ②(3회차 우당탕탕) · 심화(**2회차** 한 문장 · back:2) · ⑤(3회차 한 걸음).
//   어조는 ADR-102 진취 전환을 따른다 — 허락 어휘를 쓰지 않는다(copyRegression 의 BANNED 가 잠근다).
//
// 책 페이지 참조 없음 — STEP 5·6 구간의 조판 확정본 대조가 끝나지 않았다(ADR-88·89:
//   확정된 값만 카드에 오른다). 확정되면 문자열 맨 끝에 '문장부호 뒤 + 반각 공백 1칸 +
//   (책 N~M쪽)' 형식으로 붙인다. 붙일 자리는 project_area.label · pairText.label · onething.label 셋이다.
import type { CheckinSession } from './index';
import { countFilled, missingIn, missingKeys, type RequiredGroup } from './required';

// 필수 6칸 — 영역+프로젝트(셋) · 첫 도미노 짝 · 마음 · 지난걸음 · 다음걸음쌍 · 나에게.
//   **1번이 세 필드인 근거**: STEP 5 의 유일한 판별 기준이 '끝나는 날'이다. 마감일을 선택으로 내리면
//   이 회차의 원리가 카드에서 빠지고, 이름과 한 칸에 합치면 한 문항이 두 가지를 묻게 된다(원칙 §2-3).
//   참여자는 워크북 활동 4 정의서에 이름과 마감일을 이미 써 두었으므로 옮겨 적기이고 값이 싸다.
//   parked(서술)·onething(심화)·last_step_note·step_blocker·confidence 는 세지 않는다.
//   이중 STEP 이라 옮겨 적기가 둘이어서 필수가 하나 늘 자리인데, 그 증가분을 서술 질문에서 회수한다
//   — 3회차 stuck_named 와 같은 처리다.
//   라벨은 아래 문안과 **같은 문자열**이다(결측 안내가 이걸 그대로 읽어 준다 · ADR-91).
const REQUIRED_4: RequiredGroup[] = [
  { fields: [
    { key: 'project_area', label: '오늘 다섯 영역에 프로젝트를 펼치셨지요. 그중 이번에 시작할 하나는 어느 영역인가요?' },
    { key: 'project_name', label: '그 프로젝트의 이름' },
    { key: 'project_due', label: '끝나는 날' },
  ] },
  { fields: [
    { key: 'domino_what', label: '이번 달에 쓰러뜨릴 하나는' },
    { key: 'domino_effect', label: '함께 넘어갈 것은' },
  ] },
  // ADR-101: 직접 쓰기(mood_custom)만 채워도 '마음'이 찬 것으로 본다. 3회차부터 적용된 규칙을 그대로 잇는다.
  { kind: 'list', fields: [{ key: 'mood', label: '이 시간을 마치고 나온 지금, 마음은 어떤가요?', altKey: 'mood_custom' }] },
  { fields: [{ key: 'last_step_result', label: '지난 한 걸음은 어떻게 되었나요?' }] },
  { fields: [
    { key: 'step_what', label: '무엇을 하시겠어요?' },
    { key: 'step_when', label: '언제, 어디서 하시겠어요?' },
  ] },
  { fields: [{ key: 'self_note', label: '오늘 많은 것을 내려놓고 하나를 고른 나에게, 한마디만 건네주세요.' }] },
];

export const CHECKIN_SESSION_4 = {
  sessionNo: 4,
  cover: {
    brand: 'FUTURE NOW · 4회차',
    title: '오늘의 갈무리',
    subtitle: '옵션을 펼치고, 하나를 선택하다',
    counter: (n: number) => `필수 6칸 중 ${n}칸 채움 · 약 5분`,
    band: '오늘 펼친 것과, 그중에 고른 하나를 적어 둡니다.',
    // firstVisitOnce 없음 — 1회차에서 이미 안내.
  },
  today: {
    // 1면 순서: 영역+프로젝트(펼침) → 첫 도미노(선택) → 오늘의 질문(선택) → 마음(묶음 밖).
    order: ['areaPick', 'pairText', 'question', 'mood'],
    // ① 이번에 시작할 영역 + 프로젝트 이름 + 마감일 — 필수. 세 칸이 다 차야 한 칸으로 센다.
    //   future_area(2회차)·gap_area(3회차)를 **재사용하지 않는다**: 2회차는 가장 가슴 뛴 영역,
    //   3회차는 가장 간절한 영역, 4회차는 실제로 손대는 영역이다. 세 값이 어긋날 때가 인도자에게
    //   가장 값진 정보인데 같은 키를 쓰면 그 차이가 덮인다.
    areaPick: {
      group: '옵션을 펼치고',
      key: 'project_area',
      label: '오늘 다섯 영역에 프로젝트를 펼치셨지요. 그중 이번에 시작할 하나는 어느 영역인가요?',
      // '아니어도 좋습니다'는 허락이 아니라 **오답 방지**다(원칙 §1 축1) — 가장 많이 적힌 칸을 골라야
      //   한다는 오해를 막는다. 뒷문장이 명령형으로 값을 회수한다.
      help: '가장 많이 적힌 칸이 아니어도 좋습니다. 지금 손이 가는 하나를 고르십시오.',
      options: ['일', '재정', '관계', '건강', '기여'],
      lines: [
        { key: 'project_name', label: '그 프로젝트의 이름', placeholder: '주 한 번씩 현업 선배 만나기' },
        {
          key: 'project_due',
          label: '끝나는 날',
          // 이 문장이 STEP 5 의 핵심 원리를 진다. 지우면 마감일 칸이 단순 서식이 된다.
          help: '이름만 있으면 결심이고, 끝나는 날이 붙으면 프로젝트가 됩니다.',
          placeholder: '10월 31일',
        },
      ],
      mirror: { label: '지난 시간에 가장 간절하다고 고르신 영역', keys: ['gap_area', 'gap_want'] },
    },
    // ② 첫 도미노 짝 — 필수. 3회차 습관 짝과 같은 **구조 강제** 장치다.
    //   아래 칸이 검산기 노릇을 한다 — 함께 넘어갈 것을 못 적으면 그것은 첫 도미노가 아니라
    //   그냥 해야 할 일 중 하나다. **인도자가 판정하지 않고 참여자가 스스로 안다.**
    //   rough_project 는 3회차에서 선택이라 비어 있을 수 있다. empty 를 두지 않아 그때는 상자가 안 그려진다.
    pairText: {
      group: '하나를 선택하다',
      label: '오늘 고른 첫 도미노 하나를 옮겨 주세요.',
      help: '가장 급한 일도, 가장 쉬운 일도 아닙니다. 그것 하나가 되면 나머지가 쉬워지는 하나를 고르십시오.',
      from: { key: 'domino_what', label: '이번 달에 쓰러뜨릴 하나는' },
      connector: '↓ 그것이 넘어지면',
      to: { key: 'domino_effect', label: '함께 넘어갈 것은' },
      mirror: { label: '지난 시간에 이름 붙이신 우당탕탕 프로젝트', keys: ['rough_project'] },
    },
    // ③ 오늘의 질문 — 보이는 선택. 접힘으로 감싸지 않는다(그 회차의 핵심 경험을 받는 자리).
    //   4회차의 아픔은 직면이 아니라 **상실**이다. 스무 개를 펼쳐 놓고 하나만 남기는 날이라,
    //   카드가 이틀 뒤 열릴 때 그 아쉬움이 그대로 남아 있다.
    //   세션에서는 이것을 '대기열'이라 부르지만 **카드에서는 그 낱말을 쓰지 않는다** — 세션 안에서만
    //   통하는 내부 용어이고, 강의 어휘를 못 들은 사람도 문장만으로 무엇을 쓸지 알아야 한다.
    //   help 의 뒷절은 '정해 두셨다면'이라는 조건절이다 — 정한 사람만 적고 안 정한 사람은 넘어간다.
    //   명령형으로 두면 한 칸에 두 물음을 넣는 것이 된다(원칙 §2-3).
    question: {
      group: '하나를 선택하다',
      key: 'parked',
      label: '오늘 하나를 고르면서 뒤로 미뤄 둔 것 중, 가장 아까운 하나는 무엇이었나요?',
      help: '버린 것이 아니라 순서가 뒤로 간 것입니다. 언제쯤 다시 볼지 정해 두셨다면 함께 적으십시오.',
      badge: '선택',
    },
    // ④ 오늘의 마음 — 묶음 밖(group 없음). 회차 전체에 대한 물음이라 선택 묶음에 딸리면 안 된다.
    //   이 회차는 **펼칠 때 벅찼다가 고를 때 아픈** 결이라 앞선 세 회차와 정서가 다르다.
    //   부정 쪽은 아쉬움·망설임 둘이다(3회차 상한 셋). '망설임'을 넣은 이유는 첫 도미노를 아직
    //   못 고른 사람이 반드시 나오기 때문이다 — 그 상태에 이름이 없으면 카드 앞에서 자기를 탓한다.
    //   앞 다섯 낱말이 1·2·3회차와 겹치지 않는다(session4.test.ts 가 잠근다 — 주장이 아니라 검증이다).
    mood: {
      key: 'mood',
      label: '이 시간을 마치고 나온 지금, 마음은 어떤가요?',
      help: '두 개까지 고르실 수 있습니다.',
      options: ['선명함', '아쉬움', '두근거림', '망설임', '든든함', '딱 맞는 말이 없음'],
      exclusive: '딱 맞는 말이 없음',
      max: 2,
    },
    moodCustom: { key: 'mood_custom', placeholder: '직접 쓰기 (선택)', promptPlaceholder: '그럼, 지금 마음에 가까운 말을 한마디로 적어 주세요' },
  },
  deepen: {
    // 3회차 선례대로 심화는 **한 칸**이다. 인생의 원씽은 오늘 정하는 것이 아니라 가설이므로
    //   필수로 두지 않는다 — 필수면 못 찾은 사람이 카드를 닫지 못한다.
    //   되비추기가 **두 회차 전**(2회차 인생의 한 문장)을 읽는다. ADR-103 의 back 이 이 자리를 위해 났고,
    //   그 기능의 값은 5·6·7회차에서 회수된다(ADR-103 §4-0).
    title: '여기서부터가 진짜입니다',
    summary: '인생의 원씽 — 세 원이 겹치는 자리',
    fields: [
      {
        key: 'onething',
        label: "오늘 세워 본 '인생의 원씽' 문장을 그대로 옮겨 주세요.",
        help: '오늘 세우신 것은 가설입니다. 다음 회차에 고쳐 쓰는 것이 정상입니다.',
        mirror: { label: "2회차에 쓰신 '인생을 이끌어갈 하나의 문장'", keys: ['identity_statement'], back: 2 },
      },
    ],
  },
  step: {
    // ⑤ 지난 한 걸음 결산 — 3회차와 완전 동일(문안·선택지·되비추기·empty 어느 것도 바꾸지 않는다).
    lastStep: {
      key: 'last_step_result',
      label: '지난 한 걸음은 어떻게 되었나요?',
      options: ['했습니다', '조금 했습니다', '잊고 지냈습니다', '하려다 막혔습니다'],
      note: { key: 'last_step_note', label: '한 줄만 덧붙여 주세요', help: '여기 정직하게 적는 것이 다음 한 주를 바꿉니다.' },
      mirror: {
        label: '지난 시간의 한 걸음',
        keys: ['step_what', 'step_when'],
        empty: '이번 회차부터 한 걸음이 쌓입니다.',
      },
    },
    // ⑥ 다음 한 걸음. 첫 도미노와 한 걸음은 **대체가 아니라 층 관계**다 —
    //   첫 도미노는 이번 달, 한 걸음은 이번 주 한 동작이다.
    title: '다음 시간까지 할 작은 실천 하나를 정해 봅시다.',
    help: '오늘 정하신 첫 도미노를 향해, 이번 주에 몸을 움직여 할 수 있는 가장 작은 것 하나면 됩니다. 10분 안에 끝나는 것일수록 좋습니다.',
    // what.help 를 새로 붙였다 — 워크북이 이 회차에서 '계획이 아니라 동작'을 강제하는데,
    //   카드에도 같은 지시가 있어야 이틀 뒤에 큰 것을 적지 않는다.
    what: { key: 'step_what', label: '무엇을 하시겠어요?', help: "계획이 아니라 동작으로 적으십시오. '책 읽기'가 아니라 '오늘 밤 그 책을 가방에 넣기'입니다." },
    when: {
      key: 'step_when',
      label: '언제, 어디서 하시겠어요?',
      placeholder: '토요일 아침, 집 앞 카페에서',
      help: "이미 하고 있는 행동 뒤에 붙이면 훨씬 잘 켜집니다. '양치한 다음'처럼요.",
    },
    // blocker.help 를 3회차의 위로에서 **5회차 인계**로 바꿨다. STEP 7 이 환경 설계이고 여기 적힌
    //   방해 요인이 그대로 그 시간의 재료가 된다. **이 회차에서는 방해에 대한 답을 주지 않는 것이 설계다.**
    blocker: {
      key: 'step_blocker',
      label: '못 하게 될 것 같은 때가 있다면 언제일까요?',
      placeholder: '야근이 늦게 끝나는 날',
      help: '여기 적어 두신 것이 다음 시간의 재료가 됩니다.',
    },
    share: {
      notice: '이번 한 걸음은 다음 시간을 열 때 이름과 함께 나눕니다.',
      toggleLabel: '이번 한 걸음은 나만 볼게요',
    },
  },
  wrap: {
    // confidence · facilitatorBox 는 3회차와 완전 동일. defaultOpen 을 두지 않는다(7회차만 true).
    confidence: {
      key: 'confidence',
      label: '이 한 걸음, 다음 시간까지 어느 정도로 해내실까요?',
      help: '낮게 적힌 숫자가 인도자에게는 가장 쓸모 있습니다. 한 걸음을 더 잘게 쪼개 드릴 수 있거든요.',
      min: 0,
      max: 10,
      leftLabel: '아직 자신 없음',
      rightLabel: '완전 성공',
    },
    facilitatorBox: {
      title: '인도자에게 하고 싶은 말',
      summary: '부탁 · 세미나 제안 · 연락 요청',
      need: { key: 'need', label: '인도자에게 부탁하고 싶은 것이 있나요?' },
      suggestion: { key: 'suggestion', label: '세미나에 대해 바라는 점이 있나요?' },
      suggestionAnon: { key: 'suggestion_anon', label: '이름 없이 전달합니다. 다만 인원이 적은 차수에서는 글의 결로 짐작될 수 있습니다.' },
      contactRequest: {
        key: 'contact_request',
        label: '인도자가 한 번 연락해 주시면 좋겠습니다',
        help: '짧은 안부 연락입니다. 코칭 세션이 아닙니다.',
      },
    },
    // label 은 회차마다 다르다 — 4회차는 **내려놓은 일**을 정면으로 인정한다.
    //   help 는 ADR-102 확정 문안이라 바꾸지 않는다(세 회차 공통).
    selfNote: {
      key: 'self_note',
      label: '오늘 많은 것을 내려놓고 하나를 고른 나에게, 한마디만 건네주세요.',
      help: '오늘의 나에게 지금 필요한 말을 적으십시오. 이 한 줄이 회차마다 쌓입니다.',
      placeholder: '다 하려다 아무것도 못 했잖아. 이번엔 하나만 하자',
    },
  },
  // save · done 은 회차 공통.
  save: {
    button: '갈무리 저장',
    notice1: '언제든 다시 열어 고쳐 쓸 수 있습니다 · 다음 시간 24시간 전까지',
    notice2: '적으신 내용은 인도자와 운영자가 읽습니다.',
  },
  done: {
    title: '갈무리를 저장했습니다.',
    stepHeading: '다음 시간까지의 한 걸음',
    toHome: '차수 홈으로',
    edit: '고쳐 쓰기',
  },
  filledCount: (a) => countFilled(REQUIRED_4, a),
  requiredTotal: REQUIRED_4.length,
  missingLabels: (a) => missingIn(REQUIRED_4, a),
  missingKeys: (a) => missingKeys(REQUIRED_4, a),
  // 나눔 후보 열 — 소리 내어 읽을 수 있는 것만. 자리는 카드 순서를 따른다(ADR-99).
  //   범주 낱말(project_area)과 날짜(project_due)는 제외한다 — **날짜는 문장이 아니다.**
  //   마감일 자체는 열람(readModel)에서 그대로 보인다.
  //   from → to 는 **인과**라 화살표가 참이다('이것이 넘어지면 저것이 넘어간다').
  //   3회차 습관 짝(교체)과 종류는 다르나 방향성이 있다는 점에서 같은 자격이다.
  summaryFields: [
    { label: '이번에 시작할 프로젝트', key: 'project_name' },
    { label: '첫 도미노', from: 'domino_what', to: 'domino_effect' },
    { label: '뒤로 미뤄 둔 것', key: 'parked' },
    { label: '인생의 원씽', key: 'onething' },
  ],
} satisfies CheckinSession;
