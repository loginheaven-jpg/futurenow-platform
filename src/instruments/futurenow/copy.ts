// 참여자 노출 문구(존대체) — 검증된 copy deck verbatim. **임의 수정·윤문 금지.**
// 출처: 퓨처나우_문항원문_copydeck.md. 측정/강의 어휘 분리(§9.4): 구인·STEP·강의 명명 비노출(원문에 없음).
// 1~28번 prompt·양극 레이블은 사전·종료 공용. intro·E1~E3·들어가며·체크 label·간격 intro 는 wave별.
import type { Wave } from '@/contracts';

export type WaveKey = 'pre' | 'post';
export const waveKey = (w: Wave): WaveKey => (w === 'post' ? 'post' : 'pre');

// likert 척도 레이블 (공용). 중앙 레이블 '보통'(블록2)은 LikertScale.centerLabel(ADR-20)로
// flow.likertScale() 에서 배선됨. 렌더러는 centerLabel 있으면 중앙 표기.
export const likertLabels = { minLabel: '전혀 아니다', maxLabel: '매우 그렇다' };
export const likertCenterLabel = '보통';

// 1~28 prompt (사전·종료 공용)
export const itemPrompts: Record<string, string> = {
  NAV1: '새로운 일을 앞두고 내가 먼저 떠올리는 것은',
  NAV2: '잘 풀리는 또래의 소식을 들으면 나는',
  NAV3: "'나'라는 사람을 가장 잘 설명해 주는 것은",
  NAV4: '큰 방향을 바꿔야 할 순간이 오면, 나는',
  A1: '아침에 눈을 뜰 때, 오늘 하루가 기대된다.',
  C3: '나는 내 시간과 에너지가 실제로 어디에 쓰이고 있는지 정확히 알고 있다.',
  A2: '열심히 살고는 있지만, 제자리걸음이라는 느낌이 든다.',
  C6: "누가 묻는다면 '지금 내 인생에서 가장 중요한 단 하나'를 바로 답할 수 있다.",
  D1: '마음속에만 몇 년째 품고 있는, 아직 시작하지 못한 일이 있다.',
  C2: '나는 5년 뒤 내가 어떤 사람이 되어 있을지 구체적인 장면으로 그릴 수 있다.',
  A5: '잠들기 전, 생각보다 오래 휴대폰을 붙잡고 있다가 자는 날이 많다.',
  C8: '내 주변에는 내 목표를 알고 정기적으로 점검해 주는 사람이 있다.',
  C5: '해야 할 일이 많아, 정작 중요한 일이 자주 뒤로 밀린다.',
  A3: '요즘 시간 가는 줄 모르고 빠져드는 일이 있다.',
  D2: '"조금 더 준비되면 시작해야지"라는 말을, 작년에도 했고 올해도 하고 있다.',
  C1: '지난 실패담을 꺼낼 때, 그 경험의 긍정적인 면을 함께 떠올리게 된다.',
  A4: '특별히 불행하지는 않지만, 살아 있다는 생생함도 느껴지지 않는다.',
  C7: '최근 1년 사이, 한 달 넘게 이어 간 새로운 다짐이 있다.',
  D3: "지금 생활에 큰 불만은 없다. 다만 '5년 뒤에도 이대로 좋은가'라는 질문은 좀 피하고 싶다.",
  C4: '나는 어떤 습관을 버리고 어떤 습관을 새로 만들어야 할지 분명히 알고 있다.',
  C9: '일이 잘 풀리지 않는 시기에도, 나 자신을 보는 눈은 크게 흔들리지 않는다.',
  F1: '나는 내 삶에 성취 너머의 더 큰 의미가 있다고 믿는다.',
  F2: '최근 한 달 사이, 기도나 말씀 때문에 결정이나 마음을 바꾼 적이 있다.',
  B1: '일 (Work) — 성취와 보람',
  B2: '재정 (Wealth) — 경제적 안정',
  B3: '관계 (Relationships) — 사람들과의 친밀함',
  B4: '건강 (Health) — 신체적·정신적 활력',
  B5: '기여 (Contribution) — 타인을 향한 헌신 (이웃·공동체를 향한 섬김과 나눔)',
};

// 나침반 양극 레이블 (공용)
export const bipolarLabels: Record<string, { left: string; right: string }> = {
  NAV1: { left: '잘못될 경우와 그에 대한 대비책', right: '잘되었을 때의 장면' },
  NAV2: { left: '나도 모르게 내 처지와 견주어 보게 된다', right: '부럽긴 해도 금세 내 일로 돌아온다' },
  NAV3: { left: '지금까지 걸어온 길', right: '앞으로 걷고 싶은 길' },
  NAV4: {
    left: '그동안 쌓아 온 것이 소중하여 쉽게 바꾸기 어렵다',
    right: '오늘 새로 시작하듯 백지에서 다시 고를 수 있다',
  },
};

