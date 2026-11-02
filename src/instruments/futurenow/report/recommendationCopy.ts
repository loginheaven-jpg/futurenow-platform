import type { RecommendationItem } from './groupModel';

type CopyItem = Pick<RecommendationItem, 'text' | 'attribution'>;

export const recommendationText = (item: CopyItem): string => `${item.text}\n(${item.attribution})`;
export const recommendationsText = (items: readonly CopyItem[]): string => items.map(recommendationText).join('\n\n');

/** 실제 복사가 끝난 뒤에만 성공 피드백을 허용한다. 실패하면 다시 시도할 수 있다. */
export async function copyRecommendationText(text: string, onCopied: () => void): Promise<boolean> {
  try {
    const clipboard = globalThis.navigator?.clipboard;
    if (!clipboard) return false;
    await clipboard.writeText(text);
  } catch {
    return false;
  }
  onCopied();
  return true;
}
