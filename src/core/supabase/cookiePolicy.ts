// 세션 쿠키 정책 — **판정은 순수 함수, 부수효과는 얇게** (5차 소건 1 라·마).
//
// **왜 이 파일이 생겼나.** `@supabase/ssr` 0.12 의 기본 쿠키 옵션은
//   `{ path:'/', sameSite:'lax', httpOnly:false, maxAge: 400일 }` 이고 **`secure` 가 없다**
//   (`node_modules/@supabase/ssr/dist/main/utils/constants.js`). 운영 실측에서도 그대로였다 —
//   `secure=false`. HSTS(2년) + `http→https` 308 이 걸려 있어 노출 창은 *그 기기가 이 도메인에
//   생애 처음 평문으로 닿는 순간* 뿐이지만, **좁은 것과 없는 것은 다르다**(지휘부 기록 그대로).
//
// **그리고 라이브러리는 `maxAge` 를 덮어쓴다.** `cookies.js` 의 `setCookieOptions` 가
//   `{...DEFAULT, ...options.cookieOptions, maxAge: DEFAULT.maxAge}` 라서
//   **`cookieOptions.maxAge` 로는 세션 쿠키를 만들 수 없다.** 그래서 소건 1-마(로그인 유지 스위치)는
//   `cookies` 어댑터를 직접 넘겨 **수명만** 손보는 길로 간다.
//
// **이것은 "자가제작 우회" 가 아니다**(하네스 머리의 경고와 구별된다). 그 경고는
//   *Supabase 쿠키 형식에 결합된* 우회를 말한다 — 토큰을 우리가 합성하면 형식이 바뀔 때 조용히 깨진다.
//   여기서는 **이름·값·옵션을 라이브러리가 만들어 건네주고**, 우리는 `Max-Age` 한 칸만 지운다.
//   값의 형식(base64url·청크)을 읽지도 만들지도 않는다. 손대는 층은 **쿠키 헤더 문법**이고
//   그것은 웹 표준이라 늙지 않는다.

/** `Partial<SerializeOptions>` 중 우리가 실제로 쓰는 것만. 라이브러리가 채워 건네준다. */
export interface CookieWriteOptions {
  path?: string;
  domain?: string;
  sameSite?: boolean | 'lax' | 'strict' | 'none';
  secure?: boolean;
  httpOnly?: boolean;
  maxAge?: number;
  expires?: Date;
}

/**
 * **`Secure` 를 붙일 것인가** — 프로토콜만 보고 정한다.
 *
 * `https` 가 아닌 곳에서 `Secure` 를 붙이면 **브라우저가 쿠키를 아예 저장하지 않는다.**
 * 개발 서버(`http://localhost:3100`)에서 로그인이 통째로 깨지는 길이라 조건부여야 한다.
 * 값이 아니라 **관측한 프로토콜**로 정하는 것이 요점이다 — `NODE_ENV` 로 가르면
 * 프리뷰·프록시 환경에서 어긋난다.
 */
export function secureCookies(protocol: string | null | undefined): boolean {
  if (!protocol) return false;
  return protocol.toLowerCase().replace(/:$/, '') === 'https';
}

/**
 * 프록시 뒤에서 원 프로토콜을 읽는다. Vercel 은 `x-forwarded-proto` 를 준다.
 * 값이 `https, http` 처럼 여럿일 수 있어 **첫 칸**을 본다(가장 바깥 = 클라이언트가 실제로 쓴 것).
 */
export function protocolFromForwarded(header: string | null | undefined, fallback: string | null): string | null {
  if (!header) return fallback;
  const first = header.split(',')[0]?.trim();
  return first || fallback;
}

// ── 소건 1-마 · 이 기기에서 로그인 유지 ────────────────────────────────────

/** 기기 단위 선호값. **자격이 아니라 취향**이라 localStorage 로 충분하다. */
export const PERSIST_STORAGE_KEY = 'fn.auth.persist';

/**
 * **기본은 켬이다.** 읽기가 실패해도(사생활 보호 모드·저장 차단) 켬으로 본다 —
 * 못 읽었다는 이유로 사용자를 로그아웃 체감으로 밀어 넣지 않는다.
 */
export function readPersist(): boolean {
  try {
    return globalThis.localStorage?.getItem(PERSIST_STORAGE_KEY) !== '0';
  } catch {
    return true;
  }
}

/**
 * 구독자 — `useSyncExternalStore` 용. **effect 안에서 setState 를 하지 않기 위해서**다.
 *   초기값을 effect 로 읽으면 첫 렌더 뒤 한 번 더 렌더가 돌고(연쇄 렌더), 린트가 그것을 막는다.
 *   여기서는 **서버 스냅샷은 기본값(켬), 클라이언트 스냅샷은 실제 값**이라 SSR 불일치도 없다.
 */
const persistListeners = new Set<() => void>();

export function subscribePersist(onChange: () => void): () => void {
  persistListeners.add(onChange);
  return () => {
    persistListeners.delete(onChange);
  };
}

