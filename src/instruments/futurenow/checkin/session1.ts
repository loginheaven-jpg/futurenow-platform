// 회차 갈무리 · 1회차 문안 v2(ADR-80 · 수정지시서 C2). 임의 윤문 금지 — 조사 하나 바꾸지 않는다.
// 책 페이지 참조는 문장 끝 괄호에 좌표로만(참여자에게 책은 배포됨·워크북은 미배포라 언급 금지).
// 코어는 이 파일을 모른다(인스트루먼트 소유). 채점·AI 입력 미배선 — 화면 렌더용 문자열만.
// ADR-85: 세션 레지스트리 형태(CheckinSession)로 통일. 필드명 identity(구 identitySentence)·판정 함수 내장.
import type { CheckinSession } from './index';
import { countFilled, missingIn, missingKeys, type RequiredGroup } from './required';

// 필수 5칸(v2): 갈망 쌍 · 존재가치 · 마음 · 다음 걸음 쌍 · 나에게.
//   confidence 는 세지 않는다(옮겨 적기가 아니라 판단이라 창작 부담이 다르다).
//   라벨은 아래 문안과 **같은 문자열을 참조**한다 — 결측 안내가 이걸 그대로 읽어 주므로 새 문안이 생기지 않는다.
//   ADR-91: filledCount·missingLabels·missingKeys 가 전부 이 선언에서 파생된다.
const REQUIRED_1: RequiredGroup[] = [
  // 쌍 문항은 비어 있는 쪽의 **라벨 원문**만 낸다(§8-5). 합성하면 새 문안이 생긴다.
  { fields: [
    { key: 'desire_from', label: '바꾸기 전' },
    { key: 'desire_to', label: '바꾼 뒤' },
  ] },
  { fields: [{ key: 'identity_sentence', label: '오늘 완성한 존재가치 선언문을 그대로 옮겨 주세요. (책 53~58쪽)' }] },
  { kind: 'list', fields: [{ key: 'mood', label: '이 시간을 마치고 나온 지금, 마음은 어떤가요?' }] },
  { fields: [
    { key: 'step_what', label: '무엇을 하시겠어요?' },
    { key: 'step_when', label: '언제, 어디서 하시겠어요?' },
  ] },
  { fields: [{ key: 'self_note', label: '오늘 여기까지 온 나에게, 한마디만 건네주세요.' }] },
];

