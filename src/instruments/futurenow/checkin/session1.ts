// 회차 갈무리 · 1회차 문안 상수(ADR-80 · UI 지시서 §3 원문). 임의 윤문 금지 — 조사 하나 바꾸지 않는다.
// 코어는 이 파일을 모른다(인스트루먼트 소유). 채점·AI 입력 미배선 — 화면 렌더용 문자열만.
// 2~7회차는 1기 1회차 실측 후 보정해 추가한다(이 파일에 없다).

export const CHECKIN_SESSION_1 = {
  sessionNo: 1,
  cover: {
    brand: 'FUTURE NOW · 1회차',
    title: '오늘의 갈무리',
    subtitle: '과거의 나를 만나다',
    counter: (n: number) => `필수 4칸 중 ${n}칸 채움 · 약 3분`,
    band: '첫 갈무리는 아주 짧습니다. 잘 쓰려 하지 않으셔도 됩니다.',
    firstVisitOnce: '이건 진단이 아닙니다. 점수도, 정답도 없습니다.',
  },
  today: {
    identitySentence: {
      key: 'identity_sentence',
      label: '오늘 워크북에 적은 존재가치 한 문장을 그대로 옮겨 주세요.',
      help: '다듬지 않으셔도 됩니다. 쓰신 그대로면 됩니다.',
      placeholder: '나는 ______ 사람이다',
      required: true,
    },
    mood: {
      key: 'mood',
      label: '이 시간을 마치고 나온 지금, 마음은 어떤가요?',
      help: '두 개까지 고르실 수 있습니다.',
      options: ['후련함', '먹먹함', '놀라움', '부끄러움', '고마움', '아직 모르겠음'],
      exclusive: '아직 모르겠음',
      max: 2,
      required: true,
    },
    moodCustom: { key: 'mood_custom', placeholder: '직접 쓰기 (선택)' },
  },
  deepen: {
    title: '조금 더 머물러 보시겠어요?',
    optional: '선택',
    help: '건너뛰고 다음 장으로 가셔도 됩니다.',
    fields: [
      { key: 'scene', label: '오늘 꺼낸 장면 중, 집에 오는 길까지 따라온 것 하나는 무엇이었나요?' },
      { key: 'reframe', label: '오늘 다시 펼쳐 본 그 페이지에서, 예전에는 안 보이던 것이 보였다면 무엇인가요?' },
    ],
  },
  step: {
    title: '다음 시간까지, 한 걸음만 정해 봅시다.',
    help: '두 개를 적으면 대개 둘 다 하지 않습니다. 하나면 충분합니다.',
    what: { key: 'step_what', label: '무엇을', required: true },
    when: {
      key: 'step_when',
      label: '언제 · 어디서',
      placeholder: '토요일 아침, 집 앞 카페에서',
      help: '시점과 장소가 적히면 실행률이 눈에 띄게 올라갑니다.',
      required: true,
    },
    blocker: {
      key: 'step_blocker',
      label: '혹시 못 하게 된다면, 무엇 때문일까요?',
      optional: '선택',
      placeholder: '야근이 늦게 끝나면',
      help: '미리 적어 두면 그 순간에 덜 무너집니다.',
    },
    example: {
      opener: '예시가 필요하신가요?',
      body: '지난 기수에는 이런 답들이 있었습니다.\n과거의 나에게 쓴 편지를 한 번 더 읽기 / 존재가치 문장을 잘 보이는 곳에 붙이기\n여기 없는 것, 오늘 내 마음에 떠오른 것이면 더 좋습니다.',
    },
    shareNotice: '이번 한 걸음은 나와 인도자만 봅니다. 다음 시간부터는 여는 자리에서 이름과 함께 나눕니다.',
  },
  wrap: {
    confidence: {
      key: 'confidence',
      label: '이 한 걸음, 다음 시간까지 해낼 것 같으세요?',
      help: '솔직하게요. 낮게 답하셔도 아무 일 없습니다.',
      min: 0,
      max: 10,
    },
    shareConsent: { key: 'share_consent', label: '위에 쓴 문장 하나를 이름 없이 다음 시간에 나눠도 좋습니다' },
    shareTarget: {
      key: 'share_target',
      label: '어느 문장을 나눌까요?',
      options: ['존재가치 한 문장', '따라온 장면'] as const,
    },
    facilitatorBox: {
      title: '선택 · 하고 싶은 말이 있을 때만',
      need: { key: 'need', label: '나에게 필요한 것' },
      suggestion: { key: 'suggestion', label: '세미나에 대한 제안' },
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
      help: '잘했다는 말이 아니어도 됩니다. 오늘 필요한 말이면 됩니다.',
      placeholder: '괜찮아, 오늘은 여기까지만 해도 돼',
      required: true,
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
} as const;

// 필수 칸 판정(§3.7): identity_sentence·mood(1+)·(step_what & step_when)·self_note. confidence 는 세지 않는다.
export function checkinFilledCount(answers: Record<string, unknown>): number {
  const has = (k: string) => typeof answers[k] === 'string' && (answers[k] as string).trim() !== '';
  const mood = Array.isArray(answers.mood) && (answers.mood as unknown[]).length > 0;
  let n = 0;
  if (has('identity_sentence')) n += 1;
  if (mood) n += 1;
  if (has('step_what') && has('step_when')) n += 1;
  if (has('self_note')) n += 1;
  return n;
}
export const CHECKIN_REQUIRED_TOTAL = 4;
