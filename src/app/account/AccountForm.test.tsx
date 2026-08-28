import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AccountForm } from './AccountForm';
import type { MembershipView } from '@/contracts/domain';

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

// ── 5차 T-4 · 내 정보 등급 표시 ────────────────────────────────────────
describe('등급 표시 — **택일이 아니라 병행 표현** (T-4)', () => {
  const view = (over: Partial<MembershipView> = {}): MembershipView => ({
    tier: 'forum', underReview: false, cohortRoles: [], ...over,
  });

  it('자격은 늘 **한 줄** — 이름과 설명이 함께 선다', () => {
    const html = render({ membership: view() });
    expect(html).toContain('포럼회원');
    expect(html).toContain('포럼회원자격 유지기간 동안 진단 등 모든 도구를 이용하실 수 있습니다.');
  });

  it('**포럼회원 + 2기 참여자 + 1기 인도자가 함께 보인다** — 최박사 지시의 본체', () => {
    const html = render({
      membership: view({
        cohortRoles: [
          { cohortId: 'c2', cohortName: '퓨처나우2026예봄2기', kind: 'participant' },
          { cohortId: 'c1', cohortName: '퓨처나우2026예봄1기', kind: 'coach' },
        ],
      }),
    });
    expect(html).toContain('포럼회원');
    expect(html).toContain('퓨처나우2026예봄2기 참여자');
    expect(html).toContain('퓨처나우2026예봄1기 인도자');
  });

  it('소속이 없으면 **그 줄을 안 그린다** — 빈손 카드를 덧붙이지 않는 것과 같은 결', () => {
    const html = render({ membership: view() });
    // **칩이 없는지**를 본다. `인도자`·`참여자` 라는 낱말 자체는 이 화면의 다른 안내문에도 있다
    //   (`전화는 인도자 연락에…`) — 낱말로 재면 코드가 아니라 단언이 틀린다. 실제로 한 번 틀렸다.
    expect(html).not.toContain('기 참여자');
    expect(html).not.toContain('기 인도자');
    expect(html).not.toContain('세미나 기간 동안');
  });

  it('참여자 설명은 참여 칩이 있을 때만 — 인도자 칩에는 붙이지 않는다(확정에 없다)', () => {
    const coachOnly = render({
      membership: view({ cohortRoles: [{ cohortId: 'c1', cohortName: '1기', kind: 'coach' }] }),
    });
    expect(coachOnly).toContain('1기 인도자');
    expect(coachOnly).not.toContain('세미나 기간 동안');

    const withParticipant = render({
      membership: view({ cohortRoles: [{ cohortId: 'c2', cohortName: '2기', kind: 'participant' }] }),
    });
    expect(withParticipant).toContain('세미나 기간 동안 진단 등 모든 도구를 이용하실 수 있습니다.');
  });

  it('`held` 는 **방문회원에 진행 표시**다 — 자격 이름을 덮지 않는다', () => {
    const html = render({ membership: view({ tier: 'visitor', underReview: true }) });
    expect(html).toContain('방문회원');
    expect(html).toContain('확인이 필요한 신청입니다.');
    expect(html, '`이용 보류` 와 겹치지 않는다').not.toContain('이용 보류');
  });

  it('`이용 보류` 는 자격 이름 자리에 선다', () => {
    const html = render({ membership: view({ tier: 'suspended' }) });
    expect(html).toContain('이용 보류');
    expect(html).toContain('계정 이용이 보류되었습니다. 문의해 주세요.');
    expect(html).not.toContain('확인이 필요한 신청입니다.');
  });

  it('문의 안내를 늘 노출한다 — 최박사 지시', () => {
    for (const tier of ['visitor', 'forum', 'suspended'] as const) {
      expect(render({ membership: view({ tier }) })).toContain('운영자에게 문의');
    }
  });

  it('membership 이 없으면 구획을 통째로 그리지 않는다 — 등급이 안 보이는 것과 화면이 안 열리는 것은 다르다', () => {
    const html = render();
    expect(html).not.toContain('운영자에게 문의');
    expect(html).toContain('이름 저장'); // 나머지는 그대로 산다
  });
});
