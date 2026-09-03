'use client';
// §7.3 통합 가입/로그인 — /join·/signup 공유(allowCoachApply 로 인도자 섹션 분기). UX통합가입 S3.
// 가입 탭: 이름·성별·생년(필수·폼 강제) + 종교·신앙연수(선택). 인도자 체크 ON(allowCoachApply)이면 실명 안내 승격 + 전화 + KPC.
// 로그인 탭 유지(/join 재참여 기존 회원). metadata 는 프로필 필드만 전송(코치 신청은 세션 후 RPC·§3.4). 참여자 화면 경고색 배제(§0.4).
import { useState, type CSSProperties, type ReactNode } from 'react';
import { GENDERS } from '@/contracts/vocab';
import { RELIGIONS, KPC_RE, CURRENT_YEAR } from '@/instruments/futurenow/profileVocab';
import { Button } from '@/core/ui';
import { ConsentBlock } from '@/app/_consent/ConsentBlock';
import { FORUM_MATCH_CONSENT, PRIVACY_CONSENT, SENSITIVE_CONSENT } from '@/app/_consent/consent';

export type SignupPayload = {
  email: string;
  password: string;
  name: string;
  gender: string;
  birthYear: number;
  religion?: string;
  faithYears?: number;
  coachApply?: boolean;
  phone?: string;
  kpc?: string;
  address?: string; // 선택
  bankAccount?: string; // 선택(개근장학금 입금)
  consentSensitive?: boolean; // 민감정보(종교·신앙) 수집 동의 여부. privacy(필수)는 제출=동의. ADR-76
  // 포럼 대조 키 — **`/signup` 경로에서만** 수집(allowForumMatch). §4.3 '이 발주의 급소'.
  forumName?: string;
  forumPhone?: string;
  signupNote?: string;
  consentForumMatch?: boolean;
};

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
const labelStyle: CSSProperties = { color: 'var(--color-text-secondary)', display: 'block' };

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="t-body"
      style={{
        flex: 1,
        minHeight: 'var(--tap-min)',
        borderRadius: 'var(--radius)',
        border: `1.5px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
        background: active ? 'var(--color-surface-1)' : 'transparent',
        color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

export function AuthGate({
  allowCoachApply = false,
  allowForumMatch = false,
  busy,
  onSignup,
  onLogin,
}: {
  allowCoachApply?: boolean;
  // `/signup`(일반 가입)에서만 켠다. `/join`(코드 가입)은 회기 코드가 곧 승인이라 대조 키가 필요 없다.
  allowForumMatch?: boolean;
  // **`title`·`onBack` 을 걷었다**(U-4 §1) — 헤더 전용 프롭이었다.
  //   제목은 `join/joinChrome` 이 들고 뒤로는 `JoinClient` 가 껍데기에 알린다.
  busy?: boolean;
  onSignup?: (p: SignupPayload) => void;
  onLogin?: (email: string, password: string) => void;
}) {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [religion, setReligion] = useState('');
  const [faithYears, setFaithYears] = useState('');
  const [coachApply, setCoachApply] = useState(false);
  const [phone, setPhone] = useState('');
  const [kpc, setKpc] = useState('');
  const [address, setAddress] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [consentPrivacy, setConsentPrivacy] = useState(false); // 필수 동의(미체크 시 가입 불가)
  const [consentSensitive, setConsentSensitive] = useState(false); // 선택 — 종교·신앙 입력 게이팅
  // 가입 경위·포럼 대조 키(/signup 전용).
  //   **5차 소건 4 — 강제 축이 뒤집혔다.** 가입 경위가 **필수**(대조 키로 승격), 포럼 이름·연락처는 **선택**.
  const [forumName, setForumName] = useState('');
  const [forumPhone, setForumPhone] = useState('');
  const [signupNote, setSignupNote] = useState('');
  const [consentForumMatch, setConsentForumMatch] = useState(false);

  const yearNum = Number(birthYear);
  const yearValid = /^\d{4}$/.test(birthYear) && yearNum >= 1900 && yearNum <= CURRENT_YEAR;
  const coachOn = allowCoachApply && coachApply;
  const phoneValid = phone.trim() !== ''; // 전 참여자 필수(연락처 확보 — ADR-75). 코치는 KPC 추가.
  const coachValid = !coachOn || KPC_RE.test(kpc.trim());
  // 폼이 유일 강제 지점(DB nullable): 이름·전화·성별·생년 + **개인정보 동의(필수)**. 민감(종교·신앙)은 선택 동의로 게이팅(ADR-76).
  // /signup 에서만 강제한다. *"이 필드가 없으면 승인 큐가 판단 불가로 쌓이고, 나중에 필드를 더해도
  //   이미 들어온 신청 건은 영원히 대조할 수 없다"* 는 §4.3 의 근거는 그대로 유효하다 —
  //   **바뀐 것은 그 자리를 무엇이 채우느냐다**(5차 소건 4).
  //
  //   포럼 이름·연락처를 필수로 두면 **포럼을 거치지 않고 온 사람이 가입할 수 없거나 지어낸다.**
  //   지어낸 값은 대조를 돕는 게 아니라 **운영자를 헷갈리게 한다** — 명단에 없는 이름이 뜨면
  //   오타인지 남의 것인지 판단할 수 없다. 반면 **가입 경위는 누구나 사실대로 쓸 수 있고**
  //   포럼 경유자면 거기에 포럼이 적힌다. 그래서 대조 키를 경위로 올리고 포럼 칸을 선택으로 내린다.
  const signupIntakeValid = !allowForumMatch || (signupNote.trim() !== '' && consentForumMatch);
  const signupValid = !!email && !!password && name.trim() !== '' && phoneValid && gender !== '' && yearValid && coachValid && consentPrivacy && signupIntakeValid;
  const loginValid = !!email && !!password;

  function submit() {
    if (busy) return;
    if (mode === 'login') {
      if (loginValid) onLogin?.(email, password);
      return;
    }
    if (!signupValid) return;
    const p: SignupPayload = { email, password, name: name.trim(), gender, birthYear: yearNum, phone: phone.trim(), consentSensitive };
    if (address.trim()) p.address = address.trim();
    if (bankAccount.trim()) p.bankAccount = bankAccount.trim();
    // 민감정보(종교·신앙)는 선택 동의한 경우에만 실림(미동의 시 수집 안 함).
    if (consentSensitive) {
      if (religion) p.religion = religion;
      const fy = Number(faithYears);
      if (faithYears.trim() && Number.isFinite(fy) && fy >= 0) p.faithYears = fy;
    }
    if (coachOn) {
      p.coachApply = true;
      p.kpc = kpc.trim();
    }
    if (allowForumMatch) {
      p.forumName = forumName.trim();
      p.forumPhone = forumPhone.trim();
      p.consentForumMatch = consentForumMatch;
      if (signupNote.trim()) p.signupNote = signupNote.trim();
    }
    onSignup?.(p);
  }

  return (
    <div>
      {/* **제목이 오면 그린다.** `/join` 은 단계마다 제목이 달라 여전히 넘기고(U-4),
          `/signup` 은 표가 들어 껍데기가 그리므로 넘기지 않는다 — 그러면 헤더가 둘이 되지 않는다. */}
      {/* **헤더는 껍데기가 그린다**(U-4 §1). 단계 제목·뒤로는 `join/joinChrome` 표가 들고 `useSetChrome` 이 껍데기에 알린다. */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
        <TabBtn active={mode === 'signup'} onClick={() => setMode('signup')}>처음이에요</TabBtn>
        <TabBtn active={mode === 'login'} onClick={() => setMode('login')}>계정이 있어요</TabBtn>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <label className="t-caption" style={labelStyle}>
          이메일
          <input style={inputStyle} type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="t-caption" style={labelStyle}>
          비밀번호
          <input style={inputStyle} type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder={mode === 'signup' ? '6자 이상' : '비밀번호'} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>

        {mode === 'signup' && (
          <>
            <label className="t-caption" style={labelStyle}>
              {coachOn ? '실명 (인도자는 실명으로)' : '이름 또는 별명'}
              <input style={inputStyle} type="text" autoComplete="name" placeholder={coachOn ? '실명을 입력해 주세요' : '표시할 이름'} value={name} onChange={(e) => setName(e.target.value)} />
            </label>

            <div>
              <span className="t-caption" style={labelStyle}>성별</span>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
                {GENDERS.map((g) => {
                  const on = gender === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className="t-body"
                      style={{
                        flex: 1,
                        minHeight: 'var(--tap-min)',
                        borderRadius: 'var(--radius)',
                        border: `1.5px solid ${on ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        background: on ? 'var(--color-accent-soft)' : 'var(--color-surface-2)',
                        color: on ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="t-caption" style={labelStyle}>
              태어난 해
              <input style={inputStyle} type="number" inputMode="numeric" placeholder="예: 1998" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} aria-label="태어난 해" />
            </label>

            <label className="t-caption" style={labelStyle}>
              전화번호
              <input style={inputStyle} type="tel" autoComplete="tel" placeholder="010-0000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="전화번호" />
            </label>

            <label className="t-caption" style={labelStyle}>
              주소 (선택)
              <input style={inputStyle} type="text" autoComplete="street-address" placeholder="도로명 주소 (선택)" value={address} onChange={(e) => setAddress(e.target.value)} aria-label="주소" />
            </label>

            <label className="t-caption" style={labelStyle}>
              입금 계좌 (선택 · 개근장학금)
              <input style={inputStyle} type="text" inputMode="numeric" placeholder="은행 계좌번호 (선택)" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} aria-label="입금 계좌" />
            </label>

            {/* 민감정보(종교·신앙)는 선택 동의한 경우에만 입력란 노출·수집(ADR-76·PIPA 별도동의) */}
            <ConsentBlock text={SENSITIVE_CONSENT} checked={consentSensitive} onChange={setConsentSensitive} />
            {consentSensitive && (
              <>
                <label className="t-caption" style={labelStyle}>
                  종교
                  <select style={inputStyle} value={religion} onChange={(e) => setReligion(e.target.value)} aria-label="종교">
                    <option value="">선택 안 함</option>
                    {RELIGIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </label>
                <label className="t-caption" style={labelStyle}>
                  신앙 연수
                  <input style={inputStyle} type="number" inputMode="numeric" placeholder="예: 10 (년)" value={faithYears} onChange={(e) => setFaithYears(e.target.value)} aria-label="신앙 연수" />
                </label>
              </>
            )}

            {allowCoachApply && (
              <label className="t-caption" style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                <input type="checkbox" checked={coachApply} onChange={(e) => setCoachApply(e.target.checked)} style={{ width: 18, height: 18 }} />
                인도자로 신청할게요
              </label>
            )}

            {coachOn && (
              <label className="t-caption" style={labelStyle}>
                KPC 인증번호
                <input style={inputStyle} type="text" placeholder="KPC12345" value={kpc} onChange={(e) => setKpc(e.target.value)} aria-label="KPC 인증번호" />
                {kpc.trim() !== '' && !KPC_RE.test(kpc.trim()) ? (
                  <span className="t-caption" style={{ color: 'var(--color-text-secondary)', display: 'block', marginTop: 'var(--space-1)' }}>형식: KPC + 숫자 5자리 (예: KPC12345)</span>
                ) : null}
              </label>
            )}

            {/* 가입 경위 · 포럼 대조 키(/signup 전용 · §4.3 · 5차 소건 4 로 축 교체).
                **가입 경위가 먼저 온다** — 필수 항목을 선택 항목 뒤에 두면 사람은 위부터 채우다
                선택 칸에서 막힌다. 순서가 곧 안내다.
                포럼 이름·전화는 계정 정보와 다를 수 있으므로 따로 받는다(덮어쓰지 않는다). */}
            {allowForumMatch && (
              <>
                <div className="t-body" style={{ fontWeight: 600, marginTop: 'var(--space-2)' }}>가입 경위</div>
                <p className="t-caption" style={{ color: 'var(--color-text-secondary)', marginTop: 'calc(var(--space-1) * -1)' }}>
                  어떻게 알고 오셨는지 한 줄로 적어 주세요. 운영자가 이 내용을 보고 자격을 확인합니다.
                </p>
                <label className="t-caption" style={labelStyle}>
                  가입 경위
                  <input
                    value={signupNote}
                    onChange={(e) => setSignupNote(e.target.value)}
                    maxLength={300}
                    placeholder="예: 촉진자포럼에서 안내받았습니다 / 000 인도자 소개"
                    style={inputStyle}
                  />
                </label>

                <div className="t-body" style={{ fontWeight: 600, marginTop: 'var(--space-2)' }}>촉진자포럼 가입 정보 (선택)</div>
                <p className="t-caption" style={{ color: 'var(--color-text-secondary)', marginTop: 'calc(var(--space-1) * -1)' }}>
                  촉진자포럼을 거쳐 오셨다면 그때 쓰신 이름과 연락처를 적어 주세요. 명단 확인에 사용합니다.
                </p>
                <label className="t-caption" style={labelStyle}>
                  포럼 가입 이름 (선택)
                  <input value={forumName} onChange={(e) => setForumName(e.target.value)} maxLength={40} style={inputStyle} />
                </label>
                <label className="t-caption" style={labelStyle}>
                  포럼 가입 연락처 (선택)
                  <input value={forumPhone} onChange={(e) => setForumPhone(e.target.value)} inputMode="tel" maxLength={20} style={inputStyle} />
                </label>
                <ConsentBlock text={FORUM_MATCH_CONSENT} checked={consentForumMatch} onChange={setConsentForumMatch} />
              </>
            )}

            {/* 개인정보 수집·이용 동의(필수) — 미체크 시 가입 버튼 비활성(ADR-76) */}
            <ConsentBlock text={PRIVACY_CONSENT} checked={consentPrivacy} onChange={setConsentPrivacy} />
          </>
        )}
      </div>

      <Button onClick={submit} disabled={busy || (mode === 'signup' ? !signupValid : !loginValid)} style={{ width: '100%', marginBottom: 'var(--space-3)' }}>
        {busy ? '처리 중…' : mode === 'signup' ? (coachOn ? '인도자로 신청하고 가입' : '가입하고 들어가기') : '로그인'}
      </Button>
      <p className="t-caption" style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-4)', textAlign: 'center' }}>
        {coachOn ? '신청은 운영자 승인 후 인도자로 활동합니다.' : '체크에 필요한 것만 묻습니다.'}
      </p>
    </div>
  );
}
