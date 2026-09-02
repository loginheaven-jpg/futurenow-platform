import { describe, expect, it } from 'vitest';
import { safeReturnTo } from './safeReturn';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('safeReturnTo — 오픈 리다이렉트 방어(수용 11-a)', () => {
  it('허용: 갈무리 QR·카드 상대 경로', () => {
    expect(safeReturnTo('/c/ABCD/1')).toBe('/c/ABCD/1');
    expect(safeReturnTo('/c/RSTUV12/7')).toBe('/c/RSTUV12/7');
    expect(safeReturnTo('/my/cohorts/2f9a1c3e-4b5d-6e7f-8a9b-0c1d2e3f4a5b/checkin/1')).toBe(
      '/my/cohorts/2f9a1c3e-4b5d-6e7f-8a9b-0c1d2e3f4a5b/checkin/1',
    );
  });

  it('거부: 절대 URL·프로토콜상대·백슬래시 → null', () => {
    expect(safeReturnTo('https://evil.example')).toBeNull();
    expect(safeReturnTo('//evil.example')).toBeNull();
    expect(safeReturnTo('\\\\evil.example')).toBeNull();
    expect(safeReturnTo('http://x/c/ABCD/1')).toBeNull();
  });

  it('허용: 가치 카드 짧은 경로·카드 경로', () => {
    expect(safeReturnTo('/c/ABCD/values')).toBe('/c/ABCD/values');
    expect(safeReturnTo('/c/RSTUV12/values')).toBe('/c/RSTUV12/values');
    expect(safeReturnTo('/my/cohorts/2f9a1c3e-4b5d-6e7f-8a9b-0c1d2e3f4a5b/values')).toBe(
      '/my/cohorts/2f9a1c3e-4b5d-6e7f-8a9b-0c1d2e3f4a5b/values',
    );
  });

  it('거부: 화이트리스트 밖 내부 경로 → null', () => {
    // `/admin` 은 **ADR-177 에서 허용으로 옮겼다**(지휘부 결재). 옛 사실을 지우지 않고 옮겨 적는다 —
    //   그 줄이 지키던 것은 「권한 화면 금지」가 아니라 **「목록에 없으면 버린다」**였고 그것은 그대로다.
    expect(safeReturnTo('/home')).toBeNull();
    expect(safeReturnTo('/my/cohorts/xxx/report')).toBeNull();
    expect(safeReturnTo('/c/ab/1')).toBeNull(); // 코드 4자 미만
    expect(safeReturnTo('/c/ABCD/valuesx')).toBeNull(); // 접두 오매칭 방지
    expect(safeReturnTo('/my/cohorts/2f9a1c3e-4b5d-6e7f-8a9b-0c1d2e3f4a5b/values/1')).toBeNull();
  });

  it('빈 값 → null', () => {
    expect(safeReturnTo(null)).toBeNull();
    expect(safeReturnTo(undefined)).toBeNull();
    expect(safeReturnTo('')).toBeNull();
  });
});

describe('개인 응시 경로(S-2)', () => {
  it('/my/values 를 허용한다 — 라우트와 짝이다', () => {
    expect(safeReturnTo('/my/values')).toBe('/my/values');
  });

  it('비슷하지만 다른 경로는 막는다', () => {
    for (const bad of ['/my/values/', '/my/valuesx', '/my/value', '//my/values', '/my/values?x=1']) {
      expect(safeReturnTo(bad), bad).toBeNull();
    }
  });
});

describe('체크 허브(S-3)', () => {
  it('/home/assessments 를 허용한다 — 라우트와 짝이다', () => {
    expect(safeReturnTo('/home/assessments')).toBe('/home/assessments');
  });

  it('비슷하지만 다른 경로는 막는다', () => {
    for (const bad of ['/home/assessments/', '/home/assessment', '/home', '/homeassessments']) {
      expect(safeReturnTo(bad), bad).toBeNull();
    }
  });
});

