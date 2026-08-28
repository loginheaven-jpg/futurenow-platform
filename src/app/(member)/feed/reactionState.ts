// 반응 낙관적 갱신 — **순수 함수** (5차 소건 2).
//
// 화면에서 이 계산을 하지 않는다. 단일 선택일 때는 *"내 것 하나를 빼고 새 것 하나를 더한다"* 로
// 두 줄이면 됐지만, **복수가 되면 무엇이 켜지고 무엇이 꺼졌는지 집합으로 봐야** 한다.
// 인라인으로 두면 경계 조건(0 이 되는 칸을 지우는 것 · 서버가 준 배열이 내 예상과 다를 때)을
// 화면 안에서 판단하게 되고, 그 판단은 테스트가 닿지 않는 곳에 숨는다.
//
// **서버가 준 `after` 를 진실로 삼는다.** 눌린 이모지를 보고 추측하지 않는다 —
// 경합(두 기기에서 동시에 누름)이 나면 추측은 어긋나고 서버 값은 어긋나지 않는다.
import type { FeedEmoji, FeedReactionSummary } from '@/contracts/domain';

/**
 * 내 반응이 `before` → `after` 로 바뀌었을 때 **집계 표를 그만큼만** 옮긴다.
 *
 * - 새로 켠 것: +1
 * - 끈 것: −1 (0 아래로 내려가지 않는다)
 * - 0 이 된 칸은 **지운다** — `{'👏': 0}` 과 `{}` 가 섞이면 화면이 `👏 0` 을 그린다.
 *
 * 남의 반응 수는 건드리지 않는다. 이 함수가 아는 것은 **내 변화뿐**이다.
 */
export function applyReaction(
  reactions: FeedReactionSummary,
  before: readonly FeedEmoji[],
  after: readonly FeedEmoji[],
): FeedReactionSummary {
  const was = new Set(before);
  const now = new Set(after);
  const counts: FeedReactionSummary = { ...reactions };

  for (const e of now) if (!was.has(e)) counts[e] = (counts[e] ?? 0) + 1;
  for (const e of was) if (!now.has(e)) counts[e] = Math.max(0, (counts[e] ?? 1) - 1);
  for (const k of Object.keys(counts) as FeedEmoji[]) if (!counts[k]) delete counts[k];

  return counts;
}
