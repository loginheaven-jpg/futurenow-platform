import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { UserProfile } from '@/contracts';
import { ProfileForm } from './ProfileForm';

const noop = () => {};
const complete: UserProfile = { gender: '남', birthYear: 1998, religion: null, faithYears: null };

describe('ProfileForm — 계정 프리필/스킵 + 참여계기(S3)', () => {
  it('계정 비었으면(null): 전체 프로필 + 계기 렌더, [다음] 비활성', () => {
    const html = renderToStaticMarkup(<ProfileForm accountProfile={null} onSubmit={noop} />);
    expect(html).toContain('태어난 해 (필수)');
    expect(html).toContain('성별 (필수)');
    expect(html).toContain('참여하게 된 계기');
    expect(html).toMatch(/disabled/); // 생년·성별 미충족
  });

  it('계정 완비(성별·생년): 프로필 생략, 계기만 + [다음] 활성', () => {
    const html = renderToStaticMarkup(<ProfileForm accountProfile={complete} onSubmit={noop} />);
    expect(html).not.toContain('태어난 해 (필수)');
    expect(html).not.toContain('성별 (필수)');
    expect(html).toContain('참여하게 된 계기');
    expect(html).not.toContain('태어난 해와 성별을 입력해 주세요');
  });

  it('참여자 화면 — 의미색(care/danger/warning) 0', () => {
    const html = renderToStaticMarkup(<ProfileForm accountProfile={null} onSubmit={noop} />);
    expect(html).not.toMatch(/--care|--danger|--warning/);
  });
});
