// 멤버 홈 본문(프레젠테이션 — 부수효과 없음). 인사 + 1차 행동([코드로 세미나 참여]) + 내 차수 자리.
// 참여자 팔레트·중립. danger/warning/care 의미색 0(§0.4). 셸 헤더·로그아웃은 /home 이 얹는다.
// [내 차수]는 다음 Step(1.2) 자리 — 라우트 미생성. 죽은 링크 금지 → 비활성(준비 중).
import type { CSSProperties } from 'react';

const cta: CSSProperties = { width: '100%', textDecoration: 'none' };

export function MemberHome({ greetingName }: { greetingName: string }) {
  return (
    <div>
      <p className="t-body-lg" style={{ color: 'var(--color-text)', margin: '0 0 var(--space-2)' }}>
        {greetingName}님, 반가워요.
      </p>
      <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-6)' }}>
        받은 코드로 세미나에 참여하고, 진단에 답해 보세요.
      </p>

      {/* 1차 행동 — 코드로 세미나 참여 */}
      <a className="ui-btn ui-btn--primary" href="/join" style={cta}>코드로 세미나 참여</a>

      {/* 내 차수 — Step 1.2 자리. 라우트 미생성(죽은 링크 금지) → 준비 중 비활성. */}
      <button
        type="button"
        disabled
        aria-disabled="true"
        className="ui-btn ui-btn--ghost"
        style={{ ...cta, marginTop: 'var(--space-3)' }}
      >
        내 차수 (준비 중)
      </button>
    </div>
  );
}
