// 쿠키 정책 단위테스트 — 판정이 순수 함수라 전수로 잰다(5차 소건 1 라·마).
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyPersistence,
  authCookieRewrites,
  isAuthCookieName,
  parseCookieHeader,
  persistServerSnapshot,
  PERSIST_STORAGE_KEY,
  protocolFromForwarded,
  readPersist,
  secureCookies,
  subscribePersist,
  serializeCookie,
  writePersist,
} from './cookiePolicy';

describe('secureCookies — https 일 때만 Secure', () => {
  it.each([
    ['https:', true],
    ['https', true],
    ['HTTPS:', true],
    ['http:', false],
    ['http', false],
    ['', false],
    [null, false],
    [undefined, false],
  ])('%s → %s', (proto, expected) => {
    expect(secureCookies(proto)).toBe(expected);
  });

  it('**http 에 Secure 를 붙이지 않는다** — 붙이면 브라우저가 쿠키를 저장하지 않아 로그인이 통째로 깨진다', () => {
    expect(secureCookies('http:')).toBe(false);
  });
});

describe('protocolFromForwarded — 프록시 뒤의 원 프로토콜', () => {
  it('첫 칸을 본다 — 가장 바깥이 클라이언트가 실제로 쓴 것이다', () => {
    expect(protocolFromForwarded('https,http', 'http:')).toBe('https');
    expect(protocolFromForwarded('https, http', 'http:')).toBe('https');
  });
  it('헤더가 없으면 폴백', () => {
    expect(protocolFromForwarded(null, 'http:')).toBe('http:');
    expect(protocolFromForwarded('', 'https:')).toBe('https:');
    expect(protocolFromForwarded(undefined, null)).toBeNull();
  });
});

describe('applyPersistence — 수명 한 칸만 손본다', () => {
  const base = { path: '/', sameSite: 'lax' as const, secure: true, maxAge: 400 * 24 * 60 * 60 };

  it('유지 켬이면 받은 그대로다 — 객체 자체를 돌려준다', () => {
    expect(applyPersistence(base, true)).toBe(base);
  });

  it('유지 끔이면 maxAge·expires 가 사라진다 → 세션 쿠키', () => {
    const out = applyPersistence({ ...base, expires: new Date(0) }, false);
    expect(out.maxAge).toBeUndefined();
    expect(out.expires).toBeUndefined();
    expect(out.secure).toBe(true); // 다른 칸은 건드리지 않는다
    expect(out.path).toBe('/');
    expect(out.sameSite).toBe('lax');
  });

  it('**삭제 지시(maxAge 0)는 통과시킨다** — 여기서 지우면 지워야 할 쿠키가 세션 쿠키로 살아남는다', () => {
    const del = { ...base, maxAge: 0 };
    expect(applyPersistence(del, false)).toBe(del);
    expect(applyPersistence(del, false).maxAge).toBe(0);
  });

  it('원본을 변형하지 않는다', () => {
    const src = { ...base };
    applyPersistence(src, false);
    expect(src.maxAge).toBe(400 * 24 * 60 * 60);
  });
});

describe('readPersist / writePersist — 기본은 켬', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubStorage(initial: Record<string, string> = {}, throwing = false) {
    const store = { ...initial };
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => {
        if (throwing) throw new Error('blocked');
        return k in store ? store[k] : null;
      },
      setItem: (k: string, v: string) => {
        if (throwing) throw new Error('blocked');
        store[k] = v;
      },
    });
    return store;
  }

  it('값이 없으면 켬', () => {
    stubStorage();
    expect(readPersist()).toBe(true);
  });

  it("'0' 일 때만 끔이다 — 다른 값은 켬으로 읽는다", () => {
    stubStorage({ [PERSIST_STORAGE_KEY]: '0' });
    expect(readPersist()).toBe(false);
    stubStorage({ [PERSIST_STORAGE_KEY]: '1' });
    expect(readPersist()).toBe(true);
    stubStorage({ [PERSIST_STORAGE_KEY]: 'yes' });
    expect(readPersist()).toBe(true);
  });

  it('**읽기가 막혀도 켬이다** — 못 읽었다는 이유로 로그아웃 체감으로 밀지 않는다', () => {
    stubStorage({}, true);
    expect(readPersist()).toBe(true);
  });

  it('쓰기가 막혀도 던지지 않는다 — 편의 기능이 화면을 깨뜨리지 않는다', () => {
    stubStorage({}, true);
    expect(() => writePersist(false)).not.toThrow();
  });

  it('왕복한다', () => {
    const store = stubStorage();
    writePersist(false);
    expect(store[PERSIST_STORAGE_KEY]).toBe('0');
    expect(readPersist()).toBe(false);
    writePersist(true);
    expect(readPersist()).toBe(true);
  });
});

