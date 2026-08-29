'use client';
// §7.2 차수 미리보기 — resolve_cohort_by_code 공개 메타. 민감정보 미노출. 비로그인 표시 가능.
import type { CohortPreviewMeta } from '@/contracts';
import { Button } from '@/core/ui';
import { SeminarIntro } from '../SeminarIntro';
import { instrumentDisplay } from '../types';
import { TOOL } from '@/app/_vocab/tool';

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
      {/* **헤더는 껍데기가 그린다**(U-4 §1). 단계 제목·뒤로는 `join/joinChrome` 표가 들고 `useSetChrome` 이 껍데기에 알린다. */}
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
        {/* general 체험: 인도자·인원은 무의미(공개·운영자 소유) → 체험 문구로 대체. 진단은 유지(예상 시간 줄은 결재 ⑪ 로 걷었다). */}
        {isGeneral ? (
          <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-2)' }}>
            세미나 코드 없이 누구나 해볼 수 있는 {TOOL.trial}예요.
          </p>
        ) : (
          <>
            <Row label="인도자" value={meta.coachName ?? '—'} />
            <Row label="현재 인원" value={`${meta.memberCount}명`} />
          </>
        )}
        <Row label={TOOL.short} value={inst.label} />
        {/* ★ 「예상 시간 · 약 5분」을 걷었다(최박사 결재 ⑪ · 2026-08-30 — 10분 하나로 통일).
            `/recruit` 의 「약 10분」은 **신청 절차 전체**이고 이 줄은 **진단 자체**였다.
            값이 틀린 것이 아니라 **무엇의 시간인지가 안 적혀** 참여자에게 같게 들렸다.
            ★ `minutes` 값은 **지우지 않았다** — 「안 보이게 하라」를 「지워라」로 읽으면
            `instrumentDisplay` 타입을 쓰는 세 화면이 깨진다. 읽는 곳은 이 줄 하나뿐이었다(실측). */}
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