describe('동행 피드(2차)', () => {
  it('/feed 를 허용한다 — 라우트와 같은 커밋이다(발주 §8)', () => {
    expect(safeReturnTo('/feed')).toBe('/feed');
  });

  it('비슷하지만 다른 경로는 막는다', () => {
    for (const bad of ['/feed/', '/feeds', '/feedx', '//feed', '/fee']) {
      expect(safeReturnTo(bad), bad).toBeNull();
    }
  });

  it('기수 전환 쿼리가 붙은 형태는 통과하지 않는다', () => {
    // proxy 가 애초에 쿼리를 싣지 않으므로 이 형태는 오지 않는다. 그래도 막아 둔다 —
    // 화이트리스트가 느슨해지는 첫 걸음이 대개 "실제로는 안 오는데" 다.
    expect(safeReturnTo('/feed?cohort=abc')).toBeNull();
  });
});

describe('참여자 자기 화면 딥링크 (ADR-176)', () => {
  const U = '2f9a1c3e-4b5d-6e7f-8a9b-0c1d2e3f4a5b';

  it('로그인 뒤 자기 화면으로 되돌아간다 — 실측으로 끊긴 것을 확인하고 이었다', () => {
    for (const p of ['/account', '/my/cohorts', `/my/cohorts/${U}`, `/my/cohorts/${U}/journey`, `/my/cohorts/${U}/report`]) {
      expect(safeReturnTo(p), p).toBe(p);
    }
  });

  it('★ 프록시가 싣는 것과 소비 쪽이 받는 것을 **한자리에서** 맞춘다', () => {
    // 프록시는 보호 경로 전부에 returnTo 를 싣는다(`loginRedirectSearch`) — 버리는 쪽은 여기다.
    //   두 반쪽이 따로 살면 한쪽만 고쳐지는 날 딥링크가 조용히 끊긴다(불변식 23).
    //   그래서 **살아남는 것과 일부러 뺀 것을 같은 표에** 둔다.
    const survives = ['/account', '/my/cohorts', `/my/cohorts/${U}`, `/my/cohorts/${U}/journey`,
      `/my/cohorts/${U}/report`, `/my/cohorts/${U}/values`, `/my/cohorts/${U}/checkin/3`,
      '/my/values', '/home/assessments', '/feed'];
    // ADR-177 로 권한 화면이 허용으로 옮겨 갔다. **일부러 뺀 것은 이제 `/home` 하나**이고
    //   그것은 정책이 아니라 **설계**다 — 홈은 착지 규칙(ADR-173)이 정하므로 딥링크로 고정하지 않는다.
    survives.push('/coach', '/coach/cohorts', '/coach/new', '/admin', '/admin/approvals', '/preview');
    const droppedOnPurpose = ['/home'];
    for (const p of survives) expect(safeReturnTo(p), `끊겼다: ${p}`).toBe(p);
    for (const p of droppedOnPurpose) {
      // 막혀서가 아니라 **정책이라서** 뺐다 — 결재가 나면 위 목록으로 옮긴다.
      expect(safeReturnTo(p), `일부러 뺀 것이 통과한다: ${p}`).toBeNull();
    }
  });

  it('비슷하지만 다른 경로는 여전히 막는다 — 넓힌 만큼 접두 오매칭이 생기지 않았는가', () => {
    for (const bad of ['/accounts', '/account/', '/account?x=1', '//account',
      '/my/cohortsx', '/my/cohorts/', `/my/cohorts/${U}/journeyx`, `/my/cohorts/${U}/report/1`,
      `/my/cohorts/notauuid/report`, 'https://evil.test/account']) {
      expect(safeReturnTo(bad), bad).toBeNull();
    }
  });
});