export const CHECKIN_SESSION_1 = {
  sessionNo: 1,
  cover: {
    brand: 'FUTURE NOW · 1회차',
    title: '오늘의 갈무리',
    subtitle: '과거의 나를 만나다',
    counter: (n: number) => `필수 5칸 중 ${n}칸 채움 · 약 4분`,
    band: '첫 갈무리는 아주 짧습니다. 잘 쓰려 하지 않으셔도 됩니다.',
    firstVisitOnce: '이건 진단이 아닙니다. 점수도, 정답도 없습니다.',
  },
  today: {
    // 렌더 순서(ADR-90) — 1면은 갈망 쌍 → 존재가치 → 마음. 단일 STEP 회차라 group 이 없다.
    order: ['pairText', 'identity', 'mood'],
    // ① 바꿔 쓴 문장 한 쌍 (신규·필수). 순서: 책 진행(재해석 → 존재가치)을 따른다.
    pairText: {
      label: '오늘 바꿔 쓴 문장 한 쌍을 옮겨 주세요. (책 49~52쪽)',
      help: '약점을 강점으로 바꾼 것도, 아픔을 갈망으로 바꾼 것도 좋습니다. 바꿔 쓰는 순간 가장 시원했던 하나만 고르시면 됩니다.',
      from: { key: 'desire_from', label: '바꾸기 전', placeholder: '나는 늘 소심했다' },
      to: { key: 'desire_to', label: '바꾼 뒤', placeholder: '나는 신중하고 사려 깊은 사람이다' },
    },
    // ② 존재가치 선언문 (기존, 순서만 뒤로)
    identity: {
      key: 'identity_sentence',
      label: '오늘 완성한 존재가치 선언문을 그대로 옮겨 주세요. (책 53~58쪽)',
      // ADR-102 축1·축2 — 완충('다듬지 않으셔도 됩니다')을 지우고 값을 말한다.
      //   뒷문장은 **1회차에서만 참이다** — 2회차 identity 가 이 키(identity_sentence)를 되비춘다.
      //   2회차 것은 읽는 자리가 없어(ADR-100 이 3회차 되비추기를 삭제) 같은 문장을 붙이지 않았다.
      help: '손본 문장이 아니라 오늘 쓴 그대로 옮기십시오. 이 문장이 다음 회차의 출발점이 됩니다.',
      placeholder: '나는 ___의 가치를 최우선으로 여기며, ___하는 삶을 살기를 갈망하는 사람이다',
    },
    // ③ 오늘의 마음 (변경 없음)
    mood: {
      key: 'mood',
      label: '이 시간을 마치고 나온 지금, 마음은 어떤가요?',
      help: '두 개까지 고르실 수 있습니다.',
      options: ['후련함', '먹먹함', '놀라움', '부끄러움', '고마움', '아직 모르겠음'],
      exclusive: '아직 모르겠음',
      max: 2,
    },
    moodCustom: { key: 'mood_custom', placeholder: '직접 쓰기 (선택)' },
  },
  deepen: {
    // 제목 자체를 클릭해 펼친다('선택' 태그·건너뛰기 안내 삭제 — 적극적 참여자 전제). 접힘 기본·두 칸 공백 허용.
    // ADR-102 축4 — 심화를 부록으로 두지 않는다. 8/11 이 펼쳤고, 이것은 부가가 아니라 값을 치른 이유에 가깝다.
    title: '여기서부터가 진짜입니다',
    summary: '집에 남은 기억 · 과거에게 쓴 편지',
    fields: [
      { key: 'scene', label: '오늘 떠올린 기억 중에서, 수업이 끝난 뒤에도 계속 생각난 것은 무엇인가요?', help: '노트에 찍은 점 하나여도 좋습니다.' },
      { key: 'letter_line', label: '과거의 나에게 편지를 써 보세요.', help: '만약 종이에 이미 썼다면 그 내용 중 가장 해 주고 싶었던 말 한 줄만 옮겨 주세요. 종이에 쓴 편지는 아래에서 촬영해 첨부하셔도 됩니다. (책 59쪽)' },
    ],
  },
  step: {
    title: '다음 시간까지 할 작은 실천 하나를 정해 봅시다.',
    // ADR-102 축1 — 허락('하나면 충분해요')을 요구('하나만 정하십시오')로 바꾼다.
    //   뒷문장은 지우지 않는다. 그것은 허락의 이유가 아니라 **실행에 관한 사실**이고,
    //   앞을 어떻게 쓰느냐가 뒤의 성격을 정한다 — 허락 뒤에 붙으면 허락의 근거로 읽히지만
    //   요구 뒤에 붙으면 요구의 근거로 읽힌다. 축1 은 허락을 지우라 했지 요구를 지우라 하지 않았다.
    //   지우면 '왜 하나인지'가 사라져 다음 회차에 둘을 적는 사람이 생긴다.
    help: "이 세미나에서는 이것을 '한 걸음'이라고 부릅니다. 하나만 정하십시오.\n두 개를 적으면 대개 둘 다 하지 않거든요.",
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
    // 예시 블록·공유 안내 삭제(적극적 참여자 전제 + '한 걸음은 내가 정할 때 힘'. 공유 안내는 인도자 대면 동의 모델과도 모순).
    // 공개 토글(share) 없음 — 1회차 한 걸음은 인도자 전용(비공개).
  },
  wrap: {
    confidence: {
      key: 'confidence',
      label: '이 한 걸음, 다음 시간까지 어느 정도로 해내실까요?',
      help: '낮게 적힌 숫자가 인도자에게는 가장 쓸모 있습니다. 한 걸음을 더 잘게 쪼개 드릴 수 있거든요.',
      min: 0,
      max: 10,
      leftLabel: '아직 자신 없음',
      rightLabel: '완전 성공',
    },
    // 공유 동의(share_consent·share_target) UI 삭제(C2-d) — 나눔 동의는 인도자 개별 대면 요청으로 대체.
    facilitatorBox: {
      title: '선택 · 하고 싶은 말이 있을 때만',
      // 요약 줄은 안전장치다 — 이 상자 안의 '연락 요청'은 의견함이 아니라 돌봄 채널이라,
      // 제목만 달면 그게 거기 있는 줄 모른 채 지나간다.
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
    selfNote: {
      key: 'self_note',
      label: '오늘 여기까지 온 나에게, 한마디만 건네주세요.',
      // ADR-102 — 이 개편에서 값이 가장 큰 한 곳. 필수인데 4/8 이 비었고, 남겨 둔 완충 넷 중
      //   **유일하게 결측이 일어난 자리**다(나머지 셋은 선택이라 비어도 정상). ADR-91 D 가 §6-2 로 묶어
      //   남겼으나 지휘부가 판례를 **부분 파기**했다 — self_note 는 자기에게 쓰는 말이지 도움을 청하는
      //   통로가 아니라 '무너진 사람이 여는 문'이 아니고(그 문은 연락 요청·익명 안내다), 새 문안도
      //   칭찬을 요구하지 않는다. 허락이 값으로 바뀔 뿐이다. '쌓인다'는 참이다 — 행이 회차마다 남는다.
      help: '오늘의 나에게 지금 필요한 말을 적으십시오. 이 한 줄이 회차마다 쌓입니다.',
      placeholder: '오늘 꺼내길 잘했다',
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
  filledCount: (a) => countFilled(REQUIRED_1, a),
  requiredTotal: REQUIRED_1.length,
  missingLabels: (a) => missingIn(REQUIRED_1, a),
  missingKeys: (a) => missingKeys(REQUIRED_1, a),
  // 인도자 문장 모아 보기 열(§5-6): 갈망(쌍) · 존재가치 · 기억.
  summaryFields: [
    { label: '갈망', from: 'desire_from', to: 'desire_to' },
    { label: '존재가치', key: 'identity_sentence' },
    { label: '기억', key: 'scene' },
  ],
} satisfies CheckinSession;