// 들어가며(INTRO) — intro 서사 + 입력 placeholder (wave별)
export const introBlock: Record<WaveKey, { intro: string; placeholder: string }> = {
  pre: {
    intro:
      '진단을 시작하기 전에, 잠시 미래의 한 장면을 떠올려 봅니다.\n5년 뒤, 당신은 어떤 사람이 되어 있고 싶습니까?\n정답을 찾지 마세요. 떠오르는 장면, 표정, 그가 건네는 한마디 — 무엇이든 좋습니다. 다듬지 않아도 됩니다.',
    placeholder: '[ 나의 인생 조감도 — 한 문장 스케치 ]',
  },
  post: {
    intro:
      '진단을 시작하기 전에, 이 여정을 막 시작하던 5주 전의 당신을 떠올려 봅니다.\n5주 전, 막막함 속에 첫 페이지를 펼쳤던 그 사람에게 지금의 당신은 무슨 말을 건네고 싶습니까?\n정답을 찾지 마세요. 그가 가장 듣고 싶어 했을 한마디 — 무엇이든 좋습니다. 다듬지 않아도 됩니다.',
    placeholder: '[ 5주 전의 나에게 — 한마디 ]',
  },
};

// 블록 intro (wave별). 믿음의 자리는 공용(faithIntro).
export const blockIntros: Record<WaveKey, { compass: string; now: string; gap: string; ask: string }> = {
  pre: {
    compass: '양 끝 중 어느 쪽이 옳은 것은 아닙니다. 요즘의 나에게 더 가까운 쪽으로 점을 표시해 주세요.',
    now: '각 문장이 요즘의 나에게 얼마나 맞습니까? 깊이 생각하지 말고, 떠오르는 대로 표시해 주세요.',
    gap:
      '내가 원하는 모든 것을 이룬 5년 후의 내 모습을 10점이라 할 때, 지금의 나는 각 영역에서 몇 점입니까?\n점수가 낮다고 실망하지 마세요. 그 간격의 크기가 바로, 당신이 지금 그것을 간절히 바라고 있다는 증거입니다.',
    ask: '정답이 없는 질문입니다. 떠오르는 대로, 솔직하게 적어 주세요.',
  },
  post: {
    compass: '5주 전과 같은 질문입니다. 그때를 기억하려 말고, 지금의 나에게 더 가까운 쪽으로 점을 표시해 주세요.',
    now: '5주 전과 같은 문장들입니다. 그때의 답은 잊고, 지금 이 순간의 나를 그대로 표시해 주세요.',
    gap:
      '5년 후의 완성된 내 모습을 10점이라 할 때, 각 영역에서 지금의 나는 몇 점입니까?\n두 숫자 사이의 거리가, 5주 동안 당신이 실제로 움직인 만큼입니다. 작은 변화라도 그 방향이 중요합니다.',
    ask: '정답이 없는 질문입니다. 5주를 천천히 되감아 보며 적어 주세요.',
  },
};
export const faithIntro =
  '신앙은 사람마다 자리가 다릅니다. 지금의 솔직한 상태를 표시해 주세요. 답하기 어려운 문항은 비워 두어도 괜찮습니다.';

// 나에게 묻는 시간 E1~E3 prompt (wave별)
export const askPrompts: Record<WaveKey, { E1: string; E2: string; E3: string }> = {
  pre: {
    E1: '이 세미나가 끝났을 때, 당신의 무엇이 달라져 있기를 바랍니까?',
    E2:
      "'들어가며'에서 5년 뒤의 나를 떠올렸을 때, 어떤 느낌이 올라왔습니까?\n설렘, 막막함, 두려움, 그리움 … 무엇이든 좋습니다.",
    E3: '이번 세미나에서 인도자에게 바라는 점이 있다면 자유롭게 적어 주세요. (선택)',
  },
  post: {
    E1: "5주 전, 당신은 '이 세미나가 끝나면 무엇이 달라지길' 바랐습니다. 그 바람은 지금 어떻게 되었습니까?",
    E2:
      '5주 동안 당신 안에서 가장 크게 달라진 것 하나를 꼽는다면 무엇입니까?\n아주 작은 변화여도 좋습니다. 그것이 가장 진짜일 때가 많습니다.',
    E3: '이 여정은 끝이 아니라 시작입니다. 앞으로 계속 붙잡고 싶은 단 하나는 무엇입니까?',
  },
};

// 돌봄 체크(CARE) · 마지막 다짐(COMMIT) label (wave별)
export const careLabel: Record<WaveKey, string> = {
  pre: '세미나 참석과는 별도로, 인도자에게 1:1 코칭/상담을 받고 싶습니다.',
  post: '세미나 종료 후에도, 인도자에게 1:1 코칭/상담을 이어 가고 싶습니다.',
};
export const commitLabel: Record<WaveKey, string> = {
  pre: "나는 이 5주를, '미래의 나'를 만나는 시간으로 끝까지 걸어 보겠습니다.",
  post: "나는 이 5주에서 만난 '미래의 나'를, 오늘 이후의 삶에서 계속 살아내겠습니다.",
};

// subjectProfile 계정 복사 4필드(사양 상수 — ADR-32/44 규범 참조). 실수집·프리필·라벨은 ProfileForm/AuthGate(@/contracts/vocab·profileVocab)가 소유.
export const profileFieldsByWave: Record<WaveKey, string[]> = {
  pre: ['birthYear', 'gender', 'religion', 'faithYears'],
  post: ['birthYear', 'gender', 'religion', 'faithYears'],
};
