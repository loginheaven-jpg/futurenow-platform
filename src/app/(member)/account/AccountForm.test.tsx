import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AccountForm } from './AccountForm';
import type { MembershipView } from '@/contracts/domain';
// **문안을 여기에 다시 적지 않는다**(사본 셋 방지 · 불변식 23).
//   *문장이 무엇인가* 는 `membershipVocab.test.ts` 가 글자 그대로 잠그고,
//   이 파일은 **화면이 그 상수를 쓰는가**만 잰다. 문안이 바뀌어도 이 파일은 안 바뀐다.
//   (실제로 2026-08-30 문안 확정 때 여기 세 곳이 하드코딩이라 함께 빨개졌다.)
import { PARTICIPANT_LEAD, TIER_LEAD } from '@/core/membershipVocab';

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
      email="u1@t.test"
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
    tier: 'forum', underReview: false, cohortRoles: [], isAdmin: false, ...over,
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
          { cohortId: 'c2', cohortName: '퓨처나우2026예봄2기', kind: 'participant', firstSessionAt: null },
          { cohortId: 'c1', cohortName: '퓨처나우2026예봄1기', kind: 'coach', firstSessionAt: null },
        ],
      }),
    });
    expect(html).toContain('포럼회원');
    expect(html).toContain('2기 참여자');
    expect(html).toContain('1기 인도자');
  });

  it('소속이 없으면 **그 줄을 안 그린다** — 빈손 카드를 덧붙이지 않는 것과 같은 결', () => {
    const html = render({ membership: view() });
    // **칩이 없는지**를 본다. `인도자`·`참여자` 라는 낱말 자체는 이 화면의 다른 안내문에도 있다
    //   (`전화는 인도자 연락에…`) — 낱말로 재면 코드가 아니라 단언이 틀린다. 실제로 한 번 틀렸다.
    expect(html).not.toContain('기 참여자');
    expect(html).not.toContain('기 인도자');
    expect(html).not.toContain(PARTICIPANT_LEAD);
  });

  // ── 최박사 확정 2번(지휘부 읽기) — 참여 칩이 있으면 **설명문만** 바뀐다 ────────
  //
  //   *"18명 모두 참여자 이다. 포럼회원(정회원)은 없다."* 그 사실을 그대로 읽으면
  //   `승인을 기다리는 중입니다…` 는 이미 참여 중인 사람에게 어긋난다.
  //   ✅ 2026-08-30 최박사가 문안 작성을 지휘부에 위임하며 두 문장이 확정됐다. 분기는 그대로다.
  describe('참여 칩이 있으면 자격 줄의 **설명문**을 소속 기준으로 쓴다', () => {
    const asParticipant = (tier: MembershipView['tier'] = 'visitor') =>
      render({
        membership: view({
          tier,
          cohortRoles: [{ cohortId: 'c2', cohortName: '퓨처나우2026예봄2기', kind: 'participant', firstSessionAt: null }],
        }),
      });

    it('실측 18명의 경우 — 방문회원인데 세미나 참여 중', () => {
      const html = asParticipant();
      expect(html).toContain(PARTICIPANT_LEAD);
      expect(html, '참여 중인 사람에게는 방문회원 설명을 쓰지 않는다')
        .not.toContain(TIER_LEAD.visitor);
    });

    it('**이름은 방문회원 그대로다** — 자격과 소속을 다시 한 줄로 합치지 않는다', () => {
      const html = asParticipant();
      expect(html).toContain('방문회원');
      expect(html, '이름까지 참여자로 바꾸면 최박사가 금지하신 합침이다').not.toContain('>참여자<');
      expect(html).toContain('2기 참여자'); // 소속은 칩으로만
    });

    it('참여 칩이 없으면 자격 줄 설명문이 그대로다', () => {
      const html = render({ membership: view({ tier: 'visitor' }) });
      expect(html).toContain(TIER_LEAD.visitor);
    });

    it('**인도자 칩만 있으면 대체하지 않는다** — 참여가 아니다', () => {
      const html = render({
        membership: view({ tier: 'visitor', cohortRoles: [{ cohortId: 'c1', cohortName: '퓨처나우2026예봄1기', kind: 'coach', firstSessionAt: null }] }),
      });
      expect(html).toContain(TIER_LEAD.visitor);
      expect(html).not.toContain(PARTICIPANT_LEAD);
      expect(html).toContain('1기 인도자');
    });
  });

  it('**소속 칩은 이름만 단다**(최박사 확정 4번) — 칩 아래 설명이 없다', () => {
    const html = render({
      membership: view({ cohortRoles: [{ cohortId: 'c1', cohortName: '퓨처나우2026예봄1기', kind: 'coach', firstSessionAt: null }] }),
    });
    expect(html).toContain('1기 인도자');
    expect(html).not.toContain(PARTICIPANT_LEAD);
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
    expect(html).toContain('이용이 보류되었습니다. 운영자에게 문의해 주십시오.');
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

describe('운영자 — 넷째 축 (최박사가 표시 대상에 넣으셨다)', () => {
  const view = (over: Partial<MembershipView> = {}): MembershipView => ({
    tier: 'forum', underReview: false, cohortRoles: [], isAdmin: false, ...over,
  });

  it('운영자면 칩이 선다 — 회기에 매이지 않아 이름만 단다', () => {
    const html = render({ membership: view({ isAdmin: true }) });
    expect(html).toContain('운영자');
  });

  it('**소속이 없어도 운영자 칩만으로 줄이 선다** — 넷째 축은 회기와 무관하다', () => {
    const html = render({ membership: view({ isAdmin: true, cohortRoles: [] }) });
    expect(html).toContain('운영자');
  });

  it('운영자가 아니면 칩이 없다', () => {
    const html = render({ membership: view({ isAdmin: false }) });
    expect(html).not.toMatch(/>\s*운영자\s*</);
  });

  it('**운영자 칩이 소속 칩보다 앞에 선다** — 회기에 안 매인 것이 먼저 읽힌다', () => {
    const html = render({
      membership: view({ isAdmin: true, cohortRoles: [{ cohortId: 'c2', cohortName: '퓨처나우2026예봄2기', kind: 'participant', firstSessionAt: null }] }),
    });
    expect(html.indexOf('운영자')).toBeLessThan(html.indexOf('2기 참여자'));
  });

  it('**자격 이름은 그대로다** — 운영자라고 tier 를 덮지 않는다(축이 다르다)', () => {
    const html = render({ membership: view({ tier: 'visitor', isAdmin: true }) });
    expect(html).toContain('방문회원');
    expect(html).toContain('운영자');
  });
});

describe('승급 안내 병기 (최박사 확정 2026-08-30)', () => {
  const view = (over: Partial<MembershipView> = {}): MembershipView => ({
    tier: 'visitor', underReview: false, cohortRoles: [], isAdmin: false, ...over,
  });

  it('방문회원에게 **최박사 원문 그대로** 병기한다', () => {
    expect(render({ membership: view() })).toContain('촉진자포럼에 가입하고 정회원자격을 취득하시면 된다.');
  });

  it('포럼회원에게는 붙이지 않는다 — 이미 승급했으므로 뜻이 없다', () => {
    expect(render({ membership: view({ tier: 'forum' }) })).not.toContain('촉진자포럼에 가입하고');
  });

  it('이용 보류에게도 붙이지 않는다 — 문의 안내가 따로 있다', () => {
    const html = render({ membership: view({ tier: 'suspended' }) });
    expect(html).not.toContain('촉진자포럼에 가입하고');
    expect(html).toContain('이용이 보류되었습니다. 운영자에게 문의해 주십시오.');
  });

  it('**종료된 회기 참여자도 방문회원 tier 라 병기가 붙는다** — 승급 길을 잃지 않는다', () => {
    const html = render({
      membership: view({ cohortRoles: [{ cohortId: 'c1', cohortName: '퓨처나우2026예봄1기', kind: 'participant', firstSessionAt: '2026-07-26' }] }),
    });
    expect(html).toContain('1기 참여자');           // 명칭은 회기 참여자
    expect(html).toContain('방문회원');              // 자격 이름은 그대로
    expect(html).toContain('촉진자포럼에 가입하고');   // 승급 길이 보인다
  });
});
