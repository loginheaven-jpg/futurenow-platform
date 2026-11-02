import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { InterpretationContent } from '@/instruments/futurenow/report/interpretation';
import type { InterpretationVM } from './actions';
import { InterpretationPanel } from './InterpretationPanel';

// 실제 Panel 함수·버튼 핸들러·상태 갱신을 실행한다. DOM/브라우저 검증이 아닌 node 단위검사다.
// 모든 시나리오는 initial VM이 있는 열린 패널이므로 마운트 생성 effect는 실행 대상이 아니다.
const harness = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0 }));
const actions = vi.hoisted(() => ({ clear: vi.fn(), save: vi.fn(), ensure: vi.fn() }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useState(initial: unknown) {
    const slot = harness.cursor++;
    if (!(slot in harness.values)) harness.values[slot] = typeof initial === 'function' ? initial() : initial;
    return [harness.values[slot], (next: unknown) => {
      harness.values[slot] = typeof next === 'function' ? next(harness.values[slot]) : next;
    }];
  },
  useRef(initial: unknown) {
    const slot = harness.cursor++;
    if (!(slot in harness.values)) harness.values[slot] = { current: initial };
    return harness.values[slot];
  },
  useEffect() {},
}));
vi.mock('./actions', () => ({
  clearCoachInterpretationAction: actions.clear,
  saveCoachInterpretationAction: actions.save,
  ensureInterpretationAction: actions.ensure,
}));
vi.mock('@/app/_toast/ToastProvider', () => ({ useToast: () => toast }));

const content = (headline: string): InterpretationContent => ({ headline, axes: [], growth: `${headline}의 성장 여지` });
const initial: InterpretationVM = {
  ai: content('열 때 읽었던 옛 AI'),
  effective: content('열 때 읽었던 코치 수정본'),
  coachEdited: true,
};

function renderPanel() {
  harness.cursor = 0;
  return InterpretationPanel({ responseId: 'response-1', initial });
}

type ButtonProps = { children?: ReactNode; onClick: () => void | Promise<void>; disabled?: boolean };
function buttons(tree: ReactNode): ReactElement<ButtonProps>[] {
  return Children.toArray(tree).flatMap((child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return [];
    return [
      ...(child.type === 'button' ? [child as ReactElement<ButtonProps>] : []),
      ...buttons(child.props.children),
    ];
  });
}
function revertButton(tree: ReactNode) {
  const button = buttons(tree).find((candidate) => candidate.props.children === 'AI 원문으로');
  if (!button) throw new Error('AI 원문으로 버튼이 없습니다.');
  return button;
}

beforeEach(() => {
  harness.values = [];
  harness.cursor = 0;
  vi.clearAllMocks();
  actions.clear.mockReset();
});

describe('열린 InterpretationPanel의 AI 원문 되돌리기 (ADR-206 · B5)', () => {
  it('서버 후보가 바뀐 뒤 누르면 오래된 prev.ai 대신 새 서버 VM을 표시한다', async () => {
    const latest: InterpretationVM = { ai: content('새 비교 AI'), effective: content('새 비교 AI'), coachEdited: false };
    actions.clear.mockResolvedValue({ ok: true, vm: latest });
    const opened = renderPanel();
    expect(renderToStaticMarkup(opened)).toContain(initial.effective.headline);
    const pending = revertButton(opened).props.onClick();
    expect(revertButton(renderPanel()).props.disabled).toBe(true);
    await pending;
    const updated = renderPanel();
    const html = renderToStaticMarkup(updated);
    expect(actions.clear).toHaveBeenCalledWith('response-1');
    expect(html).toContain('새 비교 AI');
    expect(html).not.toContain(initial.ai.headline);
    expect(html).not.toContain(initial.effective.headline);
    expect(html).toContain('AI 초안 · 참고용입니다.');
    expect(buttons(updated).some((button) => button.props.children === 'AI 원문으로')).toBe(false);
    expect(toast.success).toHaveBeenCalledWith('AI가 쓴 원문으로 되돌렸어요.');
  });

  it('재조회 시 코치 수정본이 있으면 서버의 effective와 coachEdited를 그대로 따른다', async () => {
    const latest: InterpretationVM = {
      ai: content('서버의 새 AI'), effective: content('서버에서 다시 확정한 문구'), coachEdited: true,
    };
    actions.clear.mockResolvedValue({ ok: true, vm: latest });
    await revertButton(renderPanel()).props.onClick();
    const updated = renderPanel();
    const html = renderToStaticMarkup(updated);
    expect(html).toContain('서버에서 다시 확정한 문구');
    expect(html).toContain('인도자가 다듬어 확정한 문구예요.');
    expect(html).not.toContain(initial.ai.headline);
    expect(revertButton(updated).props.disabled).toBe(false);
  });

  it('실패하면 기존 내용과 출처를 유지하고 오류 안내 후 다시 시도할 수 있다', async () => {
    actions.clear.mockResolvedValue({ ok: false, error: '되돌리기에 실패했어요. 잠시 후 다시 시도해 주세요.' });
    await revertButton(renderPanel()).props.onClick();
    const updated = renderPanel();
    const html = renderToStaticMarkup(updated);
    expect(html).toContain(initial.effective.headline);
    expect(html).toContain('인도자가 다듬어 확정한 문구예요.');
    expect(revertButton(updated).props.disabled).toBe(false);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('되돌리기에 실패했어요. 잠시 후 다시 시도해 주세요.');
  });
});
