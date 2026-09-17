// 명단 펼침의 워크북 사진(ADR-197) — 운영자 삭제 표시가 **모아 보기에서 이 자리로** 옮겨 왔다.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { WORKBOOK_TITLE } from '@/instruments/futurenow/checkin';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('./actions', () => ({ deletePhotoAction: vi.fn() }));

import { RosterDetail, type RosterEntry } from './RosterDetail';

const ENTRY: RosterEntry = {
  userId: 'u1', name: '가상 참여자', status: '제출', late: false, contact: false, hasRow: true,
  blocks: [{ kind: 'text', label: '첫 문장', value: '값' }],
  photos: [{ path: 'c/u1/1/a.jpg', url: 'https://example.test/a.jpg', thumbUrl: 'https://example.test/a.thumb.jpg' }],
};

const render = (canDeletePhotos: boolean) =>
  renderToStaticMarkup(
    <RosterDetail entries={[ENTRY]} openUserId="u1" cohortId="c" sessionNos={[1]} currentSession={1} tabsLabel="다른 회차" canDeletePhotos={canDeletePhotos} />,
  );

describe('명단 펼침 — 워크북 사진', () => {
  it('펼치면 사진이 제목과 함께 **맨 위**에 선다', () => {
    const html = render(false);
    expect(html).toContain(WORKBOOK_TITLE);
    expect(html.indexOf('<img')).toBeGreaterThan(-1);
    expect(html.indexOf('<img')).toBeLessThan(html.indexOf('첫 문장'));
  });

  it('사진은 한 번만 그린다 — 읽는 화면이 또 그리지 않는다', () => {
    expect(render(true).split('<img').length - 1).toBe(1);
  });

  it('삭제 표시는 운영자에게만', () => {
    expect(render(true)).toContain('사진 삭제(운영자)');
    expect(render(false)).not.toContain('사진 삭제(운영자)');
  });
});

describe('모아 보기에는 사진이 없다 (2026-09-18 결정)', () => {
  // 페이지는 서버 컴포넌트라 컨텍스트 없이 그릴 수 없다 — 원문에서 모아 보기 구간을 잘라 잰다.
  const src = readFileSync('src/app/coach/cohort/[cohortId]/checkin/page.tsx', 'utf8');
  const start = src.indexOf('문장 모아 보기</h2>');
  const end = src.indexOf('이름 없이 온 말', start);

  it('⑦ 잴 구간이 실재한다', () => {
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
  });

  it('구간 안에 사진 부품·사진 목록이 없다', () => {
    const section = src.slice(start, end);
    expect(section).not.toContain('CoachPhotos');
    expect(section).not.toContain('photos');
  });

  it('모아 보기의 행 거르기가 사진으로 사람을 올리지 않는다', () => {
    expect(src).toContain('const sentences = perMember.filter((s) => s.cells.some((c) => c.has));');
  });
});
