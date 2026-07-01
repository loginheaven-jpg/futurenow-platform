'use client';
// §7.3 통합 가입/로그인 — /join·/signup 공유(allowCoachApply 로 인도자 섹션 분기). UX통합가입 S3.
// 가입 탭: 이름·성별·생년(필수·폼 강제) + 종교·신앙연수(선택). 인도자 체크 ON(allowCoachApply)이면 실명 안내 승격 + 전화 + KPC.
// 로그인 탭 유지(/join 재참여 기존 회원). metadata 는 프로필 필드만 전송(코치 신청은 세션 후 RPC·§3.4). 참여자 화면 경고색 배제(§0.4).
import { useState, type CSSProperties, type ReactNode } from 'react';
import { Button } from '@/core/ui';
import { AppHeader } from '../AppHeader';

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
};

const GENDERS = ['남성', '여성', '기타'];
const RELIGIONS = ['기독교', '천주교', '불교', '무교', '기타'];
const CURRENT_YEAR = 2026;
const KPC_RE = /^KPC\d{5}$/;

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
  title = '들어가기',
  busy,
  onSignup,
  onLogin,
}: {
  allowCoachApply?: boolean;
  title?: string;
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

  const yearNum = Number(birthYear);
  const yearValid = /^\d{4}$/.test(birthYear) && yearNum >= 1900 && yearNum <= CURRENT_YEAR;
  const coachOn = allowCoachApply && coachApply;
  const coachValid = !coachOn || (phone.trim() !== '' && KPC_RE.test(kpc.trim()));
  // 폼이 유일 강제 지점(DB nullable): 이름·성별·생년 필수(IdentityPolicy user.name='required' + 성별·생년 게이트).
  const signupValid = !!email && !!password && name.trim() !== '' && gender !== '' && yearValid && coachValid;
  const loginValid = !!email && !!password;

  function submit() {
    if (busy) return;
    if (mode === 'login') {
      if (loginValid) onLogin?.(email, password);
      return;
    }
    if (!signupValid) return;
    const p: SignupPayload = { email, password, name: name.trim(), gender, birthYear: yearNum };
    if (religion) p.religion = religion;
    const fy = Number(faithYears);
    if (faithYears.trim() && Number.isFinite(fy) && fy >= 0) p.faithYears = fy;
    if (coachOn) {
      p.coachApply = true;
      p.phone = phone.trim();
      p.kpc = kpc.trim();
    }
    onSignup?.(p);
  }

  return (
    <div>
      <AppHeader variant="flow" title={title} />
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
              종교 (선택)
              <select style={inputStyle} value={religion} onChange={(e) => setReligion(e.target.value)} aria-label="종교">
                <option value="">선택 안 함</option>
                {RELIGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>

            <label className="t-caption" style={labelStyle}>
              신앙 연수 (선택)
              <input style={inputStyle} type="number" inputMode="numeric" placeholder="예: 10 (년)" value={faithYears} onChange={(e) => setFaithYears(e.target.value)} aria-label="신앙 연수" />
            </label>

            {allowCoachApply && (
              <label className="t-caption" style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                <input type="checkbox" checked={coachApply} onChange={(e) => setCoachApply(e.target.checked)} style={{ width: 18, height: 18 }} />
                인도자(코치)로 신청할게요
              </label>
            )}

            {coachOn && (
              <>
                <label className="t-caption" style={labelStyle}>
                  전화번호
                  <input style={inputStyle} type="tel" autoComplete="tel" placeholder="010-0000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </label>
                <label className="t-caption" style={labelStyle}>
                  KPC 인증번호
                  <input style={inputStyle} type="text" placeholder="KPC12345" value={kpc} onChange={(e) => setKpc(e.target.value)} aria-label="KPC 인증번호" />
                  {kpc.trim() !== '' && !KPC_RE.test(kpc.trim()) ? (
                    <span className="t-caption" style={{ color: 'var(--color-text-secondary)', display: 'block', marginTop: 'var(--space-1)' }}>형식: KPC + 숫자 5자리 (예: KPC12345)</span>
                  ) : null}
                </label>
              </>
            )}
          </>
        )}
      </div>

      <Button onClick={submit} disabled={busy || (mode === 'signup' ? !signupValid : !loginValid)} style={{ width: '100%', marginBottom: 'var(--space-3)' }}>
        {busy ? '처리 중…' : mode === 'signup' ? (coachOn ? '인도자로 신청하고 가입' : '가입하고 들어가기') : '로그인'}
      </Button>
      <p className="t-caption" style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-4)', textAlign: 'center' }}>
        {coachOn ? '신청은 운영자 승인 후 인도자로 활동합니다.' : '진단에 필요한 것만 묻습니다.'}
      </p>
    </div>
  );
}
