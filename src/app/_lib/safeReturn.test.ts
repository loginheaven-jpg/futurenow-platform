import { describe, expect, it } from 'vitest';
import { safeReturnTo } from './safeReturn';

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
    expect(safeReturnTo('/admin')).toBeNull();
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
    const droppedOnPurpose = ['/coach', '/coach/cohorts', '/admin', '/admin/approvals', '/preview', '/home'];
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
