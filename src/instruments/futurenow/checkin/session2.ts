// 회차 갈무리 · 2회차 문안(ADR-85 · CC_ORDER_checkin_session2 §5). 임의 윤문 금지 — 조사 하나 바꾸지 않는다.
// 책 페이지 참조는 문장 끝 괄호에 좌표로만. 코어는 이 파일을 모른다(인스트루먼트 소유) — 화면 렌더용 문자열만.
// 2회차 신규 3: 가슴 뛴 영역(future_area 단일칩), 지난 한 걸음 결산(last_step_result), 한 걸음 공개 토글(step_private).
// 되비추기(② 위·⑤ 위)는 page 가 getMyCheckin(sessionNo-1)로 넘긴다 — 이 문안 파일은 관여하지 않는다.
import type { CheckinSession } from './index';

// 필수 칸 판정(§5-5 · 6칸): (future_area 그리고 future_line) · identity_statement · mood(1+) · last_step_result · (step_what 그리고 step_when) · self_note.
// confidence·last_step_note·심화 두 칸은 세지 않는다. future_area·last_step_result 는 단일 문자열(칩 max=1).
function filledCount2(answers: Record<string, unknown>): number {
  const has = (k: string) => typeof answers[k] === 'string' && (answers[k] as string).trim() !== '';
  const mood = Array.isArray(answers.mood) && (answers.mood as unknown[]).length > 0;
  let n = 0;
  if (has('future_area') && has('future_line')) n += 1;
  if (has('identity_statement')) n += 1;
  if (mood) n += 1;
  if (has('last_step_result')) n += 1;
  if (has('step_what') && has('step_when')) n += 1;
  if (has('self_note')) n += 1;
  return n;
}

