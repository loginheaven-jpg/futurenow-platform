// 회차 갈무리 · 6회차 문안(ADR-117 · CC_ORDER_checkin_session6 §3 + CC_MEMO_session6_corrections).
//   임의 윤문 금지 — 조사 하나 바꾸지 않는다.
//
//   STEP 9(끝에서부터 보라) + STEP 10(한 층을 얹으라) · **마지막 참여자 회차**다.
//   4·5회차가 만든 구조(back · Priors · neededBacks · group · order)를 그대로 쓰고,
//   여기서 **다중 되비추기(ADR-115)** 와 **마지막 회차 구조(ADR-116)** 둘만 새로 쓴다.
//
//   1면 순서: question(남는 것) → purpose(오늘의 질문) → identity(최상위 정체성) → mood.
//     부제를 쪼갤 수 없어 **STEP 이름으로** 묶음을 가른다(5회차와 같은 방식).
//     발주서는 옮겨 적기 둘을 붙였으나 그러면 묶음 경계가 STEP 경계와 어긋난다 —
//     문항 1·3은 STEP 9이고 문항 2는 STEP 10이다. 4회차가 pairText 를 question 앞으로 옮긴 것과 같은 판단이다.
//     슬롯 이름은 회차가 아니라 **모양**이다(ADR-90). 새 슬롯을 만들지 않는다.
//
//   되비추기 **두 자리**(둘 다 다중 · neededBacks 가 [1,2,3,4,5]):
//     ① identity 위 — 1회차 존재가치 선언문(back 5) · 2회차 인생의 한 문장(back 4)
//     ② selfNote 위 — 1~5회차 self_note 다섯 줄(back 5·4·3·2·1)
//   지금까지 최대는 4회차의 [1,2] 였다. page.tsx 가 Promise.all 로 묶어 병렬 조회한다.
//   **한 번에 여러 회차를 읽는 코어 메서드를 만들지 않는다** — 6회차 한 곳의 요구이고
//   7회차는 인도자 세션이라 참여자 카드가 없어 반복이 확인되지 않는다(ADR-94).
//
//   ★ **notice2 를 유지한다**(CC_MEMO §1). 타입은 선택이 됐으나 값은 남긴다 —
//     1~5회차 전수에 같은 문장이 있고(실측 · 바이트 동일), 여기서 빠지면
//     **6회차만 열람 주체를 안 밝히는 유일한 카드**가 되어 개인정보 동의서와 어긋난다.
//
//   ★ **열람 범위 문안은 새로 쓰지 않고 복제한다**(CC_MEMO §2 규율).
//     ADR-77 §4.3 이 '인도자와 운영자'로 확정했고, 새로 쓰면 반드시 한쪽이 빠진다.
//     share.notice 를 '인도자와 나만'으로 적었던 것이 그 실례다.
//
//   어조는 ADR-102 진취 전환 — 허락 어휘를 쓰지 않는다(copyRegression 의 BANNED 가 잠근다).
//   사진 첨부 없음 — letter_line 키를 쓰지 않으므로 LetterPhotos 가 자동으로 안 그려진다.
//
//   ── 미결 셋(CC_ORDER §8) · 착수를 막지 않는다. 나중에 문자열 한 곳씩만 고치면 된다 ──
//   ⑴ save.notice1 의 기한 — 마무리 체크 개시 시점이 정해지면 그 시점을 넣을지 판단이 온다.
//   ⑵ step_companion 의 90일 리마인드 — 다음 회차가 없어 회수 장치가 없다. 별건 발주.
//   ⑶ 책 페이지(246~251 · 256~263 · 264~267 · 274~279) — 쇄가 바뀌면 어긋난다.
import type { CheckinSession } from './index';
import { countFilled, missingIn, missingKeys, type RequiredGroup } from './required';

