// 부품 2 · GrowAxis — 시안 P1 `.grid-f` (4차 F-1 · 발주 §3-2).
//
// G·R·O·W·+F 다섯 축. **lg↑ 세로 5행 · md↓ 가로 5점 트랙**으로 접힌다(A 시안 journey-track 방식).
// **부품은 계산하지 않는다** — 다섯 행이 전부 prop 이다. 회차 표기도 문자열 슬롯이다.
// 좌측 골드 hairline 은 알파만 시안 값(.28)이고 색은 토큰이다 — **색값 이관 0**.
import './site.css';

export interface GrowAxisRow {
  /** 대문자 한 글자(또는 `+F`). */
  letter: string;
  /** 영문 소제 — GOAL·REALITY… */
  en: string;
  /** 한글 설명 */
  ko: string;
  /** 회차 표기 등 부기(선택) */
  note?: string;
}

export function GrowAxis({ rows }: { rows: GrowAxisRow[] }) {
  return (
    <div className="site-grow">
      {rows.map((r) => (
        <div className="site-grow__row" key={r.letter}>
          <span className="site-grow__l" aria-hidden>{r.letter}</span>
          <span className="site-grow__en">{r.en}</span>
          <span className="site-grow__ko">{r.ko}</span>
          {r.note ? <span className="site-grow__note">{r.note}</span> : null}
        </div>
      ))}
    </div>
  );
}
