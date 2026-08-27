// 진단 홈의 **표시 층** — 시안 F (4차 F-4).
//
// **화면도 계산하지 않는다**(F-3 `HomeScreen` 과 같은 구조). 자격 게이트·항목 판정은
//   `page.tsx` 가 하고 여기는 받은 것만 그린다. 세션 없이 렌더돼 4폭 캡처가 가능하다.
//
// **상태를 색으로 말하지 않는다**(불변식 9 · 발주서 §7.3). 시안 F 의 `.a-item.done`/`.wait` 를
//   색 분기로 옮기지 않았다 — `완료`·`대기`·`시작` 은 **낱말**이고 테두리 한 겹만 붙는다.
//   닫힌 항목은 링크가 아니고, 그 사실도 문장이 말한다.
//
// **아이콘은 인라인 SVG 다**(§5-3). 시안의 `◎ ◈ ◆ ◑ ♡` 는 문자 기호라 쓰지 않는다 —
//   기기·폰트마다 굵기가 달라지고 `currentColor` 로 통제되지 않는다.
import Link from 'next/link';
import { SiteGnb } from '@/app/_screens/site/SiteGnb';
import { SectionTitle } from '@/app/_screens/site/SectionTitle';
import type { MenuGroup } from '@/app/_screens/site/MenuSheet';
import type { SessionChip } from '@/app/_screens/site/SessionChipStrip';
import '@/app/_screens/site/site.css';

/** 시안 F 의 다섯 아이콘 자리 — 전부 stroke SVG 다. */
export type AssessIcon = 'pre' | 'post' | 'value' | 'shadow' | 'love';

function Icon({ name }: { name: AssessIcon }) {
  const p: Record<AssessIcon, React.ReactNode> = {
    pre: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></>,
    post: <><circle cx="12" cy="12" r="8" /><path d="M8 12l3 3 5-6" /></>,
    value: <path d="M12 4l2.4 5.2L20 10l-4 3.9.9 5.6L12 16.9 7.1 19.5 8 13.9 4 10l5.6-.8z" />,
    shadow: <><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 0 0 16z" /></>,
    love: <path d="M12 19s-6-3.9-6-8a3.4 3.4 0 0 1 6-2.1A3.4 3.4 0 0 1 18 11c0 4.1-6 8-6 8z" />,
  };
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
      {p[name]}
    </svg>
  );
}

export interface AssessItem {
  key: string;
  icon: AssessIcon;
  title: string;
  /** 보조 문장 — 언제 열리는지, 무엇을 묻는지. **닫힘도 여기서 말한다.** */
  note: string;
  /** `완료` · `대기` · `시작` — **낱말이다.** 없으면 그리지 않는다. */
  status?: string;
  /** 없으면 링크가 아니다 — 갈 수 없는 곳으로 보내지 않는다. */
  href?: string;
}

export interface AssessSection {
  title: string;
  /** 구획 제목 옆 한 줄 — 시안 `.h .d`(`예봄 2기` · `언제든`). */
  desc?: string;
  items: AssessItem[];
}

export interface AssessmentsScreenProps {
  who: { name: string; role: string; cohort?: string };
  heading: { title: string; lead: string };
  sections: AssessSection[];
  /** 열람 고지 — **동의가 아니라 알림**이다(IA §4.2 ①). 토글을 두지 않는다. */
  privacy: React.ReactNode;
  groups: MenuGroup[];
  chips: SessionChip[];
}

export function AssessmentsScreen({ who, heading, sections, privacy, groups, chips }: AssessmentsScreenProps) {
  return (
    <>
      <SiteGnb
        logo={<>퓨처<b>나우</b></>}
        en="FUTURE NOW"
        variant="member"
        currentPath="/home/assessments"
        sheet={{ name: who.name, role: who.role, cohort: who.cohort, groups, chips }}
      />

      <div className="home-shell">
        <header className="assess-head">
          <h1 className="assess-head__t">{heading.title}</h1>
          <p className="assess-head__p">{heading.lead}</p>
        </header>

        {sections.map((sec) => (
          <section className="assess-sec" key={sec.title}>
            <SectionTitle title={sec.title} desc={sec.desc} as="h2" />
            {sec.items.map((it) => {
              const body = (
                <>
                  <span className="assess-item__ico"><Icon name={it.icon} /></span>
                  <span className="assess-item__b">
                    <span className="assess-item__t">{it.title}</span>
                    <span className="assess-item__s">{it.note}</span>
                  </span>
                  {it.status ? <span className="assess-item__st">{it.status}</span> : null}
                </>
              );
              return it.href ? (
                <Link key={it.key} href={it.href} className="assess-item">{body}</Link>
              ) : (
                <div key={it.key} className="assess-item">{body}</div>
              );
            })}
          </section>
        ))}

        <p className="assess-priv">{privacy}</p>
      </div>
    </>
  );
}
