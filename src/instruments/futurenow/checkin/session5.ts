// 회차 갈무리 · 5회차 문안(ADR-108 · CC_ORDER_checkin_session5 §3 + 정정 메모 둘). 임의 윤문 금지 — 조사 하나 바꾸지 않는다.
//   STEP 7(환경을 설계하라) + STEP 8(신호를 만들라) · WILL 파트. **세 번째 이중 STEP 회차**다.
//   4회차가 만든 구조(back · Priors · neededBacks · pairText · group · order)를 그대로 쓴다. 새 위젯 0.
//
//   1면 순서: identity(환경) → pairText(트리거) → question(사면) → mood.
//     areaPick 이 없다 — 5회차에 영역 선택이 없다. order 는 존재하는 슬롯만 담는다.
//     문항 1을 identity 슬롯에 담는 이유는 **슬롯 이름이 회차가 아니라 모양을 가리키기 때문**이다(ADR-90).
//     identity 의 모양은 '라벨 + 짧은 서술 상자(2행) + 되비추기'이고 5회차 문항 1이 정확히 그 모양이다.
//     새 슬롯을 만들면 4~7회차마다 슬롯이 늘어 레지스트리를 만든 이유가 사라진다.
//
//   되비추기 **두 곳**(둘 다 back:1 → neededBacks 가 [1] · 4회차보다 왕복이 하나 준다):
//     ① identity 위 — 4회차 step_blocker('못 하게 될 때')
//     ② lastStep 위 — 4회차 step_what · step_when · **domino_what**
//   ②에 첫 도미노를 합친 것이 정정 메모의 판정이다. 원안은 '다음 한 걸음' 블록 위에 따로 되비추려 했으나
//     CheckinSession['step'] 에는 mirror 가 없고(lastStep 안에만 있다) 렌더도 neededBacks 도 세 자리만 훑는다.
//     타입·순수함수·컴포넌트·미리보기 넷을 고쳐야 성립하는데 그것은 문안 작업이 아니다.
//     step.mirror 를 일반화하지 않은 이유는 ADR-94 기준이다 — **반복이 확인되지 않은 일반화는 하지 않는다.**
//     6회차가 또 요구하면 그때 ADR로 세운다. 합쳐 두면 위(지난 것)와 아래(다음 것)를 한 상자에서 대조하게 된다.
//
//   step_blocker 를 4회차와 같은 키로 다시 쓴다. 4회차가 '다음 시간의 재료가 됩니다'로 넘겼고 **그 재료를
//     받는 회차가 여기**다. 5회차는 그것을 되비추기로 읽고 자기 step_blocker 는 다시 6회차로 넘긴다.
//     키가 같아도 회차 행이 다르므로 덮어쓰지 않는다(ADR-103 봉투 분리).
//
//   domino_if·domino_then 을 trigger_if·trigger_then 과 가른다. 앞은 첫 도미노에 거는 트리거(심화),
//     뒤는 생활 습관 트리거(필수)다. 한 칸에 덮어쓰면 그 이층 구조가 사라진다.
//
//   어조는 ADR-102 진취 전환 — 허락 어휘를 쓰지 않는다(copyRegression 의 BANNED 가 잠근다).
//   사진 첨부 없음 — letter_line 키를 쓰지 않으므로 LetterPhotos 가 자동으로 안 그려진다. 코드를 바꾸지 않는다.
//   단톡방을 문안에 언급하지 않는다 — 채널이 카드 안에서 보이면 참여자가 어디에 쓸지 고민한다.
import type { CheckinSession } from './index';
import { countFilled, missingIn, missingKeys, type RequiredGroup } from './required';

// 필수 6칸 — 환경 한 줄 · 트리거 짝 · 마음 · 지난걸음 · 다음걸음쌍 · 나에게.
//   relief(서술)·ask_person·domino_*(심화)·last_step_note·step_blocker·confidence 는 세지 않는다.
//   **트리거를 두 칸으로 가른 것은 구조 강제**다. 한 칸으로 받으면 상당수가 '밤에 폰 안 보기'처럼
//   신호 없는 다짐을 쓴다. 트리거는 신호가 있어야 트리거이므로 칸을 갈라 신호를 못 건너뛰게 한다
//   — 3회차 습관 짝·4회차 도미노 짝과 같은 장치다.
//   라벨은 아래 문안과 **같은 문자열**이다(결측 안내가 이걸 그대로 읽어 준다 · ADR-91).
const REQUIRED_5: RequiredGroup[] = [
  { fields: [{ key: 'env_change', label: '오늘 바꾸기로 하신 환경 하나를 그대로 옮겨 적어 주세요. (책 210~213쪽)' }] },
  { fields: [
    { key: 'trigger_if', label: '만약' },
    { key: 'trigger_then', label: '나는' },
  ] },
  // ADR-101: 직접 쓰기(mood_custom)만 채워도 '마음'이 찬 것으로 본다. 3회차부터의 규칙을 그대로 잇는다.
  { kind: 'list', fields: [{ key: 'mood', label: '이 시간을 마치고 나온 지금, 마음은 어떤가요?', altKey: 'mood_custom' }] },
  { fields: [{ key: 'last_step_result', label: '지난 한 걸음은 어떻게 되었나요?' }] },
  { fields: [
    { key: 'step_what', label: '무엇을 하시겠어요?' },
    { key: 'step_when', label: '언제, 어디서 하시겠어요?' },
  ] },
  { fields: [{ key: 'self_note', label: '이번 주를 살아낼 나에게, 한마디만 건네주세요.' }] },
];

