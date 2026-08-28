import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuthGate } from './AuthGate';
import { FORUM_MATCH_CONSENT } from '@/app/_consent/consent';

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
    expect(html).not.toContain('인도자로 신청');
  });

  it('allowCoachApply: 인도자 체크 노출', () => {
    const html = renderToStaticMarkup(<AuthGate allowCoachApply onSignup={noop} onLogin={noop} />);
    expect(html).toContain('인도자로 신청');
  });

  it('busy: [처리 중…] 표시(이중 제출 신호)', () => {
    const html = renderToStaticMarkup(<AuthGate onSignup={noop} onLogin={noop} busy />);
    expect(html).toContain('처리 중…');
  });

  it('참여자 화면 — 의미색(care/danger/warning) 0', () => {
    const html = renderToStaticMarkup(<AuthGate allowCoachApply onSignup={noop} onLogin={noop} />);
    expect(html).not.toMatch(/--care|--danger|--warning/);
  });

  // **U-2 에서 축이 하나 바뀌었다** — 헤더를 그리는 조건이 `title` 이다.
  //   `/join` 은 단계마다 제목이 달라 여전히 넘기고(U-4), `/signup` 은 표가 들어
  //   **껍데기가 그리므로 넘기지 않는다.** 뜻은 그대로다 — 출구는 `onBack` 이 가른다.
  it('출구: 제목+onBack 이면(/join) 뒤로+홈, 제목이 없으면(/signup) 헤더 자체가 없다', () => {
    const withBack = renderToStaticMarkup(<AuthGate title="들어가기" onSignup={noop} onLogin={noop} onBack={noop} />);
    expect(withBack).toContain('aria-label="뒤로"');
    expect(withBack).toContain('aria-label="홈"');
    // 제목이 있고 onBack 이 없으면 `flow` — 출구가 없다(전과 같다).
    const flowOnly = renderToStaticMarkup(<AuthGate title="들어가기" onSignup={noop} onLogin={noop} />);
    expect(flowOnly).not.toContain('aria-label="홈"');
    // 제목이 없으면 **헤더를 아예 안 그린다** — 껍데기가 그리는 자리다(헤더 두 줄 방지).
    const shellDraws = renderToStaticMarkup(<AuthGate onSignup={noop} onLogin={noop} />);
    expect(shellDraws).not.toContain('<header');
  });
});

// ── 5차 소건 4 — 가입 경위 승격 · 포럼 정보 선택화 ──────────────────────────
describe('AuthGate — 대조 키가 가입 경위다 (소건 4)', () => {
  const signup = () => renderToStaticMarkup(<AuthGate allowForumMatch onSignup={noop} onLogin={noop} />);

  it('가입 경위 칸이 포럼 칸보다 **먼저** 나온다 — 순서가 곧 안내다', () => {
    const html = signup();
    expect(html.indexOf('가입 경위')).toBeGreaterThan(-1);
    expect(html.indexOf('가입 경위')).toBeLessThan(html.indexOf('촉진자포럼 가입 정보'));
  });

  it('포럼 칸은 **선택**으로 표시된다 — 포럼을 거치지 않은 사람이 지어내지 않도록', () => {
    const html = signup();
    expect(html).toContain('포럼 가입 이름 (선택)');
    expect(html).toContain('포럼 가입 연락처 (선택)');
    expect(html).toContain('비워 두셔도 됩니다');
  });

  it('가입 경위에는 (선택) 표시가 없다 — 승격됐다', () => {
    expect(signup()).not.toContain('가입 경위 (선택)');
  });

  it('경위가 비면 제출 버튼이 잠겨 있다 — 강제가 폼에 있다', () => {
    // SSR 초기 상태는 전 필드가 비어 있으므로 버튼이 disabled 여야 한다.
    expect(signup()).toContain('disabled=""');
  });

  it('allowForumMatch 가 없으면(=/join 경로) 이 블록이 통째로 없다 — ADR-107 경로별 분기', () => {
    const html = renderToStaticMarkup(<AuthGate onSignup={noop} onLogin={noop} />);
    expect(html).not.toContain('가입 경위');
    expect(html).not.toContain('촉진자포럼');
  });
});

describe('동의 문안과 강제 축이 어긋나지 않는다 (사본 둘 방지 · 불변식 23 계열)', () => {
  it('수집 항목 문장이 **가입 경위를 필수, 포럼 정보를 선택**으로 적는다', () => {
    const collect = FORUM_MATCH_CONSENT.lines[0];
    expect(collect).toContain('가입 경위');
    expect(collect).toContain('선택: 촉진자포럼');
    // 뒤집힌 옛 문장이 남아 있으면 여기서 걸린다 — 동의는 받았으나 동의한 내용이 아닌 것이 된다.
    expect(collect).not.toMatch(/^수집 항목: 촉진자포럼/);
  });

  it('화면이 그 문안을 실제로 보여 준다', () => {
    const html = renderToStaticMarkup(<AuthGate allowForumMatch onSignup={noop} onLogin={noop} />);
    expect(html).toContain(FORUM_MATCH_CONSENT.lines[0]);
  });
});
