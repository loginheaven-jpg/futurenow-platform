// 공용 회기 모집 랜딩(/recruit) — 카드뉴스 13장의 웹 판. 카톡에 링크로 돌리는 물건이다.
//
// **가입 링크(/join?code=…)와 다른 물건이다**(지휘부 확정 2026-08-19). /join 은 그 회기의 가입 + 사전 체크
//   진입로이고 이미 살아 있다 — 이 작업은 /join 을 한 줄도 건드리지 않는다. 랜딩은 그 주소로 링크만 건다.
//   그래서 발주서 §3.1("경로 = /join")과 §3.7("QR은 랜딩을 가리킨다")은 폐기됐다. QR·카드뉴스는 가입 링크를 직접 가리킨다.
//
// 공개 라우트다. PROTECTED_PREFIXES(src/proxy.guard.ts)에 /recruit 가 없으므로 별도 설정 없이 비인증 열람된다.
//   보호 목록에 넣지 않는 것이 의도다 — 로그인 벽 뒤에 갇히면 모집이 통째로 죽는다.
//
// 서버 컴포넌트다. 상태가 상수(intake.ts)에서 오고 사용자별로 달라지는 것이 없어 동적일 이유가 없다.
//   'use client' 는 클립보드를 쓰는 계좌 복사 버튼 하나에만 붙였다.
import Link from 'next/link';
import type { Metadata } from 'next';
import { AccountCopy } from './AccountCopy';
import { CURRENT_INTAKE, STATUS_COPY, joinHref, seatsRemaining } from './intake';
import { seatsTaken } from './seats';
import { APPLY, AUDIENCE, FEE, HERO, JOURNEY, META, ONLINE, PROBLEM, RESULT, SCHEDULE, SEATS_LEFT, TEAM, VOICES, WHAT } from './copy';
import { RECRUIT_CARDS } from './cards';
import './recruit.css';

// 남은 자리를 DB 에서 읽으므로 완전 정적은 아니다. 대신 **ISR** 로 캐시를 지킨다 —
//   CDN 이 계속 캐시를 내주고 5분마다 다시 만든다. 카톡으로 수십 명이 동시에 여는 링크라
//   요청마다 DB 를 때리는 동적 렌더는 쓰지 않는다. 남은 자리에 몇 분의 지연은 문제가 아니다.
export const revalidate = 300;

/** 카톡 미리보기 대체 텍스트 — 옛 `opengraph-image.alt.txt` 가 들던 문장 그대로다. */
const OG_ALT = '꿈꾸는 미래를 지금 살자 · 퓨처나우 셀프코칭 세미나 예봄 2기';

export const metadata: Metadata = {
  title: META.title,
  description: META.description,
  // **카톡 링크 미리보기 — URL 을 얼린다**(U-1 후속 · 지휘부 판정 2026-08-31).
  //
  //   전에는 파일 관례(`opengraph-image.png`)를 썼다. 그러면 Next 가 **파일 경로에서 뽑은 값**으로
  //   라우트를 만들고, 라우트 그룹 `(public)/` 으로 옮기자 **경로가 바뀌었다** —
  //   `/recruit/opengraph-image.png` → `/recruit/opengraph-image-squcfl.png`.
  //
  //   **OG URL 은 얼어야 하는 값인데 따라가는 값(파일 경로)에 묶여 있었다**(`CLAUDE.md` §11).
  //   그래서 이미지를 `public/` 에 두고 여기서 **직접 가리킨다.** `public/` 은 경로가 곧 URL 이라
  //   해시가 붙지 않는다 — 이제 파일을 어디로 옮겨도 이 URL 은 안 바뀐다.
  //
  //   **경로를 `/recruit/opengraph-image.png` 그대로 골랐다 — 지금 배포된 것과 같은 URL 이다.**
  //     라이브 태그가 `…/recruit/opengraph-image.png?opengraph-image.2ekk20w6t2w34.png` 이고
  //     정적 파일은 쿼리를 무시하므로 **이미 카톡이 물고 있는 링크가 그대로 산다.**
  //     `public/og/` 같은 새 이름을 골랐다면 옛 캐시가 전부 404 가 됐을 것이다.
  //
  //   ⚠ 여기 파일 이름이 Next 의 파일 관례와 같으나 **`public/` 이라 관례가 적용되지 않는다.**
  //     같은 이름을 `src/app/.../recruit/` 아래 다시 두면 라우트가 겹친다 — 두지 말 것.
  openGraph: {
    title: META.title,
    description: META.description,
    type: 'website',
    images: [{ url: '/recruit/opengraph-image.png', width: 1080, height: 1080, alt: OG_ALT }],
  },
};

