// 승인 큐 표시 — 대조 키 승격과 **하위호환**을 함께 잰다(5차 소건 4).
//
// 하위호환이 이 파일의 요점이다. 소건 4 이전 신청은 `signupNote` 가 비어 있다(그때는 선택이었다).
// 그 행이 화면에서 **부실 신청처럼 보이면 운영자가 잘못 판단한다** — 비어 있는 것이
// 신청자 탓이 아니라 그때의 양식 탓이기 때문이다.
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ApprovalsClient, type QueueRowView } from './ApprovalsClient';

const base: QueueRowView = {
  bucket: 'pending',
  userId: 'u1',
  name: '홍길동',
  email: 'a@b.c',
  forumName: null,
  forumPhoneMasked: null,
  signupNote: null,
  state: 'pending',
  validUntil: null,
  createdAt: '2026-08-01T00:00:00Z',
};

const render = (rows: QueueRowView[]) =>
  renderToStaticMarkup(<ApprovalsClient rows={rows} defaultValidUntil="2027-08-01" currentUserId="admin" />);

describe('열 순서 — 가입 경위가 대조 키다', () => {
  it('가입 경위 열이 포럼 열보다 앞에 있다', () => {
    const html = render([{ ...base, signupNote: '촉진자포럼에서 안내받았습니다' }]);
    expect(html.indexOf('가입 경위')).toBeLessThan(html.indexOf('포럼 가입 이름'));
  });

  it('머리 설명이 가입 경위를 축으로 말한다', () => {
    expect(render([])).toContain('<b>가입 경위</b>');
  });

  it('포럼 정보가 선택 항목임을 캡션이 밝힌다 — 비어 있어도 정상이라는 사실', () => {
    expect(render([base])).toContain('포럼 정보는 선택 항목이라 비어 있을 수 있습니다');
  });
});

describe('새 신청 — 경위 있음 · 포럼 없음이 정상이다', () => {
  const row = { ...base, signupNote: '000 인도자 소개로 왔습니다' };

  it('경위를 그대로 보여 준다', () => {
    expect(render([row])).toContain('000 인도자 소개로 왔습니다');
  });

  it('**포럼이 비어도 실패처럼 적지 않는다** — 옛 문구 `명단 대조 안 됨` 은 승인을 주저하게 만든다', () => {
    const html = render([row]);
    expect(html).toContain('미기재(선택 항목)');
    expect(html).not.toContain('명단 대조 안 됨');
  });
});

describe('하위호환 — 소건 4 이전 신청(경위 없음)', () => {
  it('경위가 비면 그것이 **양식 개편 전 신청**임을 말한다', () => {
    const html = render([base]);
    expect(html).toContain('경위 미기재');
    expect(html).toContain('양식 개편 전 신청');
  });

  it('포럼 정보가 있으면 그것으로 대조하라고 안내한다 — 옛 행도 판단할 수 있어야 한다', () => {
    const html = render([{ ...base, forumName: '홍길동', forumPhoneMasked: '010-****-5678' }]);
    expect(html).toContain('포럼 정보로 대조해 주세요');
    expect(html).toContain('홍길동');
    expect(html).toContain('010-****-5678');
  });

  it('경위도 포럼도 없는 옛 행은 대조 재료가 없다고만 적는다 — 없는 것을 지어내지 않는다', () => {
    const html = render([base]);
    expect(html).toContain('양식 개편 전 신청입니다');
    expect(html).toContain('없음');
  });

  it('옛 행도 처리 버튼이 그대로 살아 있다 — 표시가 바뀌었다고 처리가 막히면 큐가 쌓인다', () => {
    const html = render([base]);
    expect(html).toContain('승인');
    expect(html).toContain('확인 대기'); // 최박사 확정으로 `보류` 에서 이름이 바뀌었다(하는 일은 같다)
  });
});

describe('전화번호는 마스킹된 값만 온다 (불변식 13)', () => {
  it('화면은 받은 값을 그대로 그린다 — 원값은 서버에서 이미 잘렸다', () => {
    const html = render([{ ...base, signupNote: 'x', forumPhoneMasked: '010-****-5678' }]);
    expect(html).toContain('010-****-5678');
    expect(html).not.toContain('010-1234-5678');
  });
});

describe('`확인 대기` 버튼 — 이름만 구분한다 (최박사 확정 2026-08-29)', () => {
  it('버튼 이름이 `확인 대기` 다', () => {
    const html = render([base]);
    expect(html).toContain('확인 대기');
  });

  it('**옛 이름 `보류` 가 남아 있지 않다** — 회원 상태의 `이용 보류` 와 헷갈리지 않게', () => {
    const html = render([base]);
    // `이용 보류` 는 참여자 자격 이름이고 이 화면에는 없다. 버튼의 옛 이름만 본다.
    expect(html).not.toMatch(/>\s*보류\s*</);
  });

  it('**하는 일은 같다** — 여전히 승인/확인 대기 두 갈래다', () => {
    const html = render([base]);
    expect(html).toContain('승인');
    expect(html).toContain('확인 대기');
  });
});