describe('쿠키 헤더 문법 — 라이브러리 기본 어댑터와 같은 뜻', () => {
  it('parse 는 이름·값을 나누고 값을 디코드한다', () => {
    expect(parseCookieHeader('a=1; b=hello%20world')).toEqual([
      { name: 'a', value: '1' },
      { name: 'b', value: 'hello world' },
    ]);
  });

  it('빈 칸·이름 없는 조각을 건너뛴다', () => {
    expect(parseCookieHeader('')).toEqual([]);
    expect(parseCookieHeader('  ; =x; a=1')).toEqual([{ name: 'a', value: '1' }]);
  });

  it('잘못 인코딩된 값도 던지지 않는다', () => {
    expect(parseCookieHeader('a=%E0%A4%A')).toEqual([{ name: 'a', value: '%E0%A4%A' }]);
  });

  it('값에 = 가 들어 있어도 첫 = 에서만 나눈다 — base64url 패딩이 그렇다', () => {
    expect(parseCookieHeader('sb-x=abc=def=')).toEqual([{ name: 'sb-x', value: 'abc=def=' }]);
  });

  it('serialize — 유지 켬(Max-Age 있음)', () => {
    const s = serializeCookie('sb-x', 'v', { path: '/', sameSite: 'lax', secure: true, maxAge: 100 });
    expect(s).toBe('sb-x=v; Max-Age=100; Path=/; SameSite=Lax; Secure');
  });

  it('serialize — 유지 끔(Max-Age 없음 = 세션 쿠키)', () => {
    const s = serializeCookie('sb-x', 'v', applyPersistence({ path: '/', sameSite: 'lax', secure: true, maxAge: 100 }, false));
    expect(s).toBe('sb-x=v; Path=/; SameSite=Lax; Secure');
    expect(s).not.toContain('Max-Age');
    expect(s).not.toContain('Expires');
  });

  it('serialize — http 면 Secure 가 붙지 않는다', () => {
    expect(serializeCookie('sb-x', 'v', { secure: secureCookies('http:') })).toBe('sb-x=v; Path=/');
  });

  it('**httpOnly 를 쓰지 않는다** — document.cookie 로는 세울 수 없고, 붙이면 쓰기가 통째로 무시된다', () => {
    expect(serializeCookie('a', 'b', { httpOnly: true })).not.toContain('HttpOnly');
  });

  it('값을 percent-encoding 한다', () => {
    expect(serializeCookie('a', 'x y;z')).toBe('a=x%20y%3Bz; Path=/');
  });

  it('삭제 지시는 Max-Age=0 으로 나간다', () => {
    expect(serializeCookie('a', '', { maxAge: 0 })).toContain('Max-Age=0');
  });
});

describe('authCookieRewrites — 끈 그 순간에 이미 깔린 쿠키까지 바꾼다', () => {
  const header = 'sb-abc-auth-token.0=v0; sb-abc-auth-token.1=v1; other=x; sb-abc-auth-token=whole';

  it('인증 쿠키만 고른다 — 남의 쿠키를 건드리지 않는다', () => {
    const out = authCookieRewrites(header, false, true);
    expect(out).toHaveLength(3);
    expect(out.some((s) => s.startsWith('other='))).toBe(false);
  });

  it('끔이면 Max-Age 가 없다 = 세션 쿠키', () => {
    for (const s of authCookieRewrites(header, false, true)) {
      expect(s).not.toContain('Max-Age');
      expect(s).toContain('; Path=/');
      expect(s).toContain('; SameSite=Lax');
      expect(s).toContain('; Secure');
    }
  });

  it('켬이면 라이브러리 기본값과 같은 400일이 다시 붙는다', () => {
    for (const s of authCookieRewrites(header, true, true)) {
      expect(s).toContain(`Max-Age=${400 * 24 * 60 * 60}`);
    }
  });

  it('**값을 그대로 다시 쓴다** — 토큰을 해석하지 않는다', () => {
    expect(authCookieRewrites('sb-abc-auth-token.0=v0', false, false)[0]).toBe(
      'sb-abc-auth-token.0=v0; Path=/; SameSite=Lax',
    );
  });

  it('http 면 Secure 를 붙이지 않는다 — 붙이면 그 쓰기가 통째로 버려진다', () => {
    expect(authCookieRewrites('sb-abc-auth-token=v', false, false)[0]).not.toContain('Secure');
  });

  it('인증 쿠키가 없으면 빈 배열 — 할 일이 없으면 아무것도 쓰지 않는다', () => {
    expect(authCookieRewrites('a=1; b=2', false, true)).toEqual([]);
  });
});

describe('isAuthCookieName — 접두사만 본다', () => {
  it.each([
    ['sb-abc-auth-token', true],
    ['sb-abc-auth-token.0', true],
    ['sb-zdoytzmvcafcebytttrm-auth-token.1', true],
    ['sb-abc-auth-token.x', false],
    ['sbx-abc-auth-token', false],
    ['other', false],
    ['sb--auth-token', false],
  ])('%s → %s', (name, expected) => {
    expect(isAuthCookieName(name)).toBe(expected);
  });
});

describe('subscribePersist — 쓰기가 구독자에게 알린다 (useSyncExternalStore 계약)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('writePersist 가 구독자를 깨운다 — 깨우지 않으면 스위치가 화면에 반영되지 않는다', () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} });
    let woke = 0;
    const off = subscribePersist(() => { woke += 1; });
    writePersist(false);
    writePersist(true);
    expect(woke).toBe(2);
    off();
    writePersist(false);
    expect(woke, '해지하면 더 이상 깨우지 않는다 — 누수가 되면 언마운트된 화면이 갱신된다').toBe(2);
  });

  it('저장이 막혀도 구독자는 깨운다 — 화면과 저장은 별개의 실패다', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
    });
    let woke = 0;
    const off = subscribePersist(() => { woke += 1; });
    expect(() => writePersist(false)).not.toThrow();
    expect(woke).toBe(1);
    off();
  });

  it('서버 스냅샷은 켬이다 — 서버는 이 기기의 선호를 알 수 없다', () => {
    expect(persistServerSnapshot()).toBe(true);
  });
});
