// 개인 리포트 상단 신상정보 패널(코치/운영자 전용). cohort_member_detail(ADR-75) 결과 표시.
//   화면 전용(.no-print) — 연락처·개인정보는 공유 가능한 PDF 에 싣지 않는다(임상 리포트는 진단에 집중).
//   전화·이메일은 tel/mailto 링크(바로 연락). 참여 이력은 호출자 가시 범위(운영자=전체·코치=자기 차수)로 스코프됨.
import type { ReactNode } from 'react';
import type { CohortMemberDetail } from '@/contracts';
import { CURRENT_YEAR } from '@/instruments/futurenow/profileVocab';

const GENDER_LABEL: Record<string, string> = { 남: '남성', 여: '여성' };
const linkStyle = { color: 'var(--color-primary)', textDecoration: 'none', wordBreak: 'break-all' as const };

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
      <dt className="t-caption" style={{ color: 'var(--color-text-muted)', width: 64, flexShrink: 0 }}>{label}</dt>
      <dd className="t-caption" style={{ color: 'var(--color-text)', margin: 0, wordBreak: 'break-all' }}>{children}</dd>
    </div>
  );
}

export function MemberProfilePanel({ detail }: { detail: CohortMemberDetail }) {
  const age = detail.birthYear ? CURRENT_YEAR - detail.birthYear + 1 : null; // 연도 기준 세는 나이 근사
  const gender = detail.gender ? (GENDER_LABEL[detail.gender] ?? detail.gender) : '—';
  return (
    <section
      className="no-print"
      style={{ border: 'var(--border-hair) solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', marginBottom: 'var(--space-4)', background: 'var(--color-surface-1)' }}
    >
      <h2 className="t-caption" style={{ color: 'var(--color-text-secondary)', letterSpacing: 1, margin: '0 0 var(--space-2)' }}>신상정보</h2>
      <div className="t-h2" style={{ color: 'var(--color-primary)', fontSize: 18, marginBottom: 'var(--space-3)' }}>{detail.name ?? '참여자'}</div>

      {/* 연락 — 바로 전화/메일 */}
      <dl style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', margin: '0 0 var(--space-3)' }}>
        <Field label="전화">
          {detail.phone ? <a href={`tel:${detail.phone.replace(/[^0-9+]/g, '')}`} style={linkStyle}>{detail.phone}</a> : <span style={{ color: 'var(--color-text-muted)' }}>미등록</span>}
        </Field>
        <Field label="이메일">
          {detail.email ? <a href={`mailto:${detail.email}`} style={linkStyle}>{detail.email}</a> : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
        </Field>
        <Field label="주소">
          <span style={{ color: detail.address ? 'var(--color-text)' : 'var(--color-text-muted)' }}>{detail.address ?? '미등록'}</span>
        </Field>
      </dl>

      {/* 프로필 */}
      <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-1) var(--space-4)', margin: '0 0 var(--space-3)' }}>
        <Field label="성별">{gender}</Field>
        <Field label="나이">{detail.birthYear ? `${detail.birthYear}년생${age ? ` (${age}세)` : ''}` : '—'}</Field>
        <Field label="종교">{detail.religion ?? '—'}</Field>
        <Field label="신앙연수">{detail.faithYears != null ? `${detail.faithYears}년` : '—'}</Field>
      </dl>

      {/* 참여 이력(가시 범위 스코프) */}
      <div className="t-caption" style={{ color: 'var(--color-text-secondary)', borderTop: 'var(--border-hair) solid var(--color-border)', paddingTop: 'var(--space-2)' }}>
        참여 이력 · 응답 {detail.responseCount}건{detail.cohortNames.length ? ` · ${detail.cohortNames.join(', ')}` : ''}
      </div>
    </section>
  );
}
