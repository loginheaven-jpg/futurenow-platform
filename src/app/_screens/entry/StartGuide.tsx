'use client';
// §7.4 시작 안내 — 호흡 고르기 + 보안 고지. 버튼=동의(명시 체크박스 없음, 신뢰 기반).
import { Button } from '@/core/ui';
import { AppHeader } from '../AppHeader';

export function StartGuide({ cohortName, onStart }: { cohortName: string; onStart?: () => void }) {
  return (
    <div>
      {/* 출구(홈) 제공 — sub 우상단 홈 아이콘(/home). 가입·시작 전이라 홈 이탈 안전(진행분 없음). */}
      <AppHeader variant="sub" title="잠깐, 호흡 한 번" subtitle={cohortName} />
      <p
        className="t-body-lg"
        style={{ color: 'var(--color-text)', lineHeight: 1.8, whiteSpace: 'pre-line', margin: '0 0 var(--space-6)' }}
      >
        {'정답은 없습니다. 떠오르는 대로, 편하게 적어 주세요.\n중간에 멈췄다가 다시 와도 괜찮습니다.'}
      </p>
      <div
        style={{
          background: 'var(--color-surface-1)',
          border: 'var(--border-hair) solid var(--color-border)',
          borderRadius: 'var(--radius)',
          padding: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
          여기 적는 모든 것은 세미나 인도자와 운영자만 봅니다.
        </p>
      </div>
      <Button onClick={onStart} style={{ width: '100%' }}>시작하기</Button>
    </div>
  );
}
