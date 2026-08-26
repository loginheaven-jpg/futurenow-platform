// 소개 상세 — 공개(S-4).
//
// **`SeminarIntro` 단일 출처를 확장 재사용한다.** 소개 문안을 새로 쓰지 않는다 —
//   현관(`/`)·차수 미리보기(`CohortPreview`)가 이미 같은 컴포넌트를 쓰고 있고,
//   여기서 문장을 다시 쓰면 **사본이 셋**이 된다(발주서 §6 이 그 자리를 지목했다).
//   이 화면이 더하는 것은 문안이 아니라 **맥락**이다 — 어디로 갈 수 있는지.
import type { Metadata } from 'next';
import Link from 'next/link';
import { SeminarIntro } from '@/app/_screens/SeminarIntro';

export const metadata: Metadata = { title: '퓨처나우 소개' };

export default function AboutPage() {
  const muted = { color: 'var(--color-text-secondary)' } as const;
  return (
    <div className="pc-shell">
      <h1 className="t-h1" style={{ color: 'var(--color-primary)' }}>퓨처나우 소개</h1>
      <div className="pc-two" style={{ marginTop: 'var(--space-5)' }}>
        <div>
          {/* 단일 출처. 이 안의 문장은 여기서 고치지 않는다 — SeminarIntro 를 고치면 세 화면이 함께 움직인다. */}
          <SeminarIntro />
        </div>
        <aside style={{ display: 'grid', gap: 'var(--space-2)', alignContent: 'start' }}>
          <Link href="/recruit" className="ui-btn ui-btn--primary" style={{ textDecoration: 'none' }}>
            이번 기수 신청
          </Link>
          <Link href="/library" className="ui-listrow ui-listrow--tappable" style={{ textDecoration: 'none' }}>
            <span className="t-body">자료실</span>
          </Link>
          <Link href="/news" className="ui-listrow ui-listrow--tappable" style={{ textDecoration: 'none' }}>
            <span className="t-body">소식</span>
          </Link>
          <Link href="/contact" className="ui-listrow ui-listrow--tappable" style={{ textDecoration: 'none' }}>
            <span className="t-body">문의</span>
          </Link>
          <p className="t-caption" style={{ ...muted, marginTop: 'var(--space-3)' }}>
            이미 코드를 받으셨다면 <Link href="/join" style={{ color: 'var(--color-primary)' }}>입장하기</Link>로 들어오세요.
          </p>
        </aside>
      </div>
    </div>
  );
}
