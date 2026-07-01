import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuthGate } from './AuthGate';

const noop = () => {};

describe('AuthGate — 통합 가입/로그인 폼(S3)', () => {
  it('가입 탭 기본 — 이름·성별·생년 필드 + 탭', () => {
    const html = renderToStaticMarkup(<AuthGate onSignup={noop} onLogin={noop} />);
    expect(html).toContain('처음이에요');
    expect(html).toContain('계정이 있어요');
    expect(html).toContain('이름 또는 별명');
    expect(html).toContain('성별');
    expect(html).toContain('태어난 해');
    expect(html).toContain('가입하고 들어가기');
  });

  it('allowCoachApply=false(기본): 인도자 체크 미노출(참여자 노이즈 방지)', () => {
    const html = renderToStaticMarkup(<AuthGate onSignup={noop} onLogin={noop} />);
    expect(html).not.toContain('인도자(코치)로 신청');
  });

  it('allowCoachApply: 인도자 체크 노출', () => {
    const html = renderToStaticMarkup(<AuthGate allowCoachApply onSignup={noop} onLogin={noop} />);
    expect(html).toContain('인도자(코치)로 신청');
  });

  it('busy: [처리 중…] 표시(이중 제출 신호)', () => {
    const html = renderToStaticMarkup(<AuthGate onSignup={noop} onLogin={noop} busy />);
    expect(html).toContain('처리 중…');
  });

  it('참여자 화면 — 의미색(care/danger/warning) 0', () => {
    const html = renderToStaticMarkup(<AuthGate allowCoachApply onSignup={noop} onLogin={noop} />);
    expect(html).not.toMatch(/--care|--danger|--warning/);
  });
});
