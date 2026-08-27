// 차수 홈의 **표시 층** — 시안 C(내 여정) (4차 F-4).
//
// **화면도 계산하지 않는다**(F-3 `HomeScreen` 과 같은 구조). `page.tsx` 가 데이터를 읽고
//   ADR-80·86·102 의 판정을 하며, 여기는 **받은 것만 그린다.**
//   그래서 세션 없이 렌더되고 4폭 캡처와 단언이 가능하다.
//
// **진행 표시는 막대가 아니다.** 시안 C 의 `.p-track`/`.p-fill` 은 **불채택**이다 —
//   불변식 11(*갈무리에 막대·게이지를 두지 않는다* · ADR-86). 시안 note 스스로
//   *"진행 표시는 위치 안내일 뿐 성취 지표가 아니다"* 라 적었는데 연속 채움 막대는
//   시각 어휘상 성취 게이지다. **의도와 형태가 따로 놀았고, 점 표시가 그 의도의 정확한 구현이다**
//   (지휘부 판정 2026-08-27). 캡션급 위계도 그대로 둔다(ADR-81 3단에 넷째를 끼우지 않는다).
import Link from 'next/link';
import { SiteGnb } from '@/app/_screens/site/SiteGnb';
import { SectionTitle } from '@/app/_screens/site/SectionTitle';
import type { MenuGroup } from '@/app/_screens/site/MenuSheet';
import type { SessionChip } from '@/app/_screens/site/SessionChipStrip';
import '@/app/_screens/site/site.css';

export interface CohortListRow {
  key: string;
  title: string;
  /** 오른쪽 보조 문장. 없으면 그리지 않는다. */
  note?: string;
  /** 없으면 **링크가 아니다** — 갈 수 없는 곳으로 보내지 않는다. */
  href?: string;
}

export interface CohortHomeScreenProps {
  who: { name: string; role: string; cohort?: string };
  /** 시안 C `.my-head` — `{이름} 님의 여정` + `PART 1 · GOAL — 미래의 나를 만나다`. */
  head: { hello: string; part?: string | null; title?: string | null };
  /** 진행 — **점 표시**(막대 아님). 없으면 그리지 않는다(일정 미등록). */
  progress?: { label: string; cells: boolean[]; done: number; total: number; cohortName?: string } | null;
  /** 시안 C `.today-card` — 오늘의 갈무리. 열린 회차가 없으면 없다. */
  today?: { tag: string; title: string; line?: string; cta: { href: string; label: string } } | null;
  /** 사전진단 미완 등 **오늘보다 먼저 와야 하는 카드**(ADR-80 순서 규칙). */
  before?: React.ReactNode;
  /** 시안 C `.my-list` — 나의 기록. */
  rows: CohortListRow[];
  /** 목록 아래에 붙는 나머지(한 걸음·가치 카드·지난 회차). */
  children?: React.ReactNode;
  groups: MenuGroup[];
  chips: SessionChip[];
}

export function CohortHomeScreen({
  who, head, progress, today, before, rows, children, groups, chips,
}: CohortHomeScreenProps) {
  return (
    <>
      <SiteGnb
        logo={<>퓨처<b>나우</b></>}
        en="FUTURE NOW"
        variant="member"
        sheet={{ name: who.name, role: who.role, cohort: who.cohort, groups, chips }}
      />

      <div className="home-shell">
        <header className="cohort-head">
          <div className="cohort-head__hello">{head.hello}</div>
          {head.part || head.title ? (
            <h1 className="cohort-head__t">
              {head.part ? <span className="cohort-head__part">{head.part}</span> : null}
              {head.part && head.title ? ' — ' : null}
              {head.title}
            </h1>
          ) : null}
        </header>

        {/* 시안 `.progress` 의 자리 · 형태는 점이다(위 주석). `.p-meta` 의 두 값은 그대로 든다. */}
        {progress ? (
          <div className="cohort-progress">
            {/* **점이 무엇을 세는지 이름이 있어야 한다.** 라벨을 떨어뜨리면 점만 남아
                무엇의 진행인지 알 수 없다(F-4 착수 중 자기 회귀로 잡았다). */}
            <span>{progress.label}</span>
            <span aria-hidden="true" className="cohort-progress__dots">
              {progress.cells.map((on, i) => (
                <span key={i} className={on ? 'is-on' : undefined}>{on ? '●' : '○'}</span>
              ))}
            </span>
            <span>{progress.done} / {progress.total} 완료</span>
            {progress.cohortName ? <span className="cohort-progress__who">{progress.cohortName}</span> : null}
          </div>
        ) : null}

        {before ?? null}

        {today ? (
          <section className="cohort-today">
            <div className="cohort-today__tag">{today.tag}</div>
            <h2 className="cohort-today__t">{today.title}</h2>
            {today.line ? <p className="cohort-today__p">{today.line}</p> : null}
            <Link
              href={today.cta.href}
              className="ui-btn ui-btn--primary"
              style={{ width: '100%', textDecoration: 'none' }}
            >
              {today.cta.label}
            </Link>
          </section>
        ) : null}

        {rows.length > 0 ? (
          <section className="home-sect">
            <SectionTitle title="나의 기록" as="h2" />
            <ul className="cohort-rows">
              {rows.map((r) => {
                const body = (
                  <>
                    <span className="cohort-rows__t">{r.title}</span>
                    {r.note ? <span className="cohort-rows__s">{r.note}</span> : null}
                  </>
                );
                return (
                  <li key={r.key}>
                    {r.href ? (
                      <Link href={r.href} className="cohort-rows__row">{body}</Link>
                    ) : (
                      // 갈 곳이 없으면 링크로 만들지 않는다 — 눌리는데 아무 일도 없는 것이 가장 나쁘다.
                      <span className="cohort-rows__row">{body}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {children ? <div className="home-sect">{children}</div> : null}
      </div>
    </>
  );
}