export const CHECKIN_SESSION_5 = {
  sessionNo: 5,
  cover: {
    brand: 'FUTURE NOW · 5회차',
    title: '오늘의 갈무리',
    subtitle: '의지가 아니라 설계',
    counter: (n: number) => `필수 6칸 중 ${n}칸 채움 · 약 5분`,
    band: '오늘 짠 설계를, 잊히기 전에 자리에 놓아 둡니다.',
    // firstVisitOnce 없음 — 1회차에서 이미 안내.
  },
  today: {
    // 부제 '의지가 아니라 설계'는 쪼갤 수 없어 **STEP 이름으로** 묶음을 가른다.
    order: ['identity', 'pairText', 'question', 'mood'],
    // ① 오늘 바꾼 환경 — 필수. 이 회차 산출물 중 **유일하게 오늘 밤 안에 물리적으로 실행 가능한 것**이다.
    //   골든타임은 발견이고 경로표는 계획이지만 이것은 손으로 옮기면 끝난다.
    //   4회차 step_blocker 는 선택이라 비워 둔 사람이 있고, empty 를 두지 않아 그때는 상자가 안 그려진다.
    identity: {
      group: '환경을 바꾸고',
      key: 'env_change',
      label: '오늘 바꾸기로 하신 환경 하나를 그대로 옮겨 적어 주세요. (책 210~213쪽)',
      // '하나면 됩니다'는 허락이 아니라 **사실 진술**이다(원칙 §4) — 몇 개를 적어야 하는지를 말한다.
      help: '가까이 두기로 한 것이든 멀리 두기로 한 것이든, 하나면 됩니다.',
      placeholder: '자기 전에 휴대폰을 거실 서랍에 둔다',
      mirror: { label: '지난 시간에 적으신 「못 하게 될 것 같은 때」', keys: ['step_blocker'] },
    },
    // ② 만약 → 나는 — 필수. connector 가 가로 화살표인 이유: 3회차 '↓ 그 자리에'(교체)·
    //   4회차 '↓ 그것이 넘어지면'(인과)과 달리 이것은 **조건**이라 방향 기호를 가로로 둔다.
    pairText: {
      group: '신호를 만들다',
      label: "오늘 만드신 '만약 → 나는' 한 줄을 옮겨 적어 주세요. (책 230~231쪽)",
      // 허락이 아니라 **값**으로 말한다 — 이렇게 적으면 무엇이 좋아지는지.
      help: "시각이 아니라 '무엇을 하고 난 다음'으로 적으면 더 잘 켜집니다.",
      from: { key: 'trigger_if', label: '만약', placeholder: '저녁 설거지를 끝내면' },
      connector: '→ 그러면',
      to: { key: 'trigger_then', label: '나는', placeholder: '스쿼트 스무 개를 한다' },
    },
    // ③ 오늘의 질문 — 보이는 선택. 이 회차의 정서적 전환점(블록 1의 사면)은 **워크북에 기입란이 없다.**
    //   강의와 나눔으로만 지나가므로 종이에 안 남는다 — **카드가 유일한 회수 지점이다.**
    //   방향을 위로 둔다: 못 한 것을 묻지 않고 짐이 내려간 순간을 묻는다.
    question: {
      group: '신호를 만들다',
      key: 'relief',
      label: "'그건 내가 부족해서가 아니었구나' 싶었던 순간이 오늘 있었다면, 하나만 적어 주세요. (책 202~207쪽)",
      help: '떠오른 그대로 적으십시오. 문장이 되지 않아도 그 자리에 남습니다.',
      badge: '선택',
    },
    // ④ 오늘의 마음 — 묶음 밖(group 없음). 이 회차에는 직면 단계가 없다.
    //   **면죄(블록 1)와 적재(블록 3~8)** 가 있고, 앞의 셋이 면죄와 설계의 감정, 뒤의 둘이 적재의 감정이다.
    //   '가뿐함'이 안 나오면 블록 1이 작동하지 않은 것이다 — 인도자에게 가장 값진 신호다.
    //   앞 다섯이 1·2·3·4회차와 문자열 기준으로 겹치지 않는다(session5.test.ts 가 잠근다).
    //   원안의 '홀가분함'은 3회차, '든든함'은 4회차와 문자열이 같아 각각 '가뿐함'·'단단함'으로 바꿨다.
    //   어감 겹침은 허용한다 — 문자열까지 겹치지 않으면 6·7회차에서 쓸 낱말이 남지 않는다.
    mood: {
      key: 'mood',
      label: '이 시간을 마치고 나온 지금, 마음은 어떤가요?',
      help: '두 개까지 고르실 수 있습니다.',
      options: ['가뿐함', '단단함', '의욕', '부담스러움', '조바심', '딱 맞는 말이 없음'],
      exclusive: '딱 맞는 말이 없음',
      max: 2,
    },
    moodCustom: { key: 'mood_custom', placeholder: '직접 쓰기 (선택)', promptPlaceholder: '그럼, 지금 마음에 가까운 말을 한마디로 적어 주세요' },
  },
  deepen: {
    // 심화 **두 칸**. 135분 최종안에서 활동 4의 위 두 칸이 집으로 갔고 카드가 그 자리를 받는다.
    //   ②는 두 칸 입력이나 deepen.fields 는 pairText 형태를 지원하지 않으므로 **라벨 둘을 가진 인접 필드 둘**로 둔다.
    //   새 위젯을 만들지 않는다. 책 참조를 ②에 붙이지 않는 이유는 pairText 에 같은 쪽수가 이미 있고,
    //   '만약'과 '나는' 사이에 참조가 끼면 짝 읽기가 끊기기 때문이다.
    title: '여기서부터가 진짜입니다',
    summary: '방 밖의 한 사람 · 첫 도미노에 거는 신호',
    fields: [
      {
        key: 'ask_person',
        label: '이번 주에 나를 끌어올려 줄 한 분께, 무엇을 부탁하시겠어요? (책 216~221쪽)',
        // 앞은 사실 진술, 뒤는 값이다. 실행 동행은 인도자가 배정하므로 카드가 다시 묻지 않고,
        //   대신 **방 밖의 한 사람**을 묻는다 — 세미나가 끝난 뒤에도 남는 것은 이쪽이다.
        help: '아직 말씀 안 하셨어도 됩니다. 여기서 문장만 먼저 만들어 두면 꺼내기 쉬워집니다.',
      },
      {
        key: 'domino_if',
        label: '오늘 만든 신호를 이번엔 첫 도미노에 걸어 본다면 — 만약',
        // 심화 필드의 placeholder 는 **5회차가 처음 쓴다**(1~4회차 심화는 선언 0건). 그래서 심화 렌더가
        //   TextArea 에 placeholder 를 넘기지 않던 결손이 여기서 드러났고, ADR-109 가 그 한 줄을 열었다.
        //   착수 시에는 §9 가 렌더 경로 변경 0을 못 박아 고치지 않고 판단을 청했고, 지휘부가 승인했다.
        placeholder: '월요일 아침 사무실에 앉으면',
      },
      {
        key: 'domino_then',
        label: '나는',
        placeholder: '그 자료를 30분 먼저 연다',
        // 현장에서 만들지 않는 것은 의도다. 첫 도미노에 거는 트리거는 무겁고,
        //   **이틀 뒤 혼자 앉아서 쓰는 편이 오히려 정확하다.**
        help: '오늘 모임에서는 가벼운 것으로 연습했습니다. 이건 그 연습을 진짜에 옮기는 자리입니다.',
      },
    ],
  },
  step: {
    // ⑤ 지난 한 걸음 결산 — **선택지 다섯.** 다섯째를 신설한다.
    //   1기에서 한 참여자가 몸 상태 때문에 프로젝트를 통째로 바꿨고 인도자가 그것을 성공으로 인정했다.
    //   다른 참여자는 목표 크기 자체가 처음부터 과했다. **넷 중에는 그 경우가 들어갈 자리가 없다.**
    //   조정은 실패가 아니라 설계다 — 이 회차의 주제와도 맞는다.
    //   1~4회차는 넷으로 응답이 이미 쌓였으므로 **그 회차 문안을 건드리지 않는다**(ADR-91 R1).
    //   다섯의 시각적 무게를 같게 둔다 — 새 선택지에 강조·표시·색을 붙이지 않는다.
    //   되비추기가 4회차 한 걸음에 **첫 도미노까지** 함께 읽는다(위 머리말 참조).
    lastStep: {
      key: 'last_step_result',
      label: '지난 한 걸음은 어떻게 되었나요?',
      options: ['했습니다', '조금 했습니다', '잊고 지냈습니다', '하려다 막혔습니다', '크기나 내용을 바꿨습니다'],
      note: { key: 'last_step_note', label: '한 줄만 덧붙여 주세요', help: '여기 정직하게 적는 것이 다음 한 주를 바꿉니다.' },
      mirror: {
        label: '지난 시간의 한 걸음과 첫 도미노',
        keys: ['step_what', 'step_when', 'domino_what'],
        empty: '이번 회차부터 한 걸음이 쌓입니다.',
      },
    },
    // ⑥ 다음 한 걸음. help 가 **세 층을 눈에 보이게 가른다** — 1면은 물건과 생활 습관, 2면은 첫 도미노다.
    title: '다음 시간까지 할 작은 실천 하나를 정해 봅시다.',
    help: '오늘 활동 5에 적으신 2주차 칸이 곧 이번 주입니다. 그대로 옮기십시오.',
    // what.help 를 두지 않는다 — 4회차가 '계획이 아니라 동작'을 이미 가르쳤고,
    //   여기서는 '2주차 칸을 옮기라'는 더 구체적인 지시가 위에 있다.
    what: { key: 'step_what', label: '무엇을 하시겠어요?' },
    when: {
      key: 'step_when',
      label: '언제, 어디서 하시겠어요?',
      placeholder: '토요일 아침, 집 앞 카페에서',
      help: "이미 하고 있는 행동 뒤에 붙이면 훨씬 잘 켜집니다. '양치한 다음'처럼요.",
    },
    // blocker.help 를 3회차 문안으로 되돌린다. 4회차는 '다음 시간의 재료가 됩니다'였는데
    //   **그 재료를 받는 회차가 지금**이다. 5회차가 또 넘기면 약속이 이월만 된다.
    blocker: {
      key: 'step_blocker',
      label: '못 하게 될 것 같은 때가 있다면 언제일까요?',
      placeholder: '야근이 늦게 끝나는 날',
      help: '미리 적어 두면 그 순간에 덜 무너집니다.',
    },
    share: {
      notice: '이번 한 걸음은 다음 시간을 열 때 이름과 함께 나눕니다.',
      toggleLabel: '이번 한 걸음은 나만 볼게요',
    },
  },
  wrap: {
    // confidence · facilitatorBox 는 4회차와 완전 동일. defaultOpen 을 두지 않는다(7회차만 true).
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
    // 앞의 회차들이 과거의 나·오늘의 나에게 말을 건넸다면 **5회차는 앞을 본다.**
    //   WILL 파트의 정체성이 이 한 줄에 들어 있다. help 는 ADR-102 확정 문안이라 바꾸지 않는다.
    selfNote: {
      key: 'self_note',
      label: '이번 주를 살아낼 나에게, 한마디만 건네주세요.',
      help: '오늘의 나에게 지금 필요한 말을 적으십시오. 이 한 줄이 회차마다 쌓입니다.',
      placeholder: '설계는 끝났다. 이제 켜기만 하면 된다',
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
  filledCount: (a) => countFilled(REQUIRED_5, a),
  requiredTotal: REQUIRED_5.length,
  missingLabels: (a) => missingIn(REQUIRED_5, a),
  missingKeys: (a) => missingKeys(REQUIRED_5, a),
  // 나눔 후보 열 — **나눌 수 있는 문장만.** domino_if·domino_then 은 심화 두 칸이고 첫 도미노에 걸리는
  //   개인 계획이라 나눔 재료로 약하다(개인 상세에는 남는다).
  //   relief 는 선택 칸이라 비는 자리가 있으나 **비어 있을 가능성은 배제 사유가 아니다**(ADR-99) —
  //   이 회차에서 가장 나눌 만한 문장이 여기 나온다.
  //   from → to 는 **조건**이라 화살표가 참이다('이것을 하면 저것을 한다').
  summaryFields: [
    { label: '바꾼 환경', key: 'env_change' },
    { label: '만약 → 나는', from: 'trigger_if', to: 'trigger_then' },
    { label: '내려놓은 자책', key: 'relief' },
    { label: '부탁할 한마디', key: 'ask_person' },
  ],
} satisfies CheckinSession;
