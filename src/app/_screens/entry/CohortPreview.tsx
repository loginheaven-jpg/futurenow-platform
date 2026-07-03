'use client';
// §7.2 차수 미리보기 — resolve_cohort_by_code 공개 메타. 민감정보 미노출. 비로그인 표시 가능.
import type { CohortPreviewMeta } from '@/contracts';
import { Button } from '@/core/ui';
import { AppHeader } from '../AppHeader';
import { SeminarIntro } from '../SeminarIntro';
import { instrumentDisplay } from '../types';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-3) 0', borderTop: 'var(--border-hair) solid var(--color-border)' }}>
      <span className="t-body" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span className="t-body" style={{ color: 'var(--color-text)' }}>{value}</span>
    </div>
  );
}

export function CohortPreview({ meta, onEnter, onCancel, busy, isGeneral = false }: { meta: CohortPreviewMeta; onEnter?: () => void; onCancel?: () => void; busy?: boolean; isGeneral?: boolean }) {
  const inst = instrumentDisplay(meta.instrumentId);
  return (
    <div>
      {/* 출구(홈) 제공 — sub 우상단 홈 아이콘(/home). 뒤로는 아래 '아니에요'(→코드)로. */}
      <AppHeader variant="sub" title={isGeneral ? '체험 진단' : '이 모임에 들어갑니다'} />
      <div
        style={{
          background: 'var(--color-surface-2)',
          border: 'var(--border-hair) solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-6)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <div className="t-h1" style={{ color: 'var(--color-primary)', marginBottom: meta.description ? 'var(--space-2)' : 'var(--space-4)' }}>{meta.name}</div>
        {meta.description ? (
          <p className="t-body" style={{ color: 'var(--color-text-secondary)', whiteSpace: 'pre-line', margin: '0 0 var(--space-4)' }}>{meta.description}</p>
        ) : null}
        {/* general 체험: 인도자·인원은 무의미(공개·운영자 소유) → 체험 문구로 대체. 진단·예상 시간은 유지. */}
        {isGeneral ? (
          <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-2)' }}>
            세미나 코드 없이 누구나 해볼 수 있는 체험 진단이에요.
          </p>
        ) : (
          <>
            <Row label="인도자" value={meta.coachName ?? '—'} />
            <Row label="현재 인원" value={`${meta.memberCount}명`} />
          </>
        )}
        <Row label="진단" value={inst.label} />
        <Row label="예상 시간" value={`약 ${inst.minutes}분`} />
      </div>

      {/* 공통 소개(SeminarIntro 단일 출처 — 랜딩과 공유). 차수별 소개(description)는 위 카드 이름 아래. */}
      <SeminarIntro />

      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <Button variant="ghost" onClick={onCancel} disabled={busy} style={{ flex: 1 }}>아니에요</Button>
        <Button onClick={onEnter} disabled={busy} style={{ flex: 2 }}>{busy ? '들어가는 중…' : isGeneral ? '체험 시작하기' : '들어가기'}</Button>
      </div>
    </div>
  );
}
