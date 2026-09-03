import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CohortPreview } from './CohortPreview';
import type { CohortPreviewMeta } from '@/contracts';
import { TOOL } from '@/app/_vocab/tool';

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

  it('정상: [들어가기] + 회기 소개(description) 표시', () => {
    const html = renderToStaticMarkup(<CohortPreview meta={meta} onEnter={noop} onCancel={noop} />);
    expect(html).toContain('들어가기');
    expect(html).not.toContain('들어가는 중');
    expect(html).toContain('청년부 8주 여정'); // description 노출(진입-2)
  });

  it('general(체험): 인도자·인원 숨김 + 체험 문구 + [체험 시작하기], 체크 유지 (D-2)', () => {
    const g: CohortPreviewMeta = { ...meta, name: TOOL.trial, description: null, coachName: null, memberCount: 0 };
    const html = renderToStaticMarkup(<CohortPreview meta={g} onEnter={noop} onCancel={noop} isGeneral />);
    expect(html).toContain('체험 시작하기');
    expect(html).toContain('세미나 코드 없이'); // 체험 문구
    expect(html).not.toContain('인도자'); // general 엔 무의미 — 숨김
    expect(html).not.toContain('현재 인원'); // 숨김
    // ★ 「예상 시간」은 **걷혔다**(최박사 결재 ⑪ · 2026-08-30 — 10분 하나로 통일).
    //   D-2 는 「general 체험에서 진단 줄이 남는가」를 지키려던 것이고, 그 줄은 그대로다.
    //   **결재로 없어진 것을 잠금이 붙들고 있으면 그 잠금이 낡은 것이다.**
    expect(html, '결재 ⑪ 로 걷은 줄이 되살아났다').not.toContain('예상 시간');
  });
});
