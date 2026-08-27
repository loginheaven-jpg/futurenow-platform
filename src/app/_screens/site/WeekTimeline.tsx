// 부품 4 · WeekTimeline — 시안 P1 `.weeks` (4차 F-1 · 발주 §3-4).
//
// lg↑ 6열 · 그 아래 2열. 각 칸 상단 **2px 규칙선**이고 현재 회차만 골드로 바뀐다.
// **부품은 계산하지 않는다**(지휘부 강조 ①) — `current` 는 **prop 으로 받는다.**
//   지금이 몇 회차인지는 서버가 안다(`cohort_sessions` 개폐 판정). 부품이 날짜를 보지 않는다.
import './site.css';

export interface WeekCell {
  /** 회차 번호 표기(문자열 슬롯 — `1회차`·`WEEK 1` 무엇이든) */
  n: string;
  title: string;
  /** 그 회차의 산출물 한 줄(선택) */
  output?: string;
}

export function WeekTimeline({
  cells,
  /** 현재 회차의 **0-기준 인덱스**. 없으면 아무 칸도 강조하지 않는다. */
  currentIndex,
}: {
  cells: WeekCell[];
  currentIndex?: number;
}) {
  return (
    <ol className="site-weeks" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {cells.map((c, i) => (
        <li className={`site-weeks__cell${i === currentIndex ? ' is-current' : ''}`} key={c.n}
            aria-current={i === currentIndex ? 'step' : undefined}>
          <div className="site-weeks__n">{c.n}</div>
          <div className="site-weeks__t">{c.title}</div>
          {c.output ? <div className="site-weeks__out">{c.output}</div> : null}
        </li>
      ))}
    </ol>
  );
}
