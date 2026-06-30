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

export function CohortPreview({ meta, onEnter, onCancel }: { meta: CohortPreviewMeta; onEnter?: () => void; onCancel?: () => void }) {
  const inst = instrumentDisplay(meta.instrumentId);
  return (
    <div>
      <AppHeader variant="flow" title="이 모임에 들어갑니다" />
      <div
        style={{
          background: 'var(--color-surface-2)',
          border: 'var(--border-hair) solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-6)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <div className="t-h1" style={{ color: 'var(--color-primary)', marginBottom: 'var(--space-4)' }}>{meta.name}</div>
        <Row label="인도자" value={meta.coachName ?? '—'} />
        <Row label="현재 인원" value={`${meta.memberCount}명`} />
        <Row label="진단" value={inst.label} />
        <Row label="예상 시간" value={`약 ${inst.minutes}분`} />
      </div>

      {/* 공통 소개(SeminarIntro 단일 출처 — 랜딩과 공유). 차수별 소개(description)는 후속(RPC 마이그 필요). */}
      <SeminarIntro />

      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <Button variant="ghost" onClick={onCancel} style={{ flex: 1 }}>아니에요</Button>
        <Button onClick={onEnter} style={{ flex: 2 }}>들어가기</Button>
      </div>
    </div>
  );
}
