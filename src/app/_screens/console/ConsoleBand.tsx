'use client';
// 회기 띠 — **회기 칩 + 탭 한 줄** (U-5 · 지휘부 결재 2026-09-03).
//
// ─────────────────────────────────────────────────────────────────────────────
// **왜 껍데기가 아니라 회기 레이아웃이 그리는가.**
//   회기 이름은 **서버 데이터**라 껍데기(`/coach/layout`)가 알 수 없다 —
//   그 레이아웃은 `[cohortId]` 세그먼트 **위**에 있어 Next 16 이 params 를 주지 않는다.
//
//   통로(`chromeContext`)로 올리는 안을 **실측으로 버렸다**: 통로는 `useEffect` 로 값을 얹으므로
//   **첫 그림에는 이름이 없다.** 칩이 한 프레임 뒤에 끼어들면서 탭이 오른쪽으로 밀린다.
//   여기서 그리면 이름이 **서버 HTML 에 실려** 깜빡임도 밀림도 없다.
//
//   덤으로 **최박사 결재가 걸린 파일을 한 줄도 건드리지 않는다** —
//   `chromeContext` 의 「`subtitle` 은 쓰지 않는다」가 그대로 참으로 남는다(불변식 22).
//
// **띠는 `.console-main` 의 첫 요소**다. 그 자리에 여백이 없어(실측 — CSS 규칙이 `display:block`
//   하나뿐이다) 벨트 바로 아래에 붙는다.
//
// **칩은 부제가 아니라 문**이다 — 누르면 회기 목록으로 간다(결재 물음 1 답).
//   그 자리에서 펼치는 안은 새 부품이 필요해 불변식 20 에 걸린다.
// ─────────────────────────────────────────────────────────────────────────────
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cohortTabs, currentHref, TAB_GROUP } from './consoleNav';

/** 회기 칩이 여는 문 — 회기 목록. */
const COHORT_LIST = '/coach/cohorts';

export function ConsoleBand({ cohortId, name }: { cohortId: string; name: string | null }) {
  const pathname = usePathname() ?? '';
  const items = cohortTabs(cohortId);
  // 켜질 항목은 **가장 긴 일치**가 정한다 — 내비에 없는 화면(리포트 상세·조원)에서도
  //   상위 문맥이 켜져 자기 위치를 잃지 않는다(`consoleNav` 의 규율을 그대로 쓴다).
  const current = currentHref([{ title: TAB_GROUP, items }], pathname);

  return (
    <nav className="console-tabs" aria-label={TAB_GROUP}>
      {/* 이름을 못 받았으면 **칩을 그리지 않는다**(조회 실패·권한 밖). 무엇을 가리키는지
          모르는 문을 세우지 않는다 — 탭만 서고 띠 높이는 그대로다. */}
      {name ? (
        <Link className="console-cohort" href={COHORT_LIST} title="회기 목록으로">
          {name}
        </Link>
      ) : null}
      <div className="console-tabs__scroll">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            aria-current={current === it.href ? 'page' : undefined}
            className={`console-tab${current === it.href ? ' is-current' : ''}`}
          >
            {it.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