export default async function RecruitPage() {
  const intake = CURRENT_INTAKE;
  const status = STATUS_COPY[intake.status];
  const href = joinHref(intake);

  // 남은 자리 — 집계는 DB, 판정은 순수 함수. 집계가 실패하면 null 이고 그 줄을 안 그린다.
  const remaining = seatsRemaining(await seatsTaken(intake.code), status.enabled, intake);

  const cta = status.enabled ? (
    <Link className="rc-cta" href={href}>
      {status.cta}
    </Link>
  ) : (
    <span className="rc-cta" aria-disabled="true" role="link">
      {status.cta}
    </span>
  );

  return (
    <main className="rc">
      {/* **lg 이상에서만 2단이다**(지휘부 판정). 좌는 기존 신청 흐름 **그대로**이고
          — 폼·CTA·남은 자리 로직을 한 줄도 건드리지 않았다 —
          우는 카드뉴스 정적 그리드다. **lg 미만에서는 우측이 통째로 숨는다**:
          모바일 `/recruit` 은 현행 1단 신청 흐름이고 카드가 끼어들지 않는다. */}
      <div className="rc-two">
      <div className="rc-wrap">
        {/* 1 · 히어로 — 카드 1 */}
        <section className="rc-sec">
          <p className="rc-eyebrow">{HERO.eyebrow}</p>
          <h1 className="rc-h rc-h--hero">
            {HERO.title[0]}
            <br />
            {HERO.title[1]}
          </h1>
          <p className="rc-body">{HERO.sub}</p>
          <p className="rc-lead rc-gold" style={{ fontWeight: 700 }}>
            {intake.coverLine}
          </p>
          {status.badge ? <p className="rc-badge">{status.badge}</p> : null}
          {/* 배지 안이 아니라 아래 한 줄로 둔다 — 골드 배지에 숫자를 얹으면 한 덩어리로 뭉쳐 둘 다 안 읽힌다. */}
          {remaining != null ? <p className="rc-seats">{SEATS_LEFT(remaining)}</p> : null}
          <div style={{ marginTop: 'var(--space-7)' }}>
            {cta}
            <p className="rc-cta-note">{status.note}</p>
          </div>
        </section>

        {/* 2 · 문제제기 — 카드 2·3(발주서 §3.2 가 묶기를 허용했다. 둘 다 같은 말을 한다) */}
        <section className="rc-sec">
          <p className="rc-eyebrow">{PROBLEM.eyebrow}</p>
          <h2 className="rc-h">
            {PROBLEM.title[0]}
            <br />
            {PROBLEM.title[1]}
          </h2>
          <p className="rc-lead">
            {PROBLEM.lead[0]}
            <br />
            {PROBLEM.lead[1]}
          </p>
          <p className="rc-body">
            {PROBLEM.body[0]}
            <br />
            {PROBLEM.body[1]}
          </p>
          <p className="rc-body">
            <strong>{PROBLEM.emph}</strong>
          </p>

          <h2 className="rc-h">
            {PROBLEM.title2[0]}
            <br />
            {PROBLEM.title2[1]}
          </h2>
          <ul className="rc-marks">
            {PROBLEM.marks.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          <p className="rc-body">
            {PROBLEM.closing}
            <br />
            <strong className="rc-gold">{PROBLEM.closingGold}</strong>
          </p>
        </section>

        {/* 3 · 무엇인가 — 카드 4 */}
        <section className="rc-sec">
          <p className="rc-eyebrow">{WHAT.eyebrow}</p>
          <h2 className="rc-h">
            {WHAT.title[0]}
            <br />
            {WHAT.title[1]}
          </h2>
          <p className="rc-body">
            {WHAT.defs.map((d, i) => (
              <span key={d.term}>
                {i > 0 ? <br /> : null}
                <span className="rc-gold">{d.term}</span> : {d.text}
              </span>
            ))}
          </p>
          <p className="rc-body">
            {WHAT.lead}
            <br />
            <strong>{WHAT.leadEmph}</strong>
          </p>
          <p className="rc-body">
            <span className="rc-gold">{WHAT.modelLabel}</span>
            <br />
            {WHAT.modelWords}
          </p>
          <p className="rc-foot">{WHAT.foot}</p>
        </section>

        {/* 4 · 6주 여정 — 카드 5 */}
        <section className="rc-sec">
          <p className="rc-eyebrow">{JOURNEY.eyebrow}</p>
          <h2 className="rc-h">{JOURNEY.title}</h2>
          <div className="rc-table">
            {JOURNEY.rows.map((r) => (
              <div className="rc-row" key={r.no}>
                <span className="rc-k">{r.no}</span>
                <span>{r.what}</span>
              </div>
            ))}
          </div>
          <p className="rc-foot">{JOURNEY.foot}</p>
        </section>

        {/* 5 · 남는 것 — 카드 6 */}
        <section className="rc-sec">
          <p className="rc-eyebrow">{RESULT.eyebrow}</p>
          <h2 className="rc-h">{RESULT.title}</h2>
          <ul className="rc-marks">
            {RESULT.marks.map((m) => (
              <li key={m.strong}>
                {m.pre}
                <strong>{m.strong}</strong>
                {m.post}
              </li>
            ))}
          </ul>
          <p className="rc-foot">{RESULT.foot}</p>
        </section>

        {/* 6 · 1기 참여자의 말 — 카드 7 */}
        <section className="rc-sec">
          <p className="rc-eyebrow">{VOICES.eyebrow}</p>
          <h2 className="rc-h">{VOICES.title}</h2>
          {VOICES.quotes.map((q) => (
            <blockquote className="rc-quote" key={q.text}>
              <p>{q.text}</p>
              <cite>{q.cite}</cite>
            </blockquote>
          ))}
        </section>

        {/* 7 · 온라인 동행 — 카드 8 */}
        <section className="rc-sec">
          <p className="rc-eyebrow">{ONLINE.eyebrow}</p>
          <h2 className="rc-h">{ONLINE.title}</h2>
          {ONLINE.blocks.map((b) => (
            <div key={b.head}>
              <h3 className="rc-blk">{b.head}</h3>
              <p className="rc-body">{b.body}</p>
            </div>
          ))}
        </section>

        {/* 8 · 이런 분께 — 카드 9 */}
        <section className="rc-sec">
          <p className="rc-eyebrow">{AUDIENCE.eyebrow}</p>
          <h2 className="rc-h">
            {AUDIENCE.title[0]}
            <br />
            {AUDIENCE.title[1]}
          </h2>
          <ul className="rc-marks">
            {AUDIENCE.marks.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </section>

        {/* 9 · 일정 — 카드 10 */}
        <section className="rc-sec">
          <p className="rc-eyebrow">{SCHEDULE.eyebrow}</p>
          <h2 className="rc-h">{SCHEDULE.title}</h2>
          <div className="rc-table">
            {intake.schedule.map((r) => (
              <div className="rc-row rc-row--sched" key={r.no}>
                <span className="rc-k">{r.no}</span>
                <span className="rc-dt">{r.date}</span>
                <span className="rc-tm">{r.time}</span>
                <span className="rc-sched-2">
                  <span className="rc-pl">
                    {r.place}
                    {r.area ? <span className="rc-area">({r.area})</span> : null}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <p className="rc-foot">{intake.sessionLength}</p>
        </section>

        {/* 10 · 참가비 — 카드 11 */}
        <section className="rc-sec">
          <p className="rc-eyebrow">{FEE.eyebrow}</p>
          <p className="rc-price">{intake.fee}</p>
          <p className="rc-scholar">{intake.scholarship}</p>
          <p className="rc-body" style={{ marginTop: 'var(--space-3)' }}>
            {intake.scholarshipNote}
          </p>

          <h3 className="rc-blk">{FEE.criteriaHead}</h3>
          <p className="rc-body">
            {intake.criteria.map((c, i) => (
              <span key={c}>
                {i > 0 ? <br /> : null}
                {c}
              </span>
            ))}
          </p>

          <p className="rc-motto">{FEE.motto}</p>

          <div className="rc-acct">
            <span className="rc-acct-label">{intake.accountLabel}</span>
            <span className="rc-acct-text">{intake.accountText}</span>
            <div>
              <AccountCopy value={intake.accountNumber} />
            </div>
          </div>
          <p className="rc-foot">{FEE.foot}</p>
        </section>

        {/* 11 · 기획 및 진행 — 카드 12 */}
        <section className="rc-sec">
          <p className="rc-eyebrow">{TEAM.eyebrow}</p>
          {TEAM.people.map((p) => (
            <div className="rc-person" key={p.name}>
              <h3>
                {p.name}
                <span>{p.role}</span>
              </h3>
              <p>{p.bio}</p>
            </div>
          ))}
        </section>

        {/* 12 · 신청 — 카드 13. QR 은 두지 않는다(§3.1.2): 이미 이 주소에 온 사람에게 같은 주소의 QR 은 무의미하다. */}
        <section className="rc-sec">
          <p className="rc-eyebrow">{APPLY.eyebrow}</p>
          <p className="rc-body">
            {APPLY.body} <strong>{APPLY.bodyEmph}</strong>
          </p>
          {cta}
          <p className="rc-cta-note">{status.note}</p>
          <p className="rc-deadline">
            {intake.deadlineLine}
            <span>{APPLY.deadlineNote}</span>
          </p>
        </section>
      </div>

      {/* 카드뉴스 — **정적 `img` 다.** 캐러셀·라이트박스 같은 새 위젯을 두지 않는다(지휘부 판정).
          순서는 `cards.ts` 배열 그대로다: 문제(2) → 문제(3) → 답(6) → 증언(7).
          **여기서 다시 정렬하지 않는다** — 그 순서에 뜻이 실려 있다. */}
      <aside className="rc-cards" aria-label="예봄 2기 안내 카드">
        {RECRUIT_CARDS.map((c) => (
          // 이미지 속 글자는 스크린리더가 못 읽는다 — `alt` 가 그 장의 유일한 접근 경로다.
          // eslint-disable-next-line @next/next/no-img-element
          <img key={c.n} src={c.src} alt={c.alt} width={800} height={800} loading="lazy" decoding="async" />
        ))}
      </aside>
      </div>

      {/* 하단 고정 바 — 스크롤 어디서든 누를 수 있게(§3.3) */}
      <div className="rc-sticky">
        <div className="rc-sticky-inner">{cta}</div>
      </div>
    </main>
  );
}
