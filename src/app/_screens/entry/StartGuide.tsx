'use client';
// §7.4 시작 안내 — 호흡 고르기. 버튼=동의(명시 체크박스 없음, 신뢰 기반).
//   열람 범위 고지는 여기 두지 않는다(ADR-185). 쓰기 직전에 '읽힌다'고 말하면 글이 달라진다.
//   그 고지의 자리는 가입 동의서다.
import { Button } from '@/core/ui';

// **`cohortName` 을 걷었다**(U-4 §1) — 이 부품에서 그 값이 하던 일은 **헤더 부제** 하나였고
//   그것은 통로가 든다(`joinChrome('start').subtitle`). **값이 사라진 것이 아니라 드는 곳이 옮겨졌다** —
//   같은 자리(제목 아래)에 같은 회기 이름이 그대로 선다.
export function StartGuide({ onStart }: { onStart?: () => void }) {
  return (
    <div>
      {/* 출구(홈) 제공 — sub 우상단 홈 아이콘(/home). 가입·시작 전이라 홈 이탈 안전(진행분 없음). */}
      {/* **헤더는 껍데기가 그린다**(U-4 §1). 단계 제목·뒤로는 `join/joinChrome` 표가 들고 `useSetChrome` 이 껍데기에 알린다. */}
      <p
        className="t-body-lg"
        style={{ color: 'var(--color-text)', lineHeight: 1.8, whiteSpace: 'pre-line', margin: '0 0 var(--space-6)' }}
      >
        {'정답을 찾는 시간이 아닙니다. 지금의 생각을 그대로 적어 주세요.\n중간에 멈춰도 적은 것은 저장됩니다.'}
      </p>
      <Button onClick={onStart} style={{ width: '100%' }}>시작하기</Button>
    </div>
  );
}
