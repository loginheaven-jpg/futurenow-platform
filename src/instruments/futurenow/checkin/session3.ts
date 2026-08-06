// 회차 갈무리 · 3회차 문안(ADR-90 · CC_ORDER_checkin_session3 §4). 임의 윤문 금지 — 조사 하나 바꾸지 않는다.
//   STEP 3(현재 직면) + STEP 4(습관 재구성)를 한 카드에 담는 **첫 이중 STEP 회차**다.
//   1면 안에서 화제가 한 번 바뀌므로 표지 부제를 쪼개 묶음 이정표(group)로 쓴다 — 새 어휘도 STEP 용어 노출도 없다.
//   되비추기 세 곳: ①(2회차 영역+문장) · 심화①(2회차 인생의 한 문장) · ⑤(2회차 한 걸음).
//   책 페이지 참조는 **미확정이라 붙이지 않는다**(ADR-88·89 정책: 확정된 값만 카드에 오른다).
//     확정되면 이 파일의 label 문자열에 문장 끝 괄호로 더한다. 대상 다섯 곳:
//     gap_area · stuck_named · identity_gap · pairText(습관 짝) · speech_habit
import type { CheckinSession } from './index';

// 필수 6칸 — 영역쌍 · 습관짝 · 마음 · 지난걸음 · 다음걸음쌍 · 나에게.
//   stuck_named(서술)·confidence·last_step_note·심화 두 칸은 세지 않는다.
//   이중 STEP 이라 옮겨 적기가 둘이어서 필수가 하나 늘 자리인데, 그 증가분을 서술 질문에서 회수한다 —
//   옮겨 적기는 이미 쓴 것의 이관이라 값이 싸고, 서술은 비싸기 때문이다.
function filledCount3(answers: Record<string, unknown>): number {
  const has = (k: string) => typeof answers[k] === 'string' && (answers[k] as string).trim() !== '';
  const mood = Array.isArray(answers.mood) && (answers.mood as unknown[]).length > 0;
  let n = 0;
  if (has('gap_area') && has('gap_want')) n += 1;
  if (has('habit_stop') && has('habit_start')) n += 1;
  if (mood) n += 1;
  if (has('last_step_result')) n += 1;
  if (has('step_what') && has('step_when')) n += 1;
  if (has('self_note')) n += 1;
  return n;
}