// 필수 6칸. 라벨은 화면 문안과 **같은 문자열**이다(ADR-91 — 결측 안내가 그대로 읽어 준다).
//   세지 않는 것: biggest_regret(보이는 선택) · love_person·love_act(심화) ·
//   last_step_note · step_blocker · step_companion · confidence · 인도자 상자.
//   ★ step_companion 을 세지 않는 이유 — 이 회차 설계상 가장 지키고 싶은 칸이지만
//     이름을 못 대는 참여자가 반드시 있고 그때 제출이 막힌다.
//     **마지막 회차에서 제출을 막는 대가가 얻는 것보다 크다.**
const REQUIRED_6: RequiredGroup[] = [
  { fields: [{ key: 'carry_today', label: '인생의 마지막 자리에서 보고, 오늘로 가져오기로 하신 한 가지를 옮겨 주세요. (책 246~251쪽)' }] },
  { fields: [{ key: 'hope_statement', label: '오늘 새로 쓰신 소망 한 문장을 그대로 옮겨 주세요. (책 278~279쪽)' }] },
  { kind: 'list', fields: [{ key: 'mood', label: '이 시간을 마치고 나온 지금, 마음은 어떤가요?', altKey: 'mood_custom' }] },
  { fields: [{ key: 'last_step_result', label: '지난 한 걸음은 어떻게 되었나요?' }] },
  {
    fields: [
      { key: 'step_what', label: '무엇을 하시겠어요?' },
      { key: 'step_when', label: '언제, 어디서 하시겠어요?' },
    ],
  },
  { fields: [{ key: 'self_note', label: '여섯 주를 걸어온 나에게, 마지막으로 한마디 건네주세요.' }] },
];