/** 서버 렌더 스냅샷 — **기본은 켬**이다. 서버는 이 기기의 선호를 알 수 없다(기기 단위 값). */
export function persistServerSnapshot(): boolean {
  return true;
}

export function writePersist(persist: boolean): void {
  try {
    globalThis.localStorage?.setItem(PERSIST_STORAGE_KEY, persist ? '1' : '0');
  } catch {
    /* 저장이 막힌 브라우저 — 이번 세션에만 적용된다. 조용히 넘긴다(기능이 아니라 편의다) */
  }
  for (const l of persistListeners) l();
}

/**
 * 수명 한 칸만 손본다.
 *  - 유지 켬: 받은 그대로 돌려준다(라이브러리의 400일).
 *  - 유지 끔: `maxAge`·`expires` 를 **지운다** → 둘 다 없으면 **세션 쿠키**다(브라우저를 닫으면 사라진다).
 *
 * **삭제(`maxAge: 0`)는 건드리지 않는다.** 로그아웃·토큰 폐기가 그 경로를 쓰는데
 * 여기서 지워 버리면 **지워야 할 쿠키가 세션 쿠키로 살아남는다.**
 */
export function applyPersistence<T extends CookieWriteOptions>(options: T, persist: boolean): T {
  if (persist) return options;
  if (options.maxAge === 0) return options; // 삭제 지시 — 그대로 통과시킨다
  const next = { ...options };
  delete next.maxAge;
  delete next.expires;
  return next;
}

// ── 쿠키 헤더 문법(웹 표준) ────────────────────────────────────────────────
// 라이브러리 기본 어댑터(`cookies.js`)가 `cookie` 패키지의 `parse`/`serialize` 로 하는 것과
// **같은 의미**를 갖도록 맞춘다: 값은 percent-encoding, 옵션은 표준 속성.

export function parseCookieHeader(header: string): { name: string; value: string }[] {
  const out: { name: string; value: string }[] = [];
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const name = part.slice(0, eq).trim();
    if (!name) continue;
    let value = part.slice(eq + 1).trim();
    try {
      value = decodeURIComponent(value);
    } catch {
      /* 잘못 인코딩된 값 — 원문 그대로 넘긴다(라이브러리가 판정한다) */
    }
    out.push({ name, value });
  }
  return out;
}

export function serializeCookie(name: string, value: string, options: CookieWriteOptions = {}): string {
  let s = `${name}=${encodeURIComponent(value)}`;
  if (options.maxAge !== undefined) s += `; Max-Age=${Math.floor(options.maxAge)}`;
  if (options.expires) s += `; Expires=${options.expires.toUTCString()}`;
  if (options.domain) s += `; Domain=${options.domain}`;
  s += `; Path=${options.path ?? '/'}`;
  if (options.sameSite) {
    const v = options.sameSite === true ? 'Strict' : options.sameSite;
    s += `; SameSite=${String(v).charAt(0).toUpperCase()}${String(v).slice(1)}`;
  }
  if (options.secure) s += '; Secure';
  // httpOnly 는 `document.cookie` 로 세울 수 없다 — 붙이면 브라우저가 그 쓰기를 통째로 무시한다.
  //   라이브러리 기본값도 `httpOnly: false` 다(브라우저 클라이언트가 읽어야 한다).
  return s;
}

/** 인증 쿠키 이름(`sb-<ref>-auth-token`·청크 `.0`·`.1`). 형식을 읽지 않고 **접두사만** 본다. */
export function isAuthCookieName(name: string): boolean {
  return /^sb-.+-auth-token(\.\d+)?$/.test(name);
}

/**
 * **스위치를 끈 그 순간에 이미 깔려 있는 쿠키까지 바꾼다.**
 *
 * 이것이 없으면 스위치는 *다음 로그인부터* 듣는다 — 사용자가 끄고 브라우저를 닫았는데
 * 그대로 남아 있으면 **스위치가 거짓말을 한 것**이 된다.
 *
 * 순수 함수다: `document.cookie` 에 그대로 대입할 문자열들을 돌려주고, 대입은 호출부가 한다
 * (그래야 jsdom 없이 전수로 잴 수 있다).
 *
 * **값을 그대로 다시 쓴다** — 토큰을 해석하지 않는다. `path`·`sameSite` 는 우리가 아는 값이 아니라
 * **라이브러리 기본값과 같은 값**을 쓴다(`path:'/'`·`sameSite:'lax'`). 기존 쿠키에서 그 속성을
 * 읽어 올 방법이 브라우저에 없기 때문이고, 우리가 심을 때 쓰는 값과 같으므로 어긋나지 않는다.
 */
export function authCookieRewrites(cookieHeader: string, persist: boolean, secure: boolean): string[] {
  const base: CookieWriteOptions = {
    path: '/',
    sameSite: 'lax',
    secure,
    maxAge: 400 * 24 * 60 * 60, // 라이브러리 기본값과 같다(DEFAULT_COOKIE_OPTIONS)
  };
  return parseCookieHeader(cookieHeader)
    .filter((c) => isAuthCookieName(c.name))
    .map((c) => serializeCookie(c.name, c.value, applyPersistence(base, persist)));
}
