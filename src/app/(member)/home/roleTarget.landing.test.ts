// 로그인 후 착지 잠금 (ADR-173 · 지휘부 지시 2026-09-02).
//
// **순수 함수라 실행으로 잰다.** 「규칙이 코드에 있는가」가 아니라 **먹여서 나온 값**을 본다 —
//   「있는가」로 묻는 잣대는 의심 대상이다(조항 ⑬).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { MyCohortSummary } from '@/contracts';
import { roleTargets, landingFor } from './roleTarget';
import { loginOutcome, LOGIN_HOME } from '@/app/(public)/login/loginOutcome';

/** 차수 하나 — 착지 판정에 쓰이는 칸만 채운다. 나머지는 이 잠금이 보지 않는다. */
const cohort = (over: Partial<MyCohortSummary> = {}): MyCohortSummary =>
  ({
    cohortId: 'c1', name: '예봄 2기', status: 'active',
    openSessionNo: null, openSessionSubmitted: false, openSessionHasContent: false,
    ...over,
  } as MyCohortSummary);

const NONE: MyCohortSummary[] = [];

describe('★ 역할 카드 — 지시 case 1~4', () => {
  it('case 1 · 참여자(기수 하나) — 카드 한 장', () => {
    const t = roleTargets('user', [cohort()]);
    expect(t).toHaveLength(1);
    expect(t[0].href).toBe('/my/cohorts/c1');
  });

  it('case 2 · 인도자(기수 없음) — 카드 한 장', () => {
    const t = roleTargets('coach', NONE);
    expect(t).toHaveLength(1);
    expect(t[0].href).toBe('/coach');
  });

  it('case 3 · 인도자 + 참여자 — 카드 둘, 인도자가 먼저', () => {
    const t = roleTargets('coach', [cohort()]);
    expect(t.map((x) => x.href)).toEqual(['/coach', '/my/cohorts/c1']);
  });

  it('★★ case 4 · 운영자 — **인도자 카드가 선다**', () => {
    // 이것이 이번 회차에서 더한 것이다. 권한은 전부터 있었고(운영자가 콘솔에서 전 차수를 본다)
    //   `role` 이 단일값이라 홈에 그 길만 없었다.
    const t = roleTargets('admin', [cohort()]);
    expect(t.map((x) => x.href)).toEqual(['/admin', '/coach', '/my/cohorts/c1']);
    const coachCard = t[1];
    // `who` 는 이 카드에서 언제나 「인도자」다 — 참여자 카드가 역할과 무관하게 「참여자」인 것과 같다.
    expect(coachCard.who).toBe('인도자');
    // `sub` 만 갈린다 — 운영자는 자기 차수가 아니라 전부를 본다.
    expect(coachCard.sub).toBe('모든 차수를 봅니다.');
    expect(roleTargets('coach', NONE)[0].sub).toBe('내 차수와 조원을 봅니다.');
  });

  it('기수 없는 운영자도 카드 둘이다 — 홈에서 고른다', () => {
    expect(roleTargets('admin', NONE).map((x) => x.href)).toEqual(['/admin', '/coach']);
  });
});

describe('★★ 착지 — 거점이 하나뿐일 때만 홈을 건너뛴다', () => {
  it('case 1·2 — 카드 한 장이면 그리로 간다', () => {
    expect(landingFor(roleTargets('user', [cohort()]))).toBe('/my/cohorts/c1');
    expect(landingFor(roleTargets('coach', NONE))).toBe('/coach');
  });

  it('case 3·4 — 카드가 여럿이면 홈에 남는다', () => {
    expect(landingFor(roleTargets('coach', [cohort()])), '겸직인데 건너뛰었다').toBeNull();
    expect(landingFor(roleTargets('admin', [cohort()])), '운영자인데 건너뛰었다').toBeNull();
    expect(landingFor(roleTargets('admin', NONE))).toBeNull();
  });

  it('★ 기수 없는 참여자는 **건너뛰지 않는다** — 폴백은 거점이 아니다', () => {
    const t = roleTargets('user', NONE);
    expect(t).toHaveLength(1);
    expect(t[0].fallback, '폴백 표시가 없다 — 그러면 착지 규칙이 유추를 하게 된다').toBe(true);
    // 여기서 건너뛰면 자기 자리가 아닌 곳에 떨어지고 홈의 소식·서가를 영영 못 본다.
    expect(landingFor(t), '폴백으로 건너뛰었다').toBeNull();
  });

  it('★ 폴백을 **`href` 로 유추하지 않는다** — 성질을 파생하면 U-4 형태다', () => {
    // 같은 목적지라도 폴백 표시가 없으면 거점으로 본다. 판정 근거가 주소가 아니라 **표시**여야 한다.
    expect(landingFor([{ href: '/home/assessments', who: 'x', title: 't', ctaLabel: 'c' }]))
      .toBe('/home/assessments');
    expect(landingFor([{ href: '/home/assessments', who: 'x', title: 't', ctaLabel: 'c', fallback: true }]))
      .toBeNull();
  });

  it('빈 목록이면 홈에 남는다', () => {
    expect(landingFor([])).toBeNull();
  });
});