export const CHECKIN_SESSION_2 = {
  sessionNo: 2,
  cover: {
    brand: 'FUTURE NOW · 2회차',
    title: '오늘의 갈무리',
    subtitle: '미래의 나를 만나다',
    counter: (n: number) => `필수 6칸 중 ${n}칸 채움 · 약 5분`,
    band: '오늘 그린 미래를, 흐려지기 전에 붙잡아 둡니다.',
    // firstVisitOnce 없음 — 1회차에서 이미 안내(§5-1).
  },
  today: {
    // 렌더 순서(ADR-90) — 영역 → 목적 세 질문 → 인생의 한 문장 → 마음. 단일 STEP 회차라 group 이 없다.
    order: ['areaPick', 'purpose', 'identity', 'mood'],
    // ① 가장 가슴 뛴 영역 (신규·필수). 칩 단일선택(future_area 문자열) + 한 문장(future_line).
    areaPick: {
      key: 'future_area',
      label: '오늘 그린 다섯 영역 중, 가장 가슴이 뛴 하나를 옮겨 주세요. (책 69~73쪽)',
      help: '다섯 개를 다 적지 않으셔도 됩니다. 하나면 충분합니다.',
      options: ['일', '재정', '관계', '건강', '기여'],
      line: { key: 'future_line', label: '5년 뒤 그 영역의 나는', placeholder: '동네에서 꼭 들러야 하는 가게를 운영하고 있다' },
    },
    // ①-b 목적을 찾는 세 질문 (신규·선택·기본 펼침). 책의 논리 순서(세 질문 → 교차점 → 한 문장)대로 ② 앞에 둔다.
    //   은사·부르심 해설은 카드에 넣지 않는다 — 그 대목은 책과 인도자 스크립트가 맡는다.
    //   갈무리는 성찰 카드이지 묵상집이 아니고, 이 카드는 이틀 뒤 혼자 열린다.
    purpose: {
      title: '목적을 찾는 세 질문',
      badge: '선택',
      help: "세 질문이 겹치는 자리에, 나의 목적이 있습니다. 한 줄씩이면 충분해요.\n아래 '인생을 이끌어갈 하나의 문장'의 재료가 됩니다.",
      fields: [
        { key: 'purpose_alive', label: '내가 할 때 가장 살아 있다고 느끼는 것은 무엇인가?', placeholder: '누군가에게 설명해 줄 때' },
        { key: 'purpose_ache', label: '내 마음이 가장 아파하는 문제는 무엇인가?', placeholder: '재능이 있는데 기회를 못 만난 사람들' },
        { key: 'purpose_fit', label: '나의 경험과 재능이 가장 잘 쓰일 수 있는 곳은 어디인가?', help: '잘해온 일만 아니라, 실패했던 일도 재료가 됩니다.' },
      ],
    },
    // ② 인생을 이끌어갈 하나의 문장 (신규·필수). key 를 1회차 존재가치(identity_sentence)와 구분한다.
    identity: {
      key: 'identity_statement',
      label: "오늘 완성한 '인생을 이끌어갈 하나의 문장'을 그대로 옮겨 주세요. (책 78~84쪽)",
      help: '다듬지 않으셔도 됩니다. 쓰신 그대로면 됩니다.',
      placeholder: "나는 '상생'의 가치를 최우선으로 여기며, 사람과 사물의 존재가치가 최상으로 빛나도록 돕는 사람이다",
      // ② 위에 지난 회차 존재가치 문장을 되비춘다(§6). 캡션이 앱 레이어에 있던 것을 레지스트리로 옮겼다(ADR-90) —
      //   렌더 문자열은 그대로다. empty 를 두지 않으므로 1회차를 안 쓴 사람에게는 블록 자체가 나오지 않는다(현행 동일).
      mirror: { label: '지난 시간에 쓰신 문장', keys: ['identity_sentence'] },
    },
    // ③ 오늘의 마음
    mood: {
      key: 'mood',
      label: '이 시간을 마치고 나온 지금, 마음은 어떤가요?',
      help: '두 개까지 고르실 수 있습니다.',
      options: ['설렘', '막막함', '벅참', '두려움', '간절함', '아직 모르겠음'],
      exclusive: '아직 모르겠음',
      max: 2,
    },
    moodCustom: { key: 'mood_custom', placeholder: '직접 쓰기 (선택)' },
  },
  deepen: {
    // 제목·동작 1회차와 동일(접힘 기본). letter_line 키를 1회차와 같게 써 거울 구조를 보인다(행·사진경로가 회차별로 갈려 충돌 없음).
    title: '깊은 생각 갈무리하기',
    summary: '5년 뒤의 한 장면 · 미래에게서 온 편지(인터스텔라 편지)',
    fields: [
      { key: 'future_scene', label: '5년 뒤의 하루를 그려 볼 때, 가장 선명하게 보인 한 장면은 무엇이었나요? (책 74~77쪽)', help: '어떤 장소, 누구의 얼굴, 어떤 소리여도 좋습니다.' },
      { key: 'letter_line', label: '미래의 내가 지금의 나에게 보낸 편지를 써 보세요.', help: '만약 종이에 이미 썼다면 그 내용 중 가장 마음에 남는 한 줄만 옮겨 주세요. 종이에 쓴 편지는 아래에서 촬영해 첨부하셔도 됩니다. (책 85~87쪽)' },
    ],
  },
  step: {
    // ⑤ 지난 한 걸음 결산 (신규·필수). 칩만으로 필수 1칸 · 한 줄(last_step_note)은 선택. 경고색·판정 없음(네 칸 무게 동일).
    lastStep: {
      key: 'last_step_result',
      label: '지난 한 걸음은 어떻게 되었나요?',
      options: ['했습니다', '조금 했습니다', '잊고 지냈습니다', '하려다 막혔습니다'],
      note: { key: 'last_step_note', label: '한 줄만 덧붙여 주세요', help: '지키지 못했어도 괜찮습니다. 여기 정직하게 적는 것이 다음 한 주를 바꿉니다.' },
      // ⑤ 위에 지난 회차 한 걸음을 되비춘다. 값이 둘 다 있으면 ' · ' 로 이어 붙는다(현행 렌더와 동일).
      mirror: {
        label: '지난 시간의 한 걸음',
        keys: ['step_what', 'step_when'],
        empty: '지난 한 걸음이 남아 있지 않아요. 이번 시간부터 시작해도 괜찮습니다.',
      },
    },
    // ⑥ 다음 한 걸음 — 제목·보조·placeholder 전부 1회차 그대로.
    title: '다음 시간까지 할 작은 실천 하나를 정해 봅시다.',
    help: "이 세미나에서는 이것을 '한 걸음'이라고 부릅니다. 하나면 충분해요.\n두 개를 적으면 대개 둘 다 하지 않거든요.",
    what: { key: 'step_what', label: '무엇을 하시겠어요?' },
    when: {
      key: 'step_when',
      label: '언제, 어디서 하시겠어요?',
      placeholder: '토요일 아침, 집 앞 카페에서',
      help: '시점과 장소가 적히면 실행률이 눈에 띄게 올라갑니다.',
    },
    blocker: {
      key: 'step_blocker',
      label: '못 하게 될 것 같은 때가 있다면 언제일까요?',
      placeholder: '야근이 늦게 끝나는 날',
      help: '미리 적어 두면 그 순간에 덜 무너집니다.',
    },
    // 공개 토글 — step_private 컬럼(answers 아님). 기본 해제(공개). 체크 이유를 묻지 않는다.
    share: {
      notice: '이번 한 걸음은 다음 시간을 열 때 이름과 함께 나눕니다.',
      toggleLabel: '이번 한 걸음은 나만 볼게요',
    },
  },
  wrap: {
    // 3면 — confidence·facilitatorBox 1회차와 완전 동일(3-6 교정 포함).
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
      defaultOpen: false, // 7회차만 true — 마지막 회차의 세미나 제안은 다음 기수 설계의 최대 수확처다.
      need: { key: 'need', label: '인도자에게 부탁하고 싶은 것이 있나요?' },
      suggestion: { key: 'suggestion', label: '세미나에 대해 바라는 점이 있나요?' },
      suggestionAnon: { key: 'suggestion_anon', label: '이름 없이 전달합니다. 다만 인원이 적은 차수에서는 글의 결로 짐작될 수 있습니다.' },
      contactRequest: {
        key: 'contact_request',
        label: '인도자가 한 번 연락해 주시면 좋겠습니다',
        help: '짧은 안부 연락입니다. 코칭 세션이 아닙니다.',
      },
    },
    selfNote: {
      key: 'self_note',
      label: '그 미래를 처음 떠올려 본 오늘의 나에게, 한마디만 건네주세요.',
      help: '꼭 칭찬이 아니어도 됩니다. 지금 나에게 필요한 말이면 됩니다.',
      placeholder: '괜찮아, 오늘은 여기까지만 해도 돼',
    },
  },
  // save·done 문안은 회차 공통(§5 미지정 → 1회차와 동일 문자열).
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
  filledCount: filledCount2,
  requiredTotal: 6,
  // 인도자 문장 모아 보기 열(§5-6): 영역 · 인생의 한 문장 · 장면.
  summaryFields: [
    { label: '영역', key: 'future_area' },
    { label: '인생의 한 문장', key: 'identity_statement' },
    { label: '장면', key: 'future_scene' },
  ],
} satisfies CheckinSession;
