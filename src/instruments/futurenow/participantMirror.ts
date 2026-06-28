// 갈망 거울(§7.5) — 퓨처나우 고유 '갈망/지향' 언어. 같은 B② 산출에서 참여자용 부드러운 자기반영을 만든다.
// 측정(점수·활력 버킷 라벨·등급)은 **절대 노출하지 않는다** — 방향·언어만. severity·돌봄 신호도 0(코치 경로 전용).
// CoreContext·InstrumentModule **인터페이스 무관**(인스트루먼트 내부 export). 앱층이 finalize 후 호출(G1 보호).
// 문구는 지휘부 제공 verbatim(최박사 검토 전 잠정). 임의 창작·수정 금지.
import type { FuturenowScores } from './scoring';

export interface ParticipantMirror {
  direction: string; // ② 나침반 거울(지향 한 마디)
  longing: string; // ③ 갈망의 한 문장(활력 기반)
  faith?: string; // ⑤ 믿음 한 줄(F1·F2 응답 시에만)
}

// ② NAV 8극 지향 어휘(나침반 좌1~우5). 우극 = 점수>3, 좌극 = 점수<3. 모든 극을 갈망으로.
const NAV_DIRECTIONS: Array<{ key: keyof FuturenowScores['compass']; right: string; left: string }> = [
  { key: 'NAV1', right: '가능성을 향한 마음', left: '소중한 걸 지켜 내려는 마음' },
  { key: 'NAV2', right: '자기 길을 걷는 마음', left: '함께이고 싶은 마음' },
  { key: 'NAV3', right: '앞날을 향한 마음', left: '걸어온 길을 품는 마음' },
  { key: 'NAV4', right: '새로 시작하려는 마음', left: '단단히 뿌리내리는 마음' },
];

// ③ 활력 기반 갈망 문장(내부 키: 낮음 ≤10 / 중간 11~17 / 높음 18~25 — 라벨은 화면 노출 금지).
function longingFromVitality(score: number): string {
  if (score <= 10) return '지금 당신은 더 깊이 살아있기를 갈망하고 있어요.';
  if (score <= 17) return '당신은 지금 자리에서 한 걸음을 가만히 그리고 있어요.';
  return '당신 안에 살아있음이 차오르고 있어요. 그 감각을 기억해 두세요.';
}

const FAITH_LINE = '당신이 붙잡고 있는 그 믿음이, 앞으로의 길에 빛이 되기를 바라요.';

export function participantMirror(scores: FuturenowScores): ParticipantMirror {
  // ② 가장 두드러진 lean = |점수 − 3| 최대(동점 시 앞선 축). 모두 중앙(3)이면 첫 축·우극 기본.
  const dominant = NAV_DIRECTIONS.reduce((best, cur) =>
    Math.abs(scores.compass[cur.key] - 3) > Math.abs(scores.compass[best.key] - 3) ? cur : best,
  );
  const phrase = scores.compass[dominant.key] >= 3 ? dominant.right : dominant.left;
  const direction = `지금 당신의 마음은 ${phrase} 쪽으로 향하고 있어요.`;

  // ③ 활력 갈망
  const longing = longingFromVitality(scores.vitality.score);

  // ⑤ 믿음 — F1·F2 모두 응답 시에만
  const faith = scores.faith.F1 !== null && scores.faith.F2 !== null ? FAITH_LINE : undefined;

  return faith ? { direction, longing, faith } : { direction, longing };
}
