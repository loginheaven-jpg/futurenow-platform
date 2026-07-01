'use client';
// 참여 프로필 단계(§7 진단 전) — UX통합가입 S3 재편.
// 계정(user_profiles)에 성별·생년이 이미 있으면 프로필은 프리필·스킵하고 motivation(참여계기·선택)만 묻는다.
// 계정이 비었으면(구계정·폼 우회) 전체 프로필 + motivation 을 받고, 호출부가 계정에도 반영(setProfile).
// 참여자 화면: 경고색 0(§0.4), 측정·구인 어휘 0(§7). 실명·전화는 여기 없음(코어 소관).
import { useState, type CSSProperties } from 'react';
import type { UserProfile } from '@/contracts';
import { Button } from '@/core/ui';
import { AppHeader } from '../AppHeader';

export type ProfileStepResult = {
  motivation?: string;
  // 계정이 비어 이 단계에서 수집한 경우에만 — 호출부가 setProfile 로 계정 반영.
  profile?: { birthYear: number; gender: string; religion?: string; faithYears?: number };
};

const GENDERS = ['남성', '여성', '기타'];
const RELIGIONS = ['기독교', '천주교', '불교', '무교', '기타'];
const CURRENT_YEAR = 2026;

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
const fieldGap: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' };

export function ProfileForm({ accountProfile, onSubmit, busy }: { accountProfile: UserProfile | null; onSubmit: (r: ProfileStepResult) => void; busy?: boolean }) {
  // 계정에 성별·생년이 모두 있으면 프로필 수집 생략(프리필·스킵) — motivation 만.
  const accountComplete = !!accountProfile && accountProfile.gender != null && accountProfile.birthYear != null;

  const [birthYear, setBirthYear] = useState(accountProfile?.birthYear != null ? String(accountProfile.birthYear) : '');
  const [gender, setGender] = useState(accountProfile?.gender ?? '');
  const [religion, setReligion] = useState(accountProfile?.religion ?? '');
  const [faithYears, setFaithYears] = useState(accountProfile?.faithYears != null ? String(accountProfile.faithYears) : '');
  const [motivation, setMotivation] = useState('');

  const yearNum = Number(birthYear);
  const yearValid = /^\d{4}$/.test(birthYear) && yearNum >= 1900 && yearNum <= CURRENT_YEAR;
  const canSubmit = accountComplete || (yearValid && gender !== '');

  function submit() {
    if (busy || !canSubmit) return;
    const r: ProfileStepResult = {};
    if (motivation.trim()) r.motivation = motivation.trim();
    if (!accountComplete) {
      const p: ProfileStepResult['profile'] = { birthYear: yearNum, gender };
      if (religion) p.religion = religion;
      const fy = Number(faithYears);
      if (faithYears.trim() && Number.isFinite(fy) && fy >= 0) p.faithYears = fy;
      r.profile = p;
    }
    onSubmit(r);
  }

  return (
    <div>
      <AppHeader variant="flow" title="잠깐, 몇 가지만" subtitle="응답을 더 깊이 읽기 위한 준비예요" />

      <div style={fieldGap}>
        {!accountComplete && (
          <>
            <label className="t-caption" style={labelStyle}>
              태어난 해 (필수)
              <input style={inputStyle} type="number" inputMode="numeric" placeholder="예: 1998" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} aria-label="태어난 해" />
            </label>

            <div>
              <span className="t-caption" style={labelStyle}>성별 (필수)</span>
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
          </>
        )}

        {/* 참여계기(선택) — 사전 wave 스냅샷에만 담김(진단 소유) */}
        <label className="t-caption" style={labelStyle}>
          이 진단에 참여하게 된 계기가 있나요? (선택)
          <textarea
            style={{ ...inputStyle, minHeight: 72, padding: 'var(--space-3)', resize: 'vertical' }}
            placeholder="떠오르는 대로 편하게 적어 주세요"
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            maxLength={500}
            aria-label="참여 계기"
          />
        </label>
      </div>

      {!canSubmit ? (
        <p className="t-caption" style={{ color: 'var(--color-text-muted)', margin: 'var(--space-4) 0 0' }}>
          태어난 해와 성별을 입력해 주세요.
        </p>
      ) : null}

      <Button onClick={submit} disabled={busy || !canSubmit} style={{ width: '100%', marginTop: 'var(--space-6)' }}>
        다음
      </Button>
    </div>
  );
}