describe('★★ 링크가 우선이다 (지휘부 확정 2026-09-02)', () => {
  const ok = { error: null, hasSession: true };

  it('`returnTo` 가 있으면 그쪽으로 간다 — 막바로 진입이 덮지 않는다', () => {
    expect(loginOutcome({ ...ok, returnTo: '/home/assessments' }).redirect).toBe('/home/assessments');
    expect(loginOutcome({ ...ok, returnTo: '/my/values' }).redirect).toBe('/my/values');
  });

  it('갈 곳이 없으면 홈을 낸다 — 그 값이 「물어보라」는 신호다', () => {
    expect(loginOutcome({ ...ok, returnTo: null }).redirect).toBe(LOGIN_HOME);
  });

  it('★ 화이트리스트 밖 주소는 여전히 막힌다 — 오픈 리다이렉트 방어가 살아 있다', () => {
    for (const bad of ['https://evil.test', '//evil.test', '/admin', '\\\\evil']) {
      expect(loginOutcome({ ...ok, returnTo: bad }).redirect, bad).toBe(LOGIN_HOME);
    }
  });

  it('★★ 홈으로 갈 때만 **착지를 묻는다** — `returnTo` 는 묻지 않고 그대로 간다', () => {
    // 링크로 정해진 목적지를 물어보면 그 답이 링크를 덮을 수 있다(지휘부 확정 — 링크가 우선).
    const client = readFileSync('src/app/(public)/login/LoginClient.tsx', 'utf8');
    expect(client, '착지를 묻지 않는다').toContain('loginLandingAction');
    expect(client, '홈일 때만 묻는 조건이 없다').toContain('=== LOGIN_HOME');
    // 값을 손으로 박으면 한쪽만 고쳐지는 날 조건이 조용히 거짓이 된다(불변식 23).
    expect(client, '홈 주소를 손으로 박았다').not.toContain("=== '/home'");
  });

  it('★★ 로그인 뒤 이동은 **문서를 새로 받는다** — 라우터 캐시를 쓰지 않는다', () => {
    // **정적 검사로는 원인을 못 잡는다**(⑨-c). 이 잠금은 **고친 것이 되돌아오는 것만** 막고,
    //   「프리페치 캐시를 쓰는가」는 `scripts/postdeploy.mjs` 가 **실행으로** 잰다.
    //
    //   실측 2026-09-02 — 미인증으로 로그인 화면을 열면 벨트의 「진단」이 프리페치되고
    //   미들웨어가 되돌린 307 이 캐시에 남아 로그인 뒤에도 그것이 쓰였다(착지 0/3).
    const client = readFileSync('src/app/(public)/login/LoginClient.tsx', 'utf8');
    expect(client, '문서를 새로 받지 않는다').toContain('window.location.replace(');
    for (const bad of ['router.replace(', 'router.push(']) {
      expect(client, `클라이언트 라우터로 되돌아갔다: ${bad}`).not.toContain(bad);
    }
    // `replace` 여야 한다 — `assign` 이면 히스토리에 /login 이 남아 뒤로가기가 폼을 보인다(4차 F-5 B행).
    expect(client, '히스토리에 로그인 화면이 남는다').not.toContain('window.location.assign(');
    // 실행으로 재는 창이 실재하는가(계열 ⑦) — 없으면 이 정적 잠금뿐이라 층이 어긋난다.
    const post = readFileSync('scripts/postdeploy.mjs', 'utf8');
    expect(post, 'postdeploy 에 착지 검사가 없다').toContain('로그인 착지 3경로');
    // ★ **한 경로만 재면 창이 좁다**(⑨-a) — ADR-175 는 벨트에 링크가 있는 화면 하나에만 났고
    //   `/feed` 는 멀쩡했다. 성질이 다른 셋을 재는지, 그리고 **상한이 있는지** 함께 잰다.
    for (const need of ['/home/assessments', '/feed']) {
      expect(post, `착지 검사가 ${need} 를 안 본다`).toContain(need);
    }
    // ★ 처음엔 `'LIMIT_MS'` 가 있는가로 물었는데 **`LIMIT_MSX` 도 그 글자를 담아** 통과했다(⑬).
    //   이름이 아니라 **쓰임**으로 잰다 — 상한이 실제로 기다림에 물려 있는가.
    expect(post, '속도 상한이 기다림에 안 물려 있다').toContain('{ timeout: LIMIT_MS }');
    // ★ 처음엔 「어딘가에 `bad(` 가 있는가」로 물었는데 **같은 이름의 `bad(` 가 하나 더 있어**
    //   `ok` 로 바꿔 심어도 초록이었다(⑬ · 물려서 잡았다). **catch 블록만** 본다.
    const at = post.indexOf("const { readFileSync } = await import('node:fs')");
    expect(at, '착지 검사의 try 를 못 찾았다').toBeGreaterThan(-1);
    const catchAt = post.indexOf('} catch (e) {', at);
    expect(catchAt, '착지 검사에 catch 가 없다').toBeGreaterThan(-1);
    const rescue = post.slice(catchAt, post.indexOf('}', post.indexOf(');', catchAt)));
    expect(rescue, '못 잰 것을 통과로 적는다 — 못 잰 것과 통과는 다르다').toContain('bad(');
    expect(rescue, '못 잰 것을 통과로 적는다').not.toContain('ok(');
  });

  it('★ 홈에는 리다이렉트가 **없다** — 서버 redirect 가 loading 과 겹쳐 화면이 멈췄다', () => {
    // 배포해서 잡았다. 「불러오는 중…」에서 멈췄고 /home·/coach 는 직접 열면 멀쩡했다.
    const home = readFileSync('src/app/(member)/home/page.tsx', 'utf8');
    expect(home, '홈이 다시 리다이렉트한다').not.toContain('landingFor');
    expect(home, '홈이 로그인 표지를 본다').not.toContain('from=login');
  });
});
