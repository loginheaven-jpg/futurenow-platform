import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button, Disclosure } from '@/core/ui';
import { CohortDetail } from './CohortDetail';
import { SEMINAR_CLOSING_COPY, seminarClosingModel } from '@/app/_vocab/seminarClosing';

// 실제 화면 함수·버튼 핸들러·상태 전이를 실행한다. DOM/실브라우저 검증과 구별한다.
const harness = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0 }));
vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useState(initial: unknown) {
    const slot = harness.cursor++;
    if (!(slot in harness.values)) harness.values[slot] = typeof initial === 'function' ? initial() : initial;
    return [harness.values[slot], (next: unknown) => {
      harness.values[slot] = typeof next === 'function' ? next(harness.values[slot]) : next;
    }];
  },
}));

type Props = ComponentProps<typeof CohortDetail>;
type ButtonProps = { children?: ReactNode; onClick: () => void | Promise<void>; disabled?: boolean };
let props: Props;

function renderDetail() {
  harness.cursor = 0;
  return CohortDetail(props);
}

function find<P>(tree: ReactNode, match: (node: ReactElement) => boolean): ReactElement<P> | null {
  for (const child of Children.toArray(tree)) {
    if (!isValidElement<{ children?: ReactNode }>(child)) continue;
    if (match(child)) return child as ReactElement<P>;
    const nested = find<P>(child.props.children, match);
    if (nested) return nested;
  }
  return null;
}

function button(tree: ReactNode, label: string): ReactElement<ButtonProps> {
  const match = find<ButtonProps>(tree, (node) => node.type === Button && (node.props as ButtonProps).children === label);
  if (!match) throw new Error(`버튼 없음: ${label}`);
  return match;
}

beforeEach(() => {
  harness.values = [];
  harness.cursor = 0;
  props = {
    cohort: { id: 'qa-cohort', name: '합성 회기', instrumentLabel: '퓨처나우', responded: 0, total: 3, careCount: 0, code: 'QTEST' },
    roster: [], status: 'active', postOpened: true,
    postStatus: { done: 1, total: 3, pending: ['가참여', '나참여'] },
    memberCount: 3, responseCount: 3,
    onArchive: vi.fn().mockResolvedValue(undefined),
    onReopen: vi.fn().mockResolvedValue(undefined),
    onOpenPost: vi.fn().mockResolvedValue(undefined),
  };
});

describe('세미나 마무리 — 확인과 기존 콜백 유지', () => {
  it('회기 마감은 먼저 A16 전체를 보여주고 확정할 때만 기존 콜백을 실행한다', async () => {
    const initial = renderDetail();
    expect(renderToStaticMarkup(initial)).not.toContain(SEMINAR_CLOSING_COPY.noticeHeading);
    button(initial, '회기 마감').props.onClick();
    expect(props.onArchive).not.toHaveBeenCalled();
    const confirmation = renderDetail();
    const html = renderToStaticMarkup(confirmation);
    expect(html).toContain(seminarClosingModel({ postOpened: true, postStatus: props.postStatus }).archiveNotice);
    expect(html).toContain('· 마무리 체크 미작성 2명 - 가참여 · 나참여');
    expect(html).not.toContain('· 마무리 체크 미작성 3명');
    const management = find<ComponentProps<typeof Disclosure>>(confirmation, (node) => node.type === Disclosure)!;
    expect(renderToStaticMarkup(management)).not.toContain('마감 확정');

    await button(confirmation, '마감 확정').props.onClick();
    expect(props.onArchive).toHaveBeenCalledExactlyOnceWith();
    expect(renderToStaticMarkup(renderDetail())).not.toContain(SEMINAR_CLOSING_COPY.noticeHeading);
  });

  it('확인문의 취소는 마감하지 않고 기존 본문 상태로 돌아온다', () => {
    button(renderDetail(), '회기 마감').props.onClick();
    button(renderDetail(), '취소').props.onClick();
    const cancelled = renderDetail();
    expect(props.onArchive).not.toHaveBeenCalled();
    expect(button(cancelled, '회기 마감').props.disabled).toBe(false);
    expect(renderToStaticMarkup(cancelled)).not.toContain(SEMINAR_CLOSING_COPY.noticeHeading);
  });

  it('미개시 확인문에는 열린 체크의 작성 유지 대신 미개시 사실을 표시한다', () => {
    props.postOpened = false;
    button(renderDetail(), '회기 마감').props.onClick();
    const html = renderToStaticMarkup(renderDetail());
    expect(html).toContain(SEMINAR_CLOSING_COPY.recordsWhenUnopened);
    expect(html).toContain(SEMINAR_CLOSING_COPY.unopened);
    expect(html).not.toContain(SEMINAR_CLOSING_COPY.recordsWhenOpened);
    expect(html).not.toContain('마무리 체크 미작성');
    expect(props.onArchive).not.toHaveBeenCalled();
  });

  it('마감 처리 중과 부모 새로고침 중에는 확정 버튼을 비활성화한다', async () => {
    let finish!: () => void;
    props.onArchive = vi.fn().mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    button(renderDetail(), '회기 마감').props.onClick();
    const pending = button(renderDetail(), '마감 확정').props.onClick();
    expect(button(renderDetail(), '마감 확정').props.disabled).toBe(true);
    finish();
    await pending;
    props.actionPending = true;
    expect(button(renderDetail(), '회기 마감').props.disabled).toBe(true);
  });

  it('마감 콜백 예외에도 기존 finally가 확인 상태와 busy를 해제한다', async () => {
    props.onArchive = vi.fn().mockRejectedValue(new Error('ARCHIVE_FAILED'));
    button(renderDetail(), '회기 마감').props.onClick();
    await expect(button(renderDetail(), '마감 확정').props.onClick()).rejects.toThrow('ARCHIVE_FAILED');
    const restored = renderDetail();
    expect(button(restored, '회기 마감').props.disabled).toBe(false);
    expect(renderToStaticMarkup(restored)).not.toContain(SEMINAR_CLOSING_COPY.noticeHeading);
  });

  it('마감된 회기의 다시 열기는 기존 콜백을 호출하고 처리 중 비활성화한다', async () => {
    props.status = 'archived';
    const archived = renderDetail();
    expect(renderToStaticMarkup(archived)).toContain('이미 마감된 회기예요.');
    const pending = button(archived, '다시 열기').props.onClick();
    expect(button(renderDetail(), '다시 열기').props.disabled).toBe(true);
    await pending;
    expect(props.onReopen).toHaveBeenCalledExactlyOnceWith();
    expect(button(renderDetail(), '다시 열기').props.disabled).toBe(false);
    expect(props.onArchive).not.toHaveBeenCalled();
  });

  it('마무리 체크 개시는 기존 콜백을 호출하고 처리 중 비활성화한다', async () => {
    props.postOpened = false;
    const pending = button(renderDetail(), '마무리 체크 개시').props.onClick();
    expect(button(renderDetail(), '마무리 체크 개시').props.disabled).toBe(true);
    await pending;
    expect(props.onOpenPost).toHaveBeenCalledExactlyOnceWith();
    expect(button(renderDetail(), '마무리 체크 개시').props.disabled).toBe(false);
  });
});