describe('★ 권한 화면 딥링크 (ADR-177 · 지휘부 결재 2026-09-02)', () => {
  it('★★ **실제 라우트를 전부 먹인다** — 손으로 적은 목록이 아니다', () => {
    // 경로를 열거하면 라우트가 느는 날 낡는다(§11 ⑴). **저장소에서 세어** 전부 통과하는지 본다.
    //   라우트가 늘어 패턴을 벗어나면 **이 잠금이 먼저 운다** — 딥링크가 조용히 끊기기 전에.
    const roots = ['coach', 'admin', 'preview'];
    const routes: string[] = [];
    const walk = (dir: string, web: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) walk(join(dir, e.name), `${web}/${e.name}`);
        else if (e.name === 'page.tsx') routes.push(web);
      }
    };
    for (const r of roots) walk(join('src/app', r), `/${r}`);
    expect(routes.length, '권한 라우트를 하나도 못 찾았다 — 물 것이 없다').toBeGreaterThan(0);
    for (const r of routes) {
      // 동적 세그먼트는 실제 값으로 바꿔 먹인다 — `[cohortId]` 그대로는 실물이 아니다.
      const real = r.replace(/\[[^\]]+\]/g, '2f9a1c3e-4b5d-6e7f-8a9b-0c1d2e3f4a5b');
      expect(safeReturnTo(real), `끊긴다: ${r}`).toBe(real);
    }
  });

  it('★ 넓혔어도 **밖으로는 못 나간다** — 오픈 리다이렉트 방어가 그대로다', () => {
    for (const bad of [
      'https://evil.test/coach', '//evil.test/admin', '\\evil/coach', 'http://x/admin',
      '/coacher', '/administration', '/previews',      // 접두 오매칭
      '/coach/../admin',                                // 경로 탈출 시늉
      '/coach/a/b/c/d/e/f/g/h',                         // 깊이 상한 밖
      '/coach/has space', '/coach/%2e%2e',              // 허용 글자 밖
    ]) {
      expect(safeReturnTo(bad), bad).toBeNull();
    }
  });
});

describe('★ 패턴의 모양 자체를 잠근다 (ADR-177)', () => {
  it('★★ 모든 패턴이 **앞을 슬래시 하나로 고정**하고 **끝을 닫는다**', () => {
    // ★ 물려 보고 알았다 — `//`·백슬래시·`://` 를 막는 **명시 줄은 오늘 아무것도 안 막는다.**
    //   지우고 재도 초록이었다. 그건 「막지 못한다」가 아니라 **「막을 것이 없었다」**다:
    //   정규식이 전부 `^/` 로 고정이라 외부 꼴은 애초에 아무 패턴도 안 맞는다.
    //   **그러면 지켜야 할 것은 그 줄이 아니라 「전부 고정되어 있다」는 성질**이다 — 그것을 잰다.
    //   느슨한 패턴이 하나라도 들어오면 여기서 먼저 운다(명시 줄은 그때를 위한 뒷받침이다).
    const src = readFileSync('src/app/_lib/safeReturn.ts', 'utf8');
    const body = src.slice(src.indexOf('SAFE_RETURN'), src.indexOf('];', src.indexOf('SAFE_RETURN')));
    // ★ 처음엔 `/^` 로 시작하는 줄만 골랐다 — **고정 안 된 패턴은 창 밖으로 떨어져** 심어도 초록이었다(⑨-a).
    //   창이 «검사하려는 성질을 이미 만족하는 것»만 덮고 있었다. **정규식 줄 전부**를 본다.
    const pats = body.split(String.fromCharCode(10)).map((l) => l.trim())
      .filter((l) => l.startsWith('/') && l.endsWith('/,'));
    expect(pats.length, '패턴을 하나도 못 찾았다 — 창이 비었다').toBeGreaterThan(5);
    for (const pat of pats) {
      expect(pat.startsWith('/^' + String.fromCharCode(92) + '/'), `앞이 슬래시로 고정되지 않았다: ${pat}`).toBe(true);
      expect(pat.includes('$/'), `끝이 닫히지 않았다: ${pat}`).toBe(true);
      // 두 번째 글자까지 슬래시면 프로토콜상대(`//`)를 받아들일 여지가 생긴다.
      expect(pat.startsWith('/^' + String.fromCharCode(92) + '/' + String.fromCharCode(92) + '/'), `앞이 이중 슬래시다: ${pat}`).toBe(false);
    }
  });

  it('명시 차단 줄은 **그대로 둔다** — 오늘 안 물어도 느슨해지는 날의 뒷받침이다', () => {
    const src = readFileSync('src/app/_lib/safeReturn.ts', 'utf8');
    expect(src, '외부 차단 줄이 사라졌다').toContain("raw.startsWith(");
    expect(src).toContain("includes('://')");
  });
});
