// 통합 홈의 **표시 층** — 시안 B(로그인 홈) + E(전체 메뉴 시트) (4차 F-3).
//
// **화면도 계산하지 않는다.** F-1 강조 ①(*부품은 계산하지 않는다*)을 한 층 올린 것이다 —
//   `page.tsx` 가 데이터를 읽고 `roleTarget`·`buildSessionChips` 가 판정하며,
//   여기는 **받은 것만 그린다.** 그래서 세션 없이도 렌더되고 4폭 캡처가 가능하다
//   (`/home` 은 인증 뒤라 QA 계정이 없으면 열 수 없다 — F-1 이 `/preview/site` 로 푼 문제와 같다).
//
// **`MemberHome` 은 `children` 으로 받는다.** 그 안의 운영 카드·진행 중 진단·내 활동은
//   이번 회차의 무접촉 대상이라 여기서 조립하지 않는다.
import Link from 'next/link';
import { SiteRoleCard } from '@/app/_screens/site/RoleCard';
import { QuickTiles, type QuickTile } from '@/app/_screens/site/QuickTiles';
import { SectionTitle } from '@/app/_screens/site/SectionTitle';
import { NewsRow, type NewsRowItem } from '@/app/_screens/site/NewsRow';
import '@/app/_screens/site/site.css';

export interface HomeScreenProps {
  /** 시트 머리에 서는 이름·역할·회기. */
  /** **걷었다**(U-2 §3) — 시트 자료는 껍데기가 든다. 화면이 나르지 않는다.
   *  `who`·`groups`·`chips` 가 여기 있던 자리다. */
  /**
   * 역할 카드 — `roleTargets()` 의 산출. **여럿일 수 있다**(5차 T-5 · 겸직).
   * **화면은 세지 않는다** — 몇 장을 그릴지는 배열 길이가 이미 말한다(부품은 계산하지 않는다).
   */
  roles: { badge?: string; who: string; title: string; sub?: string; href: string; ctaLabel: string }[];
  tiles: QuickTile[];
  news: NewsRowItem[];
  /** 복귀 안내(ADR-91 B). 판정은 페이지가 하고 여기는 자리만 준다. */
  prompt?: React.ReactNode;
  /** `MemberHome` — 이번 회차 무접촉. */
  children?: React.ReactNode;
}

export function HomeScreen({ roles, tiles, news, prompt, children }: HomeScreenProps) {
  return (
    <>
      {/* **상단바는 껍데기가 그린다**(U-2 · §12.3 규칙 1). 시트도 껍데기가 든다(§3). */}

      <div className="home-shell">
        {prompt ?? null}

        {/* 역할 카드 — 시안 B `.role-card`. 가두지 않는다(ADR-51): 아래 본문이 다른 길을 계속 연다.
            **5차 T-5 — 겸직자에게는 둘이 선다**(인도자/운영자 카드 + 참여자 카드).
            늘어나는 것은 카드 수뿐이고 목적지는 한 곳도 바뀌지 않았다. */}
        {roles.map((role) => (
          <SiteRoleCard
            key={role.href}
            badge={role.badge}
            who={role.who}
            title={role.title}
            sub={role.sub}
            cta={{ href: role.href, label: role.ctaLabel }}
          />
        ))}

        {/* 시안 B `.quick` — 갈 수 없는 곳은 페이지가 칸을 빼고 준다. 비면 구획째 그리지 않는다. */}
        {tiles.length > 0 ? (
          <section className="home-sect">
            <SectionTitle title="바로가기" as="h2" />
            <QuickTiles tiles={tiles} />
          </section>
        ) : null}

        {/* 시안 B `.notice` — 소식이 없으면 구획째 그리지 않는다(현관과 같은 규율). */}
        {news.length > 0 ? (
          <section className="home-sect">
            <SectionTitle title="소식" as="h2" action={<Link href="/news">더 보기</Link>} />
            <NewsRow items={news} />
          </section>
        ) : null}

        {children ? <div className="home-sect">{children}</div> : null}
      </div>
    </>
  );
}
