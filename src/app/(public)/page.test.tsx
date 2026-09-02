import { beforeAll, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Home from './page';
import { readFileSync } from 'node:fs';


describe('루트 현관 (/) — 공개 소개 현관(진입-1)', () => {
  // S-4 에서 현관이 **서버 비동기 컴포넌트**가 됐다(소식 미리보기). `renderToStaticMarkup(<Home />)` 는
  //   비동기 컴포넌트를 동기로 그리지 못해 suspend 로 터진다 — 그래서 **먼저 await 해서 엘리먼트를 얻는다.**
  //   단언은 한 줄도 바꾸지 않았다. 깨진 것은 렌더 방식이지 지키려던 내용이 아니다(ADR-111 처리와 같다).
  //   env 가 없는 테스트 환경에서 `recentNews()` 는 네트워크를 타지 않고 빈 배열을 돌려준다.
  let html = '';
  beforeAll(async () => {
    html = renderToStaticMarkup(await Home());
  });

  // **4차 F-2 에서 현관이 시안 P1·A 로 전면 교체됐다.** 아래 단언은 문구가 아니라
  //   **그 문구가 지키던 것**을 따라 옮겨 적었다 — 참여로 가는 길·로그인·모집·소식 규율.
  //   문구를 그대로 두면 테스트가 옛 화면을 지키고, 지우면 지키던 것이 함께 사라진다.
  it('참여로 가는 길 둘 — 신청(/recruit)과 코드 지름길(/join). 골드 면 + 네이비 글자', () => {
    // ★ **문구가 바뀌었다**(ADR-171) — 옛 `참여 신청` 은 GNB 메뉴에도 있어 같은 말이 한 화면에
    //   둘이었다. **지키던 것은 문구가 아니라 「참여로 가는 길이 있다」** 이므로 그것을 잰다.
    expect(html).toContain('지금 시작하기');
    expect(html).toContain('href="/recruit"');
    expect(html).toContain('href="/join"'); // 링크만 받은 참여자의 문 — 없어지면 못 들어온다
    // ★ **「골드 면 + 네이비 글자」를 토큰 문자열로 재지 않는다.** 인라인 style 을 걷어
    //   색이 `ui.css` 한 곳에 살게 했으므로(불변식 23), 이제 **그 갈래를 쓰는지**를 잰다.
    //   토큰만 보면 화면 어딘가에 그 글자가 있기만 해도 초록이 된다(조항 ⑬).
    expect(html).toContain('ui-btn--on-dark');
  });

  it('코드 보조 링크(코드로 입장) → /join', () => {
    expect(html).toContain('코드로 입장');
  });

  it('**소개로 가는 길**이 있다 — 세 단락 본문은 /about 으로 옮겼다', () => {
    // 시안 P1 의 현관에는 소개 3단락이 없다(그 자리를 `.three` 카드가 든다).
    //   본문은 `/about` 이 들고 `about/page.test.tsx` 가 거기서 잠근다 — **사라진 것이 아니라 옮겼다.**
    //   옮겼다는 사실 자체는 완주 보고에 적었다(조용히 바꾸지 않는다).
    expect(html).toContain('href="/about"');
    expect(html).toContain('6주 여정 살펴보기'); // 히어로 CTA (ADR-171 로 문구가 바뀌었다)
  });

  // **이 단언은 껍데기로 옮겼다**(U-1) — `PublicShell.test.tsx` 가 `/login`·`/signup` 문을 잰다.
  //   여기서는 **화면이 더는 그것을 그리지 않는다**는 사실을 잰다(§12.3 규칙 1의 회귀 잠금).
  it('**화면이 헤더·푸터를 그리지 않는다** — 껍데기가 그린다', () => {
    expect(html).not.toContain('site-gnb');
    expect(html).not.toContain('site-foot');
  });

  it('옛 결정화면 CTA·플레이스홀더 제거', () => {
    expect(html).not.toContain('참여하기'); // 옛 CTA 문구
    expect(html).not.toMatch(/토대 구축 단계|디자인 시스템 확정 후/);
  });

  it('참여자 화면 — 의미색 토큰 0', () => {
    expect(html).not.toMatch(/--care|--danger|--warning/);
  });
});

describe('현관 공개 영역 배선 (S-4)', () => {
  let html = '';
  beforeAll(async () => {
    html = renderToStaticMarkup(await Home());
  });

  it('모집이 /recruit 로 간다 — 소식 첫 줄이 모집 공지다', () => {
    expect(html).toContain('href="/recruit"');
    expect(html).toContain('모집'); // 소식 첫 줄 배지
    expect(html).toContain('예봄 2기'); // intake.ts 단일 출처
  });

  // 공개 영역으로 가는 길은 이제 **껍데기의 내비**가 든다 — `PublicShell.test.tsx` 로 옮겼다.
  //   화면 본문이 스스로 거는 링크(모집·소식 등)는 아래 다른 단언들이 그대로 잰다.
  it('본문이 스스로 거는 길은 그대로다 — 모집 줄', () => {
    expect(html).toContain('site-news__row');
  });

  it('소식이 없으면 `더 보기` 를 주지 않는다 — 눌러서 빈 목록을 보지 않게', () => {
    // 테스트 환경은 env 가 없어 recentNews() 가 빈 배열이다.
    //   **구획 자체는 남는다** — 모집 줄과 모집 카드가 채우므로 빈 제목만 남는 일이 없다.
    expect(html).not.toContain('더 보기');
    expect(html).toContain('site-news__row'); // 모집 줄이 그 자리를 채운다
  });

  it('참여자 현관 규율 — 의미색을 쓰지 않는다', () => {
    for (const token of ['--care-', '--color-danger', '--color-warning']) {
      expect(html, token).not.toContain(token);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 히어로 v2 (ADR-171) — 지휘부 판정 2026-09-02.
//
// **여기서는 마크업이 사는 사실만 잰다.** 「시안과 비슷한가」는 사람이 눈으로 재는 값이라
//   기계가 재는 항목으로 번역했다(배경 로드·노드 크기·모바일 이미지 0)는 배포 뒤 실행으로 잰다.
describe('히어로 v2 (ADR-171)', () => {
  // **기존 관용구 그대로다** — `Home` 은 서버 비동기 컴포넌트라 `<Home/>` 를 동기로 그리면
  //   suspend 로 터지고 그 블록이 **조용히 스킵**된다(이 회차에서 실제로 겪었다).
  //   위 두 블록이 그 이유를 이미 적어 두었는데 읽지 않고 새로 지은 것이 원인이었다.
  let html = '';
  beforeAll(async () => { html = renderToStaticMarkup(await Home()); });

  it('★ CTA 는 **어두운 면 갈래**를 쓴다 — 밝은 면 규칙을 뒤집지 않았다', () => {
    // §1.5「네이비 = 앱의 틀 / 골드 = 참여자의 흔적」은 밝은 면의 규칙이다.
    //   어두운 히어로에서는 네이비가 배경과 같은 색이라 단추가 사라진다 — 그래서 갈래를 뒀다.
    expect(html).toContain('ui-btn--on-dark');
    expect(html).toContain('ui-btn--on-dark-ghost');
    // 밝은 면 갈래가 히어로에 섞이면 배경에 묻힌다.
    expect(html, '히어로에 밝은 면 갈래가 섞였다').not.toMatch(/site-hero[\s\S]{0,900}ui-btn--primary/);
  });

  it('★ 색을 화면이 다시 정하지 않는다 — 인라인 style 로 색을 덮지 않는다 (불변식 23)', () => {
    const hero = html.slice(0, html.indexOf('</section>'));
    for (const bad of ['--color-accent)', '--navy-500']) {
      expect(hero, `히어로가 색을 인라인으로 덮는다: ${bad}`).not.toContain(`background:${bad}`);
    }
    // CTA 에 남은 인라인은 밑줄 제거 하나뿐이다.
    expect(hero).toContain('text-decoration:none');
  });

  it('CTA 에 화살표 슬롯이 있다 — 장식이라 낭독기에서 감춘다', () => {
    expect(html).toContain('ui-btn__arrow');
    expect(html).toMatch(/ui-btn__arrow"[^>]*aria-hidden/);
  });

  it('★ 히어로 아래 사실 셋이 선다 — 시안에서 뽑은 문안 그대로', () => {
    for (const t of ['소수 정예 그룹', '실전 중심 커리큘럼', '지속 가능한 성장']) {
      expect(html, t).toContain(t);
    }
    for (const s of ['함께 성장하는 동료', '실천 가능한 전략과 도구', '6주 후, 새로운 시작의 나']) {
      expect(html, s).toContain(s);
    }
    // 아이콘 부품이 없어 점으로 뒀다(불변식 20) — 그림을 새로 짓지 않았다.
    expect(html).toContain('hero-feature__dot');
    expect(html, '아이콘을 새로 지었다').not.toMatch(/<svg[\s\S]{0,200}hero-feature/);
  });

  it('★ GROW 축에 설명 다섯이 붙었다 — 회차 표기는 그대로 산다', () => {
    expect((html.match(/site-grow__desc/g) ?? []).length, '설명이 다섯이 아니다').toBe(5);
    expect(html).toContain('묻어 둔 갈망을 꺼내 이름을 붙인다.');
    // 축의 원래 슬롯을 지우지 않았다 — 부품이 계산하지 않는다는 규율이 그대로다.
    expect(html).toContain('site-grow__note');
    expect(html).toContain('site-grow__en');
  });

  it('★★ 회차 여섯 이름은 **갈무리와 같다** — 공개만 바꾸지 않았다', () => {
    // 지시서는 여섯을 전부 새 이름으로 바꾸라 했다. 그러면 신청할 때 본 이름과
    //   참여한 뒤 카드에 뜨는 이름이 달라진다. 지휘부가 「메시지는 일관되어야 한다」고 했고,
    //   그 일관성을 **공개를 갈무리에 맞추는 쪽**으로 지켰다(판정 2026-09-02).
    for (const t of ['과거의 나를 만나다', '미래의 나를 만나다', '존재가치 선언문']) {
      expect(html, `회차 문안이 갈무리와 갈렸다: ${t}`).toContain(t);
    }
    // 지시서가 넣으려던 새 회차 이름이 들어오면 그 순간 사본이 갈린다.
    for (const bad of ['잃어버린 꿈을 찾다', '꿈의 모습을 그리다', '나의 존재가치 선언']) {
      expect(html, `갈무리와 갈리는 이름이 들어왔다: ${bad}`).not.toContain(bad);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 결재 문안 (2026-09-02) — **얼어야 하는 값이라 잠금을 함께 둔다**(§11 값의 두 분류 ⑵).
//
// 앞서 이 문안들은 잠금이 **0곳**이었다 — 결재를 받고도 얼리지 않으면
//   다음 사람이 「그냥 문구」로 알고 고친다. 그래서 **글자 단위**로 박는다.
describe('홈 문안 — 결재분 (2026-09-02)', () => {
  let html = '';
  beforeAll(async () => { html = renderToStaticMarkup(await Home()); });

  it('★ 카드 1 마지막 문장 — 과장을 걷어낸 결재분', () => {
    expect(html).toContain('6주 뒤, 그 기록이 다음 걸음의 재료가 됩니다.');
    // 지시서 원문은 과장이라 결재로 물렸다. 되돌아오면 이 잠금이 운다.
    expect(html, '과장 문안이 되돌아왔다').not.toContain('당신은 다른 사람이 되어 있을 것입니다');
  });

  it('★ 그 말은 **제품이 이미 쓰는 말**이다 — 공개와 참여자 화면이 갈리지 않는다', () => {
    // 신청할 때 들은 말과 참여한 뒤 듣는 말이 같아야 한다(회차 이름을 갈무리에 맞춘 것과 같은 이치).
    //   한쪽만 고쳐지면 그때부터 두 말이 된다 — 그래서 **양쪽을 함께** 잰다(불변식 23).
    const mine = readFileSync('src/app/(member)/my/cohorts/[cohortId]/journey/MyJourney.tsx', 'utf8');
    expect(mine, '참여자 화면에서 그 말이 사라졌다').toContain('재료가 됩니다');
    expect(html).toContain('재료가 됩니다');
  });

  it('구획 제목 둘 — 지시서 §3.1 결재분', () => {
    expect(html).toContain('꿈을 목표로, 목표를 실행으로');
    expect(html).toContain('매주 한 걸음씩, 꿈에서 목표로, 목표에서 현실로');
  });
});
