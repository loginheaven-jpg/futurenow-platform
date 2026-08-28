'use client';
// 내 정보 폼(프레젠테이션 — 부수효과 없음). 이름·전화·프로필·비밀번호 + (코치)KPC 섹션, 각자 저장.
// **role 입력·표시 없음**(2.S2 봉쇄 — 계정 화면에 role 쓰기 경로 0). 시스템 영역이라 의미색 절제, 피드백은 토스트.
// 프로필(성별·생년·종교·신앙연수)은 전부 선택 — 가입 시 받은 정보를 여기서 열람·수정(항목6 완결). KPC 는 코치만.
import { type CSSProperties } from 'react';
import { GENDERS } from '@/contracts/vocab';
import { RELIGIONS } from '@/instruments/futurenow/profileVocab';
import { Button } from '@/core/ui';

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
  keepSignedIn,
  onKeepSignedIn,
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
  keepSignedIn: boolean;
  onKeepSignedIn: (v: boolean) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
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
                ? '켜져 있습니다. 이 기기에서는 다시 로그인하지 않으셔도 됩니다.'
                : '꺼져 있습니다. 브라우저를 닫으면 로그아웃됩니다 — 공용 기기에 알맞습니다.'}
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
