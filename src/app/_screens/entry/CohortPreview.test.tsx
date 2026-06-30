import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CohortPreview } from './CohortPreview';
import type { CohortPreviewMeta } from '@/contracts';

const meta: CohortPreviewMeta = {
  id: 'co1',
  name: '봄 1기',
  description: '청년부 8주 여정',
  coachName: '김코치',
  instrumentId: 'futurenow',
  memberCount: 3,
  status: 'active',
  expiresAt: null,
};
const noop = () => {};

describe('CohortPreview — 이중 제출 가드(busy) + 소개', () => {
  it('busy: [들어가는 중…] + 버튼 비활성', () => {
    const html = renderToStaticMarkup(<CohortPreview meta={meta} onEnter={noop} onCancel={noop} busy />);
    expect(html).toContain('들어가는 중…');
    expect(html).toMatch(/disabled/);
  });

  it('정상: [들어가기] + 차수 소개(description) 표시', () => {
    const html = renderToStaticMarkup(<CohortPreview meta={meta} onEnter={noop} onCancel={noop} />);
    expect(html).toContain('들어가기');
    expect(html).not.toContain('들어가는 중');
    expect(html).toContain('청년부 8주 여정'); // description 노출(진입-2)
  });
});
