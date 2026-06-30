'use client';
// 참여 프로필 입력(§7 진단 전 단계 · 지휘부 확정 2026-06-29). 생년·성별 필수, 종교·신앙연수 선택.
// 참여자 화면: 경고색 0(§0.4), 측정·구인 어휘 0(§7) — 순수 인적 스냅샷. 실명·전화는 여기 없음(코어 소관).
import { useState, type CSSProperties } from 'react';
import { Button } from '@/core/ui';
import { AppHeader } from '../AppHeader';

// type 별칭(인터페이스 아님) — 암묵적 인덱스 시그니처로 Record<string, unknown>(러너 prop)에 그대로 대입 가능.
export type ParticipantProfileInput = {
  birthYear: number;
  gender: string;
  religion?: string;
  faithYears?: number;
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

export function ProfileForm({ onSubmit }: { onSubmit: (p: ParticipantProfileInput) => void }) {
  const [birthYear, setBirthYear] = useState('');
  const [gender, setGender] = useState('');
  const [religion, setReligion] = useState('');
  const [faithYears, setFaithYears] = useState('');

  const yearNum = Number(birthYear);
  const yearValid = /^\d{4}$/.test(birthYear) && yearNum >= 1900 && yearNum <= CURRENT_YEAR;
  const canSubmit = yearValid && gender !== '';

  function submit() {
    if (!canSubmit) return;
    const p: ParticipantProfileInput = { birthYear: yearNum, gender };
    if (religion) p.religion = religion;
    const fy = Number(faithYears);
    if (faithYears.trim() && Number.isFinite(fy) && fy >= 0) p.faithYears = fy;
    onSubmit(p);
  }

  return (
    <div>
      <AppHeader variant="flow" title="잠깐, 몇 가지만" subtitle="응답을 더 깊이 읽기 위한 기본 정보예요" />

      <div style={fieldGap}>
        {/* 생년 (필수) */}
        <label className="t-caption" style={labelStyle}>
          태어난 해 (필수)
          <input
            style={inputStyle}
            type="number"
            inputMode="numeric"
            placeholder="예: 1985"
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            aria-label="태어난 해"
          />
        </label>

        {/* 성별 (필수) */}
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

        {/* 종교 (선택) */}
        <label className="t-caption" style={labelStyle}>
          종교 (선택)
          <select style={inputStyle} value={religion} onChange={(e) => setReligion(e.target.value)} aria-label="종교">
            <option value="">선택 안 함</option>
            {RELIGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>

        {/* 신앙 연수 (선택) */}
        <label className="t-caption" style={labelStyle}>
          신앙 연수 (선택)
          <input
            style={inputStyle}
            type="number"
            inputMode="numeric"
            placeholder="예: 10 (년)"
            value={faithYears}
            onChange={(e) => setFaithYears(e.target.value)}
            aria-label="신앙 연수"
          />
        </label>
      </div>

      {!canSubmit ? (
        <p className="t-caption" style={{ color: 'var(--color-text-muted)', margin: 'var(--space-4) 0 0' }}>
          태어난 해와 성별을 입력해 주세요.
        </p>
      ) : null}

      <Button onClick={submit} disabled={!canSubmit} style={{ width: '100%', marginTop: 'var(--space-6)' }}>
        다음
      </Button>
    </div>
  );
}
