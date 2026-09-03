'use client';
// 내 정보 폼(프레젠테이션 — 부수효과 없음). 이름·전화·프로필·비밀번호 + (코치)KPC 섹션, 각자 저장.
// **role 입력·표시 없음**(2.S2 봉쇄 — 계정 화면에 role 쓰기 경로 0). 시스템 영역이라 의미색 절제, 피드백은 토스트.
// 프로필(성별·생년·종교·신앙연수)은 전부 선택 — 가입 시 받은 정보를 여기서 열람·수정(항목6 완결). KPC 는 코치만.
import { type CSSProperties } from 'react';
import { GENDERS } from '@/contracts/vocab';
import { RELIGIONS } from '@/instruments/futurenow/profileVocab';
import { Button } from '@/core/ui';
import type { MembershipView } from '@/contracts/domain';
import {
  ADMIN_LABEL, cohortRoleLabel, PARTICIPANT_LEAD, TIER_INQUIRY_NOTE, TIER_LABEL, TIER_LEAD,
  UNDER_REVIEW_NOTE, UPGRADE_HOWTO,
} from '@/core/membershipVocab';

const inputStyle: CSSProperties = {
  width: '100%',
  minHeight: 'var(--tap-min)',
  padding: '0 var(--space-3)',
  borderRadius: 'var(--radius)',
  border: 'var(--border-hair) solid var(--color-border)',
  background: 'var(--color-surface-2)',
  color: 'var(--color-text)',
  font: 'inherit',
  fontSize: 15,
  marginTop: 'var(--space-1)',
};
const section: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-2)',
  padding: 'var(--space-4)',
  background: 'var(--color-surface-1)',
  border: 'var(--border-hair) solid var(--color-border)',
  borderRadius: 'var(--radius)',
};

export type AccountBusy = 'name' | 'phone' | 'profile' | 'kpc' | 'pw' | null;

// 참여 프로필 섹션 그룹(성별·생년·종교·신앙연수) — 폼 값은 문자열, 파싱·검증은 오케스트레이터(AccountClient).
export type AccountProfileProps = {
  gender: string;
  birthYear: string;
  religion: string;
  faithYears: string;
  onGender: (v: string) => void;
  onBirthYear: (v: string) => void;
  onReligion: (v: string) => void;
  onFaithYears: (v: string) => void;
  onSave: () => void;
};
// 코치 KPC 섹션(코치일 때만 전달 — 비코치는 undefined 로 섹션 숨김).
export type AccountKpcProps = {
  kpc: string;
  onKpc: (v: string) => void;
  onSave: () => void;
};

// 성별 선택 버튼 스타일(엔트리 폼과 동일 — 선택 시 accent). 참여자 렌더 경로와 시각 일관.
function genderBtnStyle(on: boolean): CSSProperties {
  return {
    flex: 1,
    minHeight: 'var(--tap-min)',
    borderRadius: 'var(--radius)',
    border: `1.5px solid ${on ? 'var(--color-accent)' : 'var(--color-border)'}`,
    background: on ? 'var(--color-accent-soft)' : 'var(--color-surface-2)',
    color: on ? 'var(--color-primary)' : 'var(--color-text-secondary)',
    cursor: 'pointer',
  };
}

