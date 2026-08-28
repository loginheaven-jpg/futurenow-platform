import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AccountForm } from './AccountForm';

const noop = () => {};
const profile = {
  gender: '남',
  birthYear: '1998',
  religion: '기독교',
  faithYears: '10',
  onGender: noop,
  onBirthYear: noop,
  onReligion: noop,
  onFaithYears: noop,
  onSave: noop,
};
const render = (over: Partial<Parameters<typeof AccountForm>[0]> = {}) =>
  renderToStaticMarkup(
    <AccountForm
      name="홍길동"
      phone="010-1234-5678"
      address="서울시 예봄로 1"
      bankAccount="123-456-789"
      pw1=""
      pw2=""
      busy={null}
      profile={profile}
      keepSignedIn
      onKeepSignedIn={noop}
      onName={noop}
      onPhone={noop}
      onAddress={noop}
      onBankAccount={noop}
      onPw1={noop}
      onPw2={noop}
      onSaveName={noop}
      onSaveContact={noop}
      onSavePassword={noop}
      {...over}
    />,
  );

describe('AccountForm (내 정보)', () => {
  const html = render();

  it('이름·연락처(전화·주소·계좌) prefill + 비번 2회 + 섹션별 저장', () => {
    expect(html).toContain('value="홍길동"');
    expect(html).toContain('value="010-1234-5678"');
    expect(html).toContain('value="서울시 예봄로 1"'); // 주소 prefill
    expect(html).toContain('value="123-456-789"'); // 계좌 prefill
    expect((html.match(/type="password"/g) ?? []).length).toBe(2);
    expect(html).toContain('이름 저장');
    expect(html).toContain('연락처 저장');
    expect(html).toContain('비밀번호 변경');
  });

  it('프로필 섹션 — 성별·생년·종교·신앙연수 prefill + 저장(항목6 완결)', () => {
    expect(html).toContain('프로필 저장');
    expect(html).toContain('value="1998"'); // 생년 prefill
    expect(html).toContain('value="10"'); // 신앙연수 prefill
    expect(html).toContain('남'); // 성별 선택지(남/여)
    expect(html).toContain('기독교'); // 종교 선택지
  });

  it('KPC: coachKpc 미전달(비코치) → 섹션 없음', () => {
    expect(html).not.toContain('KPC 저장');
    expect(html).not.toContain('KPC 인증번호');
  });

  it('KPC: coachKpc 전달(코치) → 섹션 노출 + prefill', () => {
    const coachHtml = render({ coachKpc: { kpc: 'KPC12345', onKpc: noop, onSave: noop } });
    expect(coachHtml).toContain('KPC 인증번호');
    expect(coachHtml).toContain('value="KPC12345"');
    expect(coachHtml).toContain('KPC 저장');
  });

  it('안전: role 쓰기 경로 0(역할 입력·표시 없음)', () => {
    expect(html).not.toContain('역할');
    expect(html).not.toMatch(/name="role"|>관리자<|"admin"/);
  });
});

describe('이 기기에서 로그인 유지 스위치 (소건 1-마)', () => {
  it('기본은 켬으로 그려지고, 비밀번호를 저장하지 않는다는 사실을 함께 적는다', () => {
    const html = render();
    expect(html).toContain('이 기기에서 로그인 유지');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('checked=""');
    expect(html).toContain('비밀번호를 저장하지는 않습니다');
  });

  it('끄면 무엇이 달라지는지 말한다 — 상태만 바꾸고 설명이 없으면 아무도 못 쓴다', () => {
    const html = render({ keepSignedIn: false });
    expect(html).toContain('브라우저를 닫으면 로그아웃됩니다');
    expect(html).toContain('공용 기기');
  });

  it('**비밀번호 입력칸을 늘리지 않았다** — 자격 저장은 기각된 방향이다', () => {
    const html = render();
    const passwordInputs = html.match(/type="password"/g) ?? [];
    expect(passwordInputs).toHaveLength(2); // 새 비밀번호 · 확인 — 그대로다
  });
});
