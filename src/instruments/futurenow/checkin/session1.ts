// 회차 갈무리 · 1회차 문안 v2(ADR-80 · 수정지시서 C2). 임의 윤문 금지 — 조사 하나 바꾸지 않는다.
// 책 페이지 참조는 문장 끝 괄호에 좌표로만(참여자에게 책은 배포됨·워크북은 미배포라 언급 금지).
// 코어는 이 파일을 모른다(인스트루먼트 소유). 채점·AI 입력 미배선 — 화면 렌더용 문자열만.

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
    // ① 바꿔 쓴 문장 한 쌍 (신규·필수). 순서: 책 진행(재해석 → 존재가치)을 따른다.
    desire: {
      label: '오늘 바꿔 쓴 문장 한 쌍을 옮겨 주세요. (책 49~52쪽)',
      help: '여러 개 쓰셨다면, 바꿔 쓰는 순간 가장 시원했던 하나만 고르시면 됩니다.',
      from: { key: 'desire_from', label: '바꾸기 전', placeholder: '나는 늘 소심했다' },
      to: { key: 'desire_to', label: '바꾼 뒤', placeholder: '나는 신중하고 사려깊은 사람이다.' },
      required: true,
    },
    // ② 존재가치 선언문 (기존, 순서만 뒤로)
    identitySentence: {
      key: 'identity_sentence',
      label: '오늘 완성한 존재가치 선언문을 그대로 옮겨 주세요. (책 53~58쪽)',
      help: '다듬지 않으셔도 됩니다. 쓰신 그대로면 됩니다.',
      placeholder: '나는 ___의 가치를 최우선으로 여기며, ___하는 삶을 살기를 갈망하는 사람이다',
      required: true,
    },
    // ③ 오늘의 마음 (변경 없음)
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
    // 제목 자체를 클릭해 펼친다('선택' 태그·건너뛰기 안내 삭제 — 적극적 참여자 전제). 접힘 기본·두 칸 공백 허용.
    title: '깊은 생각 갈무리하기',
    fields: [
      { key: 'scene', label: '오늘 떠올린 기억 중에서, 수업이 끝난 뒤에도 계속 생각난 것은 무엇인가요?', help: '노트에 찍은 점 하나여도 좋습니다.' },
      { key: 'letter_line', label: '과거의 나에게 편지를 써 보세요.', help: '만약 종이에 이미 썼다면 그 내용 중 가장 해 주고 싶었던 말 한 줄만 옮겨 주세요. 파일첨부기능이 오픈되면 종이에 쓴 내용을 촬영해서 첨부하실 수 있습니다. (책 59쪽)' },
    ],
  },
  step: {
    title: '다음 시간까지 할 작은 실천 하나를 정해 봅시다.',
    help: "이 세미나에서는 이것을 '한 걸음'이라고 부릅니다. 하나면 충분해요.\n두 개를 적으면 대개 둘 다 하지 않거든요.",
    what: { key: 'step_what', label: '무엇을 하시겠어요?', required: true },
    when: {
      key: 'step_when',
      label: '언제, 어디서 하시겠어요?',
      placeholder: '토요일 아침, 집 앞 카페에서',
      help: '시점과 장소가 적히면 실행률이 눈에 띄게 올라갑니다.',
      required: true,
    },
    blocker: {
      key: 'step_blocker',
      label: '못 하게 될 것 같은 때가 있다면 언제일까요?',
      placeholder: '야근이 늦게 끝나는 날',
      help: '미리 적어 두면 그 순간에 덜 무너집니다.',
    },
    // 예시 블록·공유 안내 삭제(적극적 참여자 전제 + '한 걸음은 내가 정할 때 힘'. 공유 안내는 인도자 대면 동의 모델과도 모순).
  },
  wrap: {
    confidence: {
      key: 'confidence',
      label: '이 한 걸음, 다음 시간까지 어느 정도로 해내실까요?',
      help: '솔직하게요. 낮게 답하셔도 아무 일 없습니다.',
      min: 0,
      max: 10,
      leftLabel: '거의 불가능',
      rightLabel: '완전 성공',
    },
    // 공유 동의(share_consent·share_target) UI 삭제(C2-d) — 나눔 동의는 인도자 개별 대면 요청으로 대체.
    facilitatorBox: {
      title: '선택 · 하고 싶은 말이 있을 때만',
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
      help: '격려도, 자책도 다 좋습니다. 오늘 필요한 말이면 됩니다.',
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

// 필수 칸 판정(v2 · 5칸): identity_sentence · (desire_from 그리고 desire_to) · mood(1+) · (step_what 그리고 step_when) · self_note.
// confidence 는 세지 않는다. 옮겨 적기라 창작 부담 아님.
export function checkinFilledCount(answers: Record<string, unknown>): number {
  const has = (k: string) => typeof answers[k] === 'string' && (answers[k] as string).trim() !== '';
  const mood = Array.isArray(answers.mood) && (answers.mood as unknown[]).length > 0;
  let n = 0;
  if (has('identity_sentence')) n += 1;
  if (has('desire_from') && has('desire_to')) n += 1;
  if (mood) n += 1;
  if (has('step_what') && has('step_when')) n += 1;
  if (has('self_note')) n += 1;
  return n;
}
export const CHECKIN_REQUIRED_TOTAL = 5;
