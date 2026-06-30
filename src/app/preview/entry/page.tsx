'use client';
// 진입 흐름 미리보기(개발용) — §7. 색·정렬·존대체·경고색 배제 확인용.
import type { ReactNode } from 'react';
import { CodeInput } from '@/app/_screens/entry/CodeInput';
import { CohortPreview } from '@/app/_screens/entry/CohortPreview';
import { AuthGate } from '@/app/_screens/entry/AuthGate';
import { StartGuide } from '@/app/_screens/entry/StartGuide';
import type { CohortPreviewMeta } from '@/contracts';

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
        <CodeInput />
      </Frame>
      <Frame label="② 차수 미리보기">
        <CohortPreview meta={sampleMeta} />
      </Frame>
      <Frame label="③ 로그인 / 가입">
        <AuthGate />
      </Frame>
      <Frame label="④ 시작 안내">
        <StartGuide cohortName="2026 봄 미래의 나 1기" />
      </Frame>
    </div>
  );
}