export const CHECKIN_SESSION_3 = {
  sessionNo: 3,
  cover: {
    brand: 'FUTURE NOW · 3회차',
    title: '오늘의 갈무리',
    subtitle: '현재를 직면하고, 습관을 다시 짜다',
    counter: (n: number) => `필수 6칸 중 ${n}칸 채움 · 약 5분`,
    band: '오늘 확인한 거리와, 오늘 바꾸기로 한 하나를 적어 둡니다.',
    // firstVisitOnce 없음 — 1회차에서 이미 안내.
  },
  today: {
    // 1면 순서: 영역(직면) → 오늘의 질문(직면) → 습관 짝(재구성) → 마음(묶음 밖).
    order: ['areaPick', 'question', 'pairText', 'mood'],
    // ① 간절한 영역 — 필수. future_area 를 재사용하지 않는다:
    //   2회차는 '가장 가슴 뛴 영역', 3회차는 '가장 간절한 영역'이다. 둘이 다를 때가 인도자에게 가장 값진
    //   정보인데 같은 키를 쓰면 그 차이가 덮인다.
    areaPick: {
      group: '현재를 직면하고',
      key: 'gap_area',
      label: '오늘 다섯 영역에 점수를 매기셨지요. 그중 지금 가장 간절한 영역 하나를 골라 주세요.',
      help: '간격이 가장 크게 벌어진 자리입니다. 크다는 것은 그만큼 바라고 있다는 뜻이에요.',
      options: ['일', '재정', '관계', '건강', '기여'],
      line: { key: 'gap_want', label: '그 영역에서 지금 가장 바라는 것 한 가지는' },
      mirror: { label: '지난 시간에 가장 가슴이 뛴다고 고르신 영역', keys: ['future_area', 'future_line'] },
    },
    // ② 오늘의 질문 — 보이는 선택. 접힘으로 감싸지 않는다(그 회차의 핵심 경험을 받는 자리).
    //   '함정' 같은 판정어를 쓰지 않는다 — 카드는 이틀 뒤 혼자 열리고 그때 판정어는 자기 낙인이 된다.
    question: {
      group: '현재를 직면하고',
      key: 'stuck_named',
      label: '오늘 나를 제자리에 붙잡아 두고 있던 것은 무엇이었나요?',
      help: '이름을 붙여 보셨다면 그 이름을 그대로 적으셔도 좋습니다. 알아본 순간의 느낌을 함께 적으셔도 좋고요. 정확한 분석이 아니어도 됩니다.',
      badge: '선택',
    },
    // ③ 습관 짝 — 필수. 두 칸이 둘 다 채워져야 한 칸으로 센다.
    //   이 회차의 핵심 원칙(제거는 창조와 짝을 이룬다)을 구조로 강제하는 자리다.
    //   사분면 네 칸을 다 옮겨 적게 하지 않는다 — 다 옮기라 하면 성실 노동이 되고 대개 왼쪽만 길어진다.
    pairText: {
      group: '습관을 다시 짜다',
      label: '오늘 다시 짠 습관 중에서, 짝 하나만 옮겨 주세요.',
      help: '여러 개를 다 적지 않으셔도 됩니다. 짝이 맞는 한 쌍이면 충분합니다.',
      from: { key: 'habit_stop', label: '줄이거나 없애기로 한 것' },
      connector: '↓ 그 자리에',
      to: {
        key: 'habit_start',
        label: '그 자리에 들이기로 한 것',
        help: '비운 자리를 그냥 두면 며칠 안에 원래대로 돌아갑니다. 실패가 아니라 원래 그렇게 됩니다.',
      },
    },
    // ④ 오늘의 마음 — 묶음 밖(group 없음). 회차 전체에 대한 물음이라 재구성 묶음에 딸리면 안 된다.
    //   '오기'를 '해볼 만함'으로 바꿨다: 이 회차는 자기를 낮게 보는 작업이 세 번 연속으로 걸리는 주간인데
    //   낱말 여섯 중 셋이 부정 쪽이면 골라 놓고 더 가라앉는다. 오기는 수치를 연료로 삼는 결기라
    //   인도자도 접근 동기인지 수치 반응인지 구별할 수 없다.
    mood: {
      key: 'mood',
      label: '이 시간을 마치고 나온 지금, 마음은 어떤가요?',
      help: '두 개까지 고르실 수 있습니다.',
      options: ['뜨끔함', '홀가분함', '조급함', '담담함', '해볼 만함', '아직 모르겠음'],
      exclusive: '아직 모르겠음',
      max: 2,
    },
    moodCustom: { key: 'mood_custom', placeholder: '직접 쓰기 (선택)' },
  },
  deepen: {
    // 심화에는 묶음 이정표를 두지 않는다 — 요약 줄이 이미 두 갈래임을 말한다.
    title: '깊은 생각 갈무리하기',
    summary: '정체성과 어긋난 하루 · 내 입에 붙은 말',
    fields: [
      {
        key: 'identity_gap',
        label: '지금 내 하루 중에서, 지난 시간에 쓴 문장과 어긋난 채 반복되고 있는 것 하나는 무엇인가요?',
        help: '고쳐야 할 것을 찾는 칸이 아닙니다. 어긋난 곳이 보이면 그것만으로 충분합니다.',
        mirror: { label: '지난 시간에 쓰신 문장', keys: ['identity_statement'] },
      },
      {
        key: 'speech_habit',
        label: '요즘 내 입에서 가장 자주 나오는 말 한마디는 무엇인가요?',
        help: '좋은 말이든 아니든 상관없습니다. 그냥 자주 나오는 말이면 됩니다.',
      },
    ],
    // 리셋 인사 발령은 넣지 않는다 — ERRC 짝과 형태가 같아 참여자가 같은 것을 두 번 쓰게 된다.
  },
  step: {
    // ⑤ 지난 한 걸음 결산 — 2회차와 완전 동일(문안·선택지·되비추기).
    lastStep: {
      key: 'last_step_result',
      label: '지난 한 걸음은 어떻게 되었나요?',
      options: ['했습니다', '조금 했습니다', '잊고 지냈습니다', '하려다 막혔습니다'],
      note: { key: 'last_step_note', label: '한 줄만 덧붙여 주세요', help: '지키지 못했어도 괜찮습니다. 여기 정직하게 적는 것이 다음 한 주를 바꿉니다.' },
      mirror: {
        label: '지난 시간의 한 걸음',
        keys: ['step_what', 'step_when'],
        empty: '지난 한 걸음이 남아 있지 않아요. 이번 시간부터 시작해도 괜찮습니다.',
      },
    },
    // ⑥ 다음 한 걸음 — 제목·칸 구성은 전 회차 공통, 보조 문구만 이 회차 것.
    //   이 회차의 '오늘 켤 것 하나'가 곧 이번 주 한 걸음이라 별도 문항으로 또 받지 않는다.
    title: '다음 시간까지 할 작은 실천 하나를 정해 봅시다.',
    help: '오늘 마지막에 정하신 그 하나를 그대로 옮기시면 됩니다.',
    what: { key: 'step_what', label: '무엇을 하시겠어요?' },
    when: {
      key: 'step_when',
      label: '언제, 어디서 하시겠어요?',
      placeholder: '토요일 아침, 집 앞 카페에서',
      help: "이미 하고 있는 행동 뒤에 붙이면 훨씬 잘 켜집니다. '양치한 다음'처럼요.",
    },
    blocker: {
      key: 'step_blocker',
      label: '못 하게 될 것 같은 때가 있다면 언제일까요?',
      placeholder: '야근이 늦게 끝나는 날',
      help: '사흘쯤 뒤에 한 번 무너지는 것이 보통입니다. 그때 다시 시작하시면 됩니다.',
    },
    share: {
      notice: '이번 한 걸음은 다음 시간을 열 때 이름과 함께 나눕니다.',
      toggleLabel: '이번 한 걸음은 나만 볼게요',
    },
  },
  wrap: {
    // confidence·facilitatorBox 는 2회차와 완전 동일. defaultOpen 을 두지 않는다(기본 접힘).
    confidence: {
      key: 'confidence',
      label: '이 한 걸음, 다음 시간까지 어느 정도로 해내실까요?',
      help: '솔직하게요. 낮게 답하셔도 아무 일 없습니다.',
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
    // 성과가 아니라 태도를 세우는 자리다. 이 회차는 자기를 낮게 보는 작업이 세 번 걸렸으므로
    // 마지막 문장이 특히 중요하다.
    selfNote: {
      key: 'self_note',
      label: '오늘 자기를 정직하게 들여다본 나에게, 한마디만 건네주세요.',
      help: '꼭 칭찬이 아니어도 됩니다. 지금 나에게 필요한 말이면 됩니다.',
      placeholder: '괜찮아, 오늘은 여기까지만 해도 돼',
    },
  },
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
  filledCount: filledCount3,
  requiredTotal: 6,
  // 나눔 후보 열(지휘부 확정 2026-08-03) — **나눌 수 있는 문장만** 넣는다.
  //   범주 낱말(gap_area)과 자기개시가 깊은 문항(stuck_named·identity_gap)은 제외한다.
  //   비어 있을 가능성은 배제 사유가 아니다 — 인도자가 훑어 고르는 도구이므로 빈 칸은 그냥 빈 칸이다.
  //   speech_habit 은 관찰 가능한 습관이라 얕고, 다음 회차를 가볍게 여는 재료가 된다
  //   (세 번 자기를 낮게 보고 나온 주간이라 '어긋난 하루'로 열면 무거움이 두 주 연속이 된다).
  //   쌍(from→to)은 **교체·변환**을 뜻한다 — 습관 짝은 참이고, 영역+바람은 아니라 쓰지 않는다.
  summaryFields: [
    { label: '지금 가장 바라는 것', key: 'gap_want' },
    { label: '습관 바꾸기', from: 'habit_stop', to: 'habit_start' },
    { label: '입에 붙은 말', key: 'speech_habit' },
  ],
} satisfies CheckinSession;