export function AccountForm({
  name,
  phone,
  address,
  bankAccount,
  pw1,
  pw2,
  busy,
  profile,
  coachKpc,
  onName,
  onPhone,
  onAddress,
  onBankAccount,
  onPw1,
  onPw2,
  onSaveName,
  onSaveContact,
  onSavePassword,
  email,
  keepSignedIn,
  onKeepSignedIn,
  membership,
}: {
  name: string;
  phone: string;
  address: string;
  bankAccount: string;
  pw1: string;
  pw2: string;
  busy: AccountBusy;
  profile: AccountProfileProps;
  coachKpc?: AccountKpcProps; // 코치만 — undefined 면 KPC 섹션 미노출
  onName: (v: string) => void;
  onPhone: (v: string) => void;
  onAddress: (v: string) => void;
  onBankAccount: (v: string) => void;
  onPw1: (v: string) => void;
  onPw2: (v: string) => void;
  onSaveName: () => void;
  onSaveContact: () => void;
  onSavePassword: () => void;
  // 소건 1-마 — **판정하지 않는다.** 값도 저장도 오케스트레이터가 한다(폼은 프레젠테이션).
  email: string;
  keepSignedIn: boolean;
  onKeepSignedIn: (v: boolean) => void;
  /**
   * 5차 T-4 — **서버가 값만 내린다.** 문자열 조립은 여기(화면)가 한다(최박사 지시).
   * 없으면 이 구획을 통째로 그리지 않는다.
   */
  membership?: MembershipView;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* 5차 T-4 · 내 정보 등급 표시 — **줄 둘**이다.
          최박사 지시: *"포럼회원, 00기참여자, 00기인도자는 택일이 아니라 병행표현되어야 한다."*
          tier 는 늘 하나이므로 **한 줄**, 소속은 여럿이므로 **칩으로 나열**한다.
          **판정하지 않는다**(발주 §4) — 등급·대기 여부는 서버가 산출해 prop 으로 내려온다. */}
      {/* ★ **로그인 계정**(지휘부 결재 2026-09-03 「가」) — 전에는 이 화면에 ID 가 한 글자도 없었다.
          `CoreUser.email` 은 이미 서버가 갖고 있었고 **화면까지 배선만 없었다**(새 조회 0).
          **읽기 전용이다** — 이메일 변경은 `auth.users` 이고 지금 저장소에 그 경로가 없다.
          없는 것을 있는 것처럼 보이지 않게 입력칸이 아니라 **글**로 둔다. */}
      <section style={section}>
        <div className="t-caption" style={{ color: 'var(--color-text-secondary)', marginBottom: 2 }}>로그인 계정</div>
        <div className="t-body" style={{ color: 'var(--color-text)', wordBreak: 'break-all' }}>{email}</div>
      </section>

      {membership ? (
        <section style={section}>
          {/* ① 자격 — 늘 한 줄.
              **층 나눔을 유지한다**(390px 실측 판단 2026-08-29).
              최박사 예시는 `00기참여자. 포럼회원.` 을 나란히 쓴 모양이라 한 층도 가능하나,
              390 에서 실제로 렌더해 재 보니 이렇다:

                축약됨 · 소속2+운영자      한 층 1줄 56px  |  두 층 2줄 95px
                **축약 안 됨** · 소속2     한 층 **2줄** 88px |  두 층 2줄 95px

              한 층은 **내용에 따라 줄 수가 흔들린다**(1→2줄). 두 층은 언제나 2줄로 **모양이 고정**된다.
              그리고 한 층에서 줄이 접히면 `[QA] 검증 전용 참여자` 와 `포럼회원` 이 같은 굵기·같은 층으로
              **줄만 바뀐 채** 서서, 어디까지가 소속이고 어디부터가 자격인지 읽는 사람이 알 수 없다.
              **축이 둘이라는 사실이 시각에서 사라진다** — 그것이 최박사가 처음부터 막으신 합침이다.
              높이 차이는 39px 한 번뿐이고, 그 값으로 **경계가 늘 보이는 것**을 산다. */}
          <div>
            <span className="t-h1" style={{ fontSize: 18 }}>{TIER_LABEL[membership.tier]}</span>
            {/* `held` 는 tier 를 덮지 않는다 — 자격 이름 옆에 **진행 표시**로 붙는다.
                덮으면 *보류* 가 자격 자리에 앉아 `이용 보류` 와 한 화면에서 겹친다. */}
            {membership.underReview ? (
              <span
                className="t-caption"
                style={{
                  marginLeft: 'var(--space-2)', padding: '2px 8px', borderRadius: 999,
                  border: 'var(--border-hair) solid var(--color-border)',
                  background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)',
                }}
              >
                {UNDER_REVIEW_NOTE}
              </span>
            ) : null}
          </div>
          {/* **설명문은 소속이 있으면 소속 기준으로 바뀐다** — 이름은 바뀌지 않는다.
              최박사 확정: *"18명 모두 참여자 이다. 포럼회원(정회원)은 없다."*
              그 사실을 그대로 읽으면 `승인을 기다리는 중입니다. 세미나 참여와…` 는
              **이미 참여 중인 사람에게 어긋난다.**

              ✅ **답이 왔다**(2026-08-30). 최박사가 문안 작성을 지휘부에 위임하셨고
              두 문장 모두 확정됐다 — 방문회원 줄과 참여자 줄 둘 다 `membershipVocab` 에서 바뀌었다.
              **이 화면의 분기 로직은 그대로다**(바뀐 것은 문안뿐).

              **이름은 방문회원 그대로다** — 승인받은 적이 없기 때문이다. 이름까지 `참여자` 로
              바꾸면 자격과 소속을 다시 한 줄로 합치는 것이고, 그것이 최박사가 처음부터
              금지하신 것이다. 바뀌는 것은 **설명문뿐**이다. */}
          <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: 'var(--space-2) 0 0' }}>
            {membership.cohortRoles.some((r) => r.kind === 'participant')
              ? PARTICIPANT_LEAD
              : TIER_LEAD[membership.tier]}
          </p>
          {/* 승급 방법 **병기**(최박사 확정 2026-08-30) —
              *"정회원 승급 신청을 하지 않은 방문회원도 있다 그냥 승급방법 안내면 병기하면 된다."*
              방문회원에게만 붙인다. 이미 포럼회원인 사람에게 승급 방법은 뜻이 없고,
              이용 보류에게는 문의 안내가 따로 있다. */}
          {membership.tier === 'visitor' ? (
            <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: 'var(--space-1) 0 0' }}>
              {UPGRADE_HOWTO}
            </p>
          ) : null}

          {/* ② 소속 — 여럿. **없으면 이 줄을 그리지 않는다**(T-5 의 *빈손 카드를 덧붙이지 않는다* 와 같은 결).
              **칩은 이름만 단다**(최박사 확정 4번) — 설명은 위 자격 줄이 든다. */}
          {membership.cohortRoles.length > 0 || membership.isAdmin ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                {/* 운영자 — **넷째 축**이라 회기 칩과 같은 줄에 서되 회기명이 없다.
                    맨 앞에 둔다: 회기에 매이지 않는 것이 매인 것들보다 먼저 읽히는 편이 자연스럽다. */}
                {membership.isAdmin ? (
                  <span
                    className="t-caption"
                    style={{
                      padding: '4px 10px', borderRadius: 999,
                      border: 'var(--border-hair) solid var(--color-border)',
                      background: 'var(--color-surface-2)',
                    }}
                  >
                    {ADMIN_LABEL}
                  </span>
                ) : null}
                {membership.cohortRoles.map((r) => (
                  <span
                    key={`${r.cohortId}:${r.kind}`}
                    className="t-caption"
                    style={{
                      padding: '4px 10px', borderRadius: 999,
                      border: 'var(--border-hair) solid var(--color-border)',
                      background: 'var(--color-surface-2)',
                    }}
                  >
                    {cohortRoleLabel(r)}
                  </span>
              ))}
            </div>
          ) : null}

          {/* ③ 문의 안내 — 최박사 지시로 노출한다. */}
          <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: 'var(--space-3) 0 0' }}>
            {TIER_INQUIRY_NOTE}
          </p>
        </section>
      ) : null}

      {/* 이름 */}
      <section style={section}>
        <label className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>
          이름
          <input style={inputStyle} type="text" autoComplete="name" placeholder="표시할 이름" value={name} onChange={(e) => onName(e.target.value)} />
        </label>
        <Button onClick={onSaveName} disabled={busy === 'name'} style={{ alignSelf: 'flex-start' }}>
          {busy === 'name' ? '저장 중…' : '이름 저장'}
        </Button>
      </section>

      {/* 연락처 — 전화·주소·계좌(주소·계좌는 선택, 운영자 전용 열람) */}
      <section style={section}>
        <label className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>
          전화번호
          <input style={inputStyle} type="tel" autoComplete="tel" placeholder="010-0000-0000" value={phone} onChange={(e) => onPhone(e.target.value)} />
        </label>
        <label className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>
          주소 (선택)
          <input style={inputStyle} type="text" autoComplete="street-address" placeholder="도로명 주소" value={address} onChange={(e) => onAddress(e.target.value)} aria-label="주소" />
        </label>
        <label className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>
          입금 계좌 (선택 · 개근장학금)
          <input style={inputStyle} type="text" inputMode="numeric" placeholder="은행 계좌번호" value={bankAccount} onChange={(e) => onBankAccount(e.target.value)} aria-label="입금 계좌" />
        </label>
        <p className="t-caption" style={{ color: 'var(--color-text-muted)', margin: 0 }}>
          전화는 인도자 연락에, 주소·계좌는 운영(장학금)에 쓰여요. 본인과 운영자만 볼 수 있어요.
        </p>
        <Button onClick={onSaveContact} disabled={busy === 'phone'} style={{ alignSelf: 'flex-start' }}>
          {busy === 'phone' ? '저장 중…' : '연락처 저장'}
        </Button>
      </section>

      {/* 참여 프로필 — 성별·생년·종교·신앙연수(전부 선택, 가입 시 받은 정보 열람·수정) */}
      <section style={section}>
        <div>
          <span className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>성별</span>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
            {GENDERS.map((g) => (
              <button key={g} type="button" onClick={() => profile.onGender(g)} className="t-body" style={genderBtnStyle(profile.gender === g)}>
                {g}
              </button>
            ))}
          </div>
        </div>
        <label className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>
          태어난 해
          <input style={inputStyle} type="number" inputMode="numeric" placeholder="예: 1998" value={profile.birthYear} onChange={(e) => profile.onBirthYear(e.target.value)} aria-label="태어난 해" />
        </label>
        <label className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>
          종교
          <select style={inputStyle} value={profile.religion} onChange={(e) => profile.onReligion(e.target.value)} aria-label="종교">
            <option value="">선택 안 함</option>
            {RELIGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>
          신앙 연수
          <input style={inputStyle} type="number" inputMode="numeric" placeholder="예: 10 (년)" value={profile.faithYears} onChange={(e) => profile.onFaithYears(e.target.value)} aria-label="신앙 연수" />
        </label>
        <Button onClick={profile.onSave} disabled={busy === 'profile'} style={{ alignSelf: 'flex-start' }}>
          {busy === 'profile' ? '저장 중…' : '프로필 저장'}
        </Button>
      </section>

      {/* KPC 인증번호 — 코치 전용(set_my_coach_kpc RPC 가 role=coach 게이트) */}
      {coachKpc ? (
        <section style={section}>
          <label className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>
            KPC 인증번호
            <input style={inputStyle} type="text" placeholder="KPC12345" value={coachKpc.kpc} onChange={(e) => coachKpc.onKpc(e.target.value)} aria-label="KPC 인증번호" />
          </label>
          <p className="t-caption" style={{ color: 'var(--color-text-muted)', margin: 0 }}>
            인도자 자격 번호예요. 형식: KPC + 숫자 5자리 (예: KPC12345).
          </p>
          <Button onClick={coachKpc.onSave} disabled={busy === 'kpc'} style={{ alignSelf: 'flex-start' }}>
            {busy === 'kpc' ? '저장 중…' : 'KPC 저장'}
          </Button>
        </section>
      ) : null}

      {/* 소건 1-마 · 이 기기에서 로그인 유지 —
          **기본은 켬**이다. 이미 그렇게 동작하고 있었고(운영 실측: 인증 쿠키가 400일 영속),
          스위치는 그 사실을 **보이게 만들고 끌 수 있게** 한다. 끄면 세션 쿠키가 되어
          브라우저를 닫을 때 사라진다.
          **비밀번호를 저장하는 기능이 아니다** — 앱은 자격을 들지 않는다(지휘부 판정: 자격 저장 기각).
          공용 기기에서 끄는 용도라 위치를 비밀번호 섹션 바로 위에 둔다(계정 보안이 한자리에 모이게). */}
      <section style={section}>
        <label style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={keepSignedIn}
            onChange={(e) => onKeepSignedIn(e.target.checked)}
            // 기존 동의 체크박스(`ConsentBlock`)와 **같은 치수**다 — 새 시각 언어를 만들지 않는다(불변식 20).
            style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0 }}
          />
          <span>
            <span className="t-body">이 기기에서 로그인 유지</span>
            <span className="t-caption" style={{ display: 'block', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
              {keepSignedIn
                ? '켜져 있습니다. 이 기기에서는 로그인이 유지됩니다.'
                : '꺼져 있습니다. 브라우저를 닫으면 로그아웃됩니다 · 공용 기기에 알맞습니다.'}
            </span>
            <span className="t-caption" style={{ display: 'block', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
              비밀번호를 저장하지는 않습니다. 이 설정은 이 기기에만 적용됩니다.
            </span>
          </span>
        </label>
      </section>

      {/* 비밀번호 변경(로그인 상태) */}
      <section style={section}>
        <label className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>
          새 비밀번호
          <input style={inputStyle} type="password" autoComplete="new-password" placeholder="6자 이상" value={pw1} onChange={(e) => onPw1(e.target.value)} />
        </label>
        <label className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>
          새 비밀번호 확인
          <input style={inputStyle} type="password" autoComplete="new-password" placeholder="다시 입력" value={pw2} onChange={(e) => onPw2(e.target.value)} />
        </label>
        <Button onClick={onSavePassword} disabled={busy === 'pw' || !pw1 || !pw2} style={{ alignSelf: 'flex-start' }}>
          {busy === 'pw' ? '바꾸는 중…' : '비밀번호 변경'}
        </Button>
      </section>
    </div>
  );
}
