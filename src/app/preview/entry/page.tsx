'use client';
// 진입 흐름 미리보기(개발용) — §7. 색·정렬·존대체·경고색 배제 확인용. 운영 라우트 아님.
// 게이트는 preview/layout.tsx(ADR-93).
import type { ReactNode } from 'react';
import { CodeInput } from '@/app/_screens/entry/CodeInput';
import { CohortPreview } from '@/app/_screens/entry/CohortPreview';
import { AuthGate } from '@/app/_screens/entry/AuthGate';
import { StartGuide } from '@/app/_screens/entry/StartGuide';
import type { CohortPreviewMeta } from '@/contracts';
import { AppHeader } from '@/app/_screens/AppHeader';
import { joinChrome, type JoinStep } from '@/app/(public)/join/joinChrome';

const sampleMeta: CohortPreviewMeta = {
  id: 'co1',
  name: '2026 봄 미래의 나 1기',
  description: '청년부와 함께하는 8주 여정이에요. 매주 목요일 저녁, 서로의 이야기를 나눕니다.',
  coachName: '김인도',
  instrumentId: 'futurenow',
  memberCount: 7,
  status: 'active',
  expiresAt: null,
};

// **부품이 헤더를 그만 그렸다**(U-4 §1) — 그래서 갤러리에서 제목이 사라질 뻔했다.
//   지우지 않고 **같은 표에서 읽어** 여기서 그린다(사본 둘을 만들지 않는다 · 불변식 23).
//   갤러리는 껍데기 밖이라 제목 바를 스스로 그려도 겹치지 않는다(`/preview` 면제).
function StepHeader({ step, isGeneral = false, cohortName }: { step: JoinStep; isGeneral?: boolean; cohortName?: string }) {
  const c = joinChrome(step, { isGeneral, cohortName, hasMeta: true });
  return c ? <AppHeader variant="sub" title={c.title} subtitle={c.subtitle} /> : null;
}

function Frame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ width: 360 }}>
      <div className="t-caption" style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>{label}</div>
      <div style={{ background: 'var(--color-bg)', border: 'var(--border-hair) solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
        {children}
      </div>
    </div>
  );
}

export default function EntryPreviewPage() {
  return (
    <div style={{ padding: 'var(--space-6)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-6)', alignItems: 'flex-start' }}>
      <Frame label="① 코드 입력">
        <StepHeader step="code" />
        <CodeInput />
      </Frame>
      <Frame label="② 회기 미리보기">
        <StepHeader step="preview" />
        <CohortPreview meta={sampleMeta} />
      </Frame>
      <Frame label="③ 로그인 / 가입">
        <StepHeader step="auth" />
        <AuthGate />
      </Frame>
      <Frame label="④ 시작 안내">
        <StepHeader step="start" cohortName="2026 봄 미래의 나 1기" />
        <StartGuide />
      </Frame>
    </div>
  );
}
