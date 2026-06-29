import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProfileForm } from './ProfileForm';

const noop = () => {};

describe('ProfileForm (참여 프로필 — 생년·성별 필수, 종교·신앙연수 선택)', () => {
  const html = renderToStaticMarkup(<ProfileForm onSubmit={noop} />);

  it('네 항목 렌더 + 필수/선택 표시', () => {
    expect(html).toContain('태어난 해 (필수)');
    expect(html).toContain('성별 (필수)');
    expect(html).toContain('종교 (선택)');
    expect(html).toContain('신앙 연수 (선택)');
  });

  it('성별 선택지(남성·여성·기타)', () => {
    expect(html).toContain('남성');
    expect(html).toContain('여성');
    expect(html).toContain('기타');
  });

  it('초기엔 필수 미충족 → [다음] 비활성', () => {
    expect(html).toMatch(/disabled/);
    expect(html).toContain('태어난 해와 성별을 입력해 주세요');
  });

  it('참여자 화면 — 의미색(care/danger/warning) 0', () => {
    expect(html).not.toMatch(/--care|--danger|--warning/);
  });
});