export const CHECKIN_SESSION_6 = {
  sessionNo: 6,
  cover: {
    brand: 'FUTURE NOW · 6회차',
    title: '오늘의 갈무리',
    subtitle: '끝에서부터 오늘을 다시 보다',
    counter: (n: number) => `필수 6칸 중 ${n}칸 채움 · 약 5분`,
    band: '여섯 주를 걸어온 오늘, 마지막으로 한 줄을 남깁니다.',
  },
  today: {
    order: ['question', 'purpose', 'identity', 'mood'],
    // ① 문항 1 — **오늘로 가져올 한 가지**(v3 §3). 인도자가 즉석에서 **두 번** 만든 전환이라
    //   구조로 넣는다. 관통 프레임('끝에서부터 오늘을 다시 본다')이 실제로 착지하는 유일한 칸이다.
    //   placeholder 를 두지 않는다 — 이 칸에 예시를 두면 남의 답이 정답이 된다.
    question: {
      group: '마지막 자리에서 보고',
      key: 'carry_today',
      label: '인생의 마지막 자리에서 보고, 오늘로 가져오기로 하신 한 가지를 옮겨 주세요. (책 246~251쪽)',
      help: '오늘 적어 두신 것을 옮기셔도 좋고, 지금 떠오른 것을 적으셔도 좋습니다.',
    },
    // ② 문항 3 — 오늘의 질문 · 보이는 선택. **세계관 비교를 뺐다**(v3 §2).
    //   그 활동은 차수 구성에 따라 **꺼지는 활동**이 됐다(스크립트북: 「인도자 재량 — 방을 보라」).
    //   꺼질 수 있는 활동을 카드가 물으면 절반이 빈다. 대신 **반드시 진행되는** 후회 질문을 놓는다.
    //   ★ **선택으로 둔다** — 후회는 이틀 뒤 혼자 열었을 때 정서적으로 가장 무거운 칸이다.
    //     현장에서도 자원자만 받도록 스크립트북에 적었고, 카드도 같은 원칙을 따른다.
    //   love_person 과 답이 겹칠 수 있으나 하나는 후회이고 하나는 이번 주 행동이라 **층이 다르다.**
    purpose: {
      group: '마지막 자리에서 보고',
      title: '오늘의 질문',
      badge: '선택',
      help: '무겁게 느껴지시면 비워 두고 넘어가셔도 됩니다.',
      fields: [
        {
          key: 'biggest_regret',
          label: '인생의 마지막 자리에 서서 보니, 무엇을 가장 후회할 것 같았습니까? (책 246~251쪽)',
        },
      ],
    },
    // ③ 문항 2 — **나에게 주어진 소망**(v3 §3). **다중 되비추기가 붙는 첫 자리**(ADR-115).
    //   caption 을 두지 않는다 — 두 항목의 캡션이 서로 다르다.
    //   키는 레포 실물에서 확인했다(session1.ts identity_sentence · session2.ts identity_statement).
    //   ★ **3단 축적이 끊기지 않는다** — 실측 답이 전부 "~하는 사람이 되고 싶다" 형태였다.
    //     소망 선언은 형태상 정체성 진술이라 존재가치 선언문 → 인생의 한 문장 → 소망 선언이 한 계열이다.
    identity: {
      group: '소망을 받아 들고',
      key: 'hope_statement',
      label: '오늘 새로 쓰신 소망 한 문장을 그대로 옮겨 주세요. (책 278~279쪽)',
      help: '여섯 주 동안 세 번째로 쓰는 문장입니다. 종료 리포트가 셋을 나란히 놓습니다.',
      placeholder: '나는 ______ 사람으로 살아가기를 소망합니다',
      mirrors: {
        items: [
          { label: '첫 시간에 쓰신 존재가치 선언문', keys: ['identity_sentence'], back: 5 },
          { label: '두 번째 시간에 쓰신 인생의 한 문장', keys: ['identity_statement'], back: 4 },
        ],
      },
    },
    // ④ 오늘의 마음 — 묶음 밖(group 없음). 회차 전체에 대한 물음이다.
    //   앞 다섯이 1~5회차와 **문자열 기준으로 겹치지 않는다**(session6.test.ts 가 잠근다).
    //   '평안함'은 STEP 10의 '여유가 아니라 평안'과 호응하고,
    //   '시원섭섭함'과 '허전함'은 여정이 끝나는 자리의 양가감정을 나눠 받는다.
    //   ★ **'숙연함'을 뺐다**(v3 §3) — 설계자가 예상한 정서이지 실제 정서가 아니었다.
    //     실측에서 죽음 나눔은 무겁지 않았고 세션 전체의 지배적 정서는 감사·기대·아쉬움이었다.
    //     대신 **'기대감'** 을 넣는다 — 소회에서 앞을 보는 발화가 뚜렷했다.
    //   어감 겹침은 허용한다 — 문자열까지 겹치지 않게 하면 쓸 낱말이 남지 않는다.
    //   정서 균형: 부정 쪽은 '허전함' 하나('시원섭섭함'은 양가)라 기준(다섯 중 셋 미만)을 통과한다.
    mood: {
      key: 'mood',
      label: '이 시간을 마치고 나온 지금, 마음은 어떤가요?',
      help: '두 개까지 고르실 수 있습니다.',
      options: ['뭉클함', '평안함', '기대감', '시원섭섭함', '허전함', '딱 맞는 말이 없음'],
      exclusive: '딱 맞는 말이 없음',
      max: 2,
    },
    moodCustom: { key: 'mood_custom', placeholder: '직접 쓰기 (선택)', promptPlaceholder: '그럼, 지금 마음에 가까운 말을 한마디로 적어 주세요' },
  },
  // 심화 — 문항 4 · 오늘의 한 사람. deepen 은 타입상 필수 블록이라 6회차도 반드시 하나를 갖는다.
  //   발주서는 이것을 1면 '보이는 선택'으로 뒀으나 1면 슬롯이 이미 넷이고,
  //   새 슬롯을 만드는 것보다 심화가 싸다.
  //   love_person 에 help 를 두지 않는다 — placeholder 가 관계로 적어도 된다는 것을 이미 보여 준다.
  deepen: {
    title: '여섯 주가 닿는 자리',
    summary: '이번 주에 만날 한 사람',
    fields: [
      // 실측에서 사흘 답의 거의 전부가 사람이었고 스크립트북 블록 8이 그것을 회수한다 — 카드도 같은 다리를 쓴다(v3 §3).
      { key: 'love_person', label: '사흘이 남았다면 만나고 싶은 그 한 사람은 누구입니까? (책 274~279쪽)', placeholder: '어머니' },
      {
        key: 'love_act',
        label: '그 사람에게 할 가장 작은 한 가지',
        help: '문자 한 줄이 이 회차의 착지점입니다. 크기가 아니라 이번 주 안에 하느냐가 결과를 만듭니다.',
        placeholder: '안부 문자 보내기',
      },
    ],
  },
  step: {
    // ⑤ 지난 한 걸음. 선택지 다섯은 5회차가 신설한 것을 그대로 잇는다.
    //   empty 를 두지 않는다 — 6회차까지 온 참여자에게 "이번 회차부터 쌓입니다"는 틀린 말이고,
    //   값이 없으면 상자를 안 그리는 편이 낫다.
    lastStep: {
      key: 'last_step_result',
      label: '지난 한 걸음은 어떻게 되었나요?',
      options: ['했습니다', '조금 했습니다', '잊고 지냈습니다', '하려다 막혔습니다', '크기나 내용을 바꿨습니다'],
      note: { key: 'last_step_note', label: '한 줄만 덧붙여 주세요', help: '여기 정직하게 적는 것이 앞으로 90일을 바꿉니다.' },
      mirror: { label: '지난 시간의 한 걸음', keys: ['step_what', 'step_when'] },
    },
    // ⑥ 90일 한 걸음. **다음 시간이 없다** — 그래서 기한을 90일로 잡고 함께 볼 사람을 정한다(ADR-116).
    title: '앞으로 90일 동안 이어 갈 한 걸음을 정합니다.',
    help: '다음 모임이 없습니다. 그래서 기한을 90일로 잡고, 아래에서 함께 볼 사람을 정합니다.',
    what: { key: 'step_what', label: '무엇을 하시겠어요?' },
    when: {
      key: 'step_when',
      label: '언제, 어디서 하시겠어요?',
      placeholder: '토요일 아침, 집 앞 카페에서',
      help: '이미 하고 있는 행동 뒤에 붙이면 90일을 견딥니다.',
    },
    blocker: {
      key: 'step_blocker',
      label: '못 하게 될 것 같은 때가 있다면 언제일까요?',
      placeholder: '일이 몰리는 달',
      help: '미리 적어 두면 그 순간에 덜 무너집니다.',
    },
    // ★ 마지막 회차 전용(ADR-116). **세미나가 「의지가 아니라 설계」를 가르쳐 놓고
    //   마지막 날 구조 없이 각자 돌려보내면 앞뒤가 맞지 않는다.**
    companion: {
      key: 'step_companion',
      label: '이 걸음을 함께 봐 줄 한 사람의 이름을 적으십시오.',
      help: '이 과정에서 만난 분이든 원래 알던 분이든 상관없습니다. 이름 한 칸이 90일을 지탱합니다.',
    },
    // ★ 열람 범위는 **복제한다**(CC_MEMO §2) — ADR-77 §4.3 이 '인도자와 운영자'로 확정했다.
    //   toggleLabel 없음 → CheckRow 가 그려지지 않는다(ADR-116). **고지는 남는다.**
  },
  wrap: {
    confidence: {
      key: 'confidence',
      label: '이 한 걸음, 90일 동안 어느 정도로 해내실까요?',
      help: '낮게 적힌 숫자가 인도자에게는 가장 쓸모 있습니다. 종료 뒤 연락의 우선순위가 됩니다.',
      min: 0,
      max: 10,
      leftLabel: '아직 자신 없음',
      rightLabel: '완전 성공',
    },
    // 5회차와 같되 둘이 다르다 — defaultOpen 과 suggestion.help.
    //   **마지막 참여자 회차라 펼쳐 둔다** — 여기 적히는 것이 다음 회기 설계에 그대로 들어간다.
    facilitatorBox: {
      title: '인도자에게 하고 싶은 말',
      summary: '부탁 · 세미나 제안 · 연락 요청',
      defaultOpen: true,
      need: { key: 'need', label: '인도자에게 부탁하고 싶은 것이 있나요?' },
      suggestion: {
        key: 'suggestion',
        label: '세미나에 대해 바라는 점이 있나요?',
        help: '이번이 마지막입니다. 여기 적히는 것이 다음 회기 설계에 그대로 들어갑니다.',
      },
      suggestionAnon: { key: 'suggestion_anon', label: '이름 없이 전달합니다. 다만 인원이 적은 차수에서는 글의 결로 짐작될 수 있습니다.' },
      contactRequest: {
        key: 'contact_request',
        label: '인도자가 한 번 연락해 주시면 좋겠습니다',
        help: '짧은 안부 연락입니다. 코칭 세션이 아닙니다.',
      },
    },
    // ★ 마지막 한마디 — **다중 되비추기가 붙는 둘째 자리**(ADR-115).
    //   help 를 두지 않는다 — 1~5회차의 help 는 무엇을 적을지 알려 주는 자리인데,
    //   6회차는 **다섯 줄의 자기 문장이 그 일을 대신한다.**
    //   placeholder 도 두지 않는다 — 다섯 줄을 읽은 다음이라 예시가 필요 없고,
    //   예시를 두면 그 여섯 번째가 남의 문장이 된다.
    selfNote: {
      key: 'self_note',
      label: '여섯 주를 걸어온 나에게, 마지막으로 한마디 건네주세요.',
      mirrors: {
        caption: '지금까지 나에게 준 말들',
        items: [
          { label: '1회차', keys: ['self_note'], back: 5 },
          { label: '2회차', keys: ['self_note'], back: 4 },
          { label: '3회차', keys: ['self_note'], back: 3 },
          { label: '4회차', keys: ['self_note'], back: 2 },
          { label: '5회차', keys: ['self_note'], back: 1 },
        ],
      },
    },
  },
  save: {
    button: '갈무리 저장',
    // notice1 에 기한이 없다 — 다음 시간이 없기 때문이다(미결 ⑴).
    notice1: '언제든 다시 열어 고쳐 쓸 수 있습니다',
    // ★ notice2 는 **유지한다**(CC_MEMO §1). 1~5회차와 바이트 동일.
  // ★ **열람 고지를 화면에서 걷었다**(지휘부 판정 2026-09-02).
  //
  //   지우는 이유가 「고지를 안 한다」가 아니다 — **고지 자리를 옮긴 것**이다.
  //   누가 읽는지는 **모집 자료와 세미나 진행 중에 이미 공지된다**(`recruit` 의 `ONLINE.foot`
  //   가 지금도 인도자·운영자를 명시한다). 그런데 **쓰는 순간에 또 보이면 자기검열이 생긴다** —
  //   솔직히 적어야 값이 나오는 칸에서 「누가 본다」를 되뇌게 하면 표현의 자유도를 깎는다.
  //
  //   **정책은 한 글자도 안 바뀌었다.** 인도자·운영자는 전과 똑같이 읽는다.
  //   바뀐 것은 **그 사실을 언제 말하는가**뿐이다.
  //   **되살리지 마라** — 없어서 빠진 것이 아니라 **일부러 뺀 것**이고, 잠금이 그것을 지킨다.
  },
  done: {
    title: '갈무리를 저장했습니다.',
    stepHeading: '앞으로 90일의 한 걸음',
    toHome: '회기 홈으로',
    edit: '고쳐 쓰기',
  },
  filledCount: (a) => countFilled(REQUIRED_6, a),
  requiredTotal: REQUIRED_6.length,
  missingLabels: (a) => missingIn(REQUIRED_6, a),
  missingKeys: (a) => missingKeys(REQUIRED_6, a),
  // 나눔 후보 열. love_person 을 넣지 않는다 — **제3자의 이름이 들어가는 유일한 칸**이라
  //   나눔 화면에 올리지 않는다. 저장은 하고 개인 상세에만 남는다.
  //   step_companion 도 같은 이유로 넣지 않는다.
  //   worldview_seen 은 선택 칸이라 비는 자리가 있으나 **비어 있을 가능성은 배제 사유가 아니다**(ADR-99).
  summaryFields: [
    { label: '오늘로 가져올 한 가지', key: 'carry_today' },
    { label: '나에게 주어진 소망', key: 'hope_statement' },
    { label: '가장 후회할 것', key: 'biggest_regret' },
    { label: '이번 주의 한 가지', key: 'love_act' },
  ],
} satisfies CheckinSession;
