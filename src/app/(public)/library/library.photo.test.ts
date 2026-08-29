// 사진 인라인 잠금 — **뼈대가 안 깨졌는가 · 판정이 갈리지 않는가**(최박사 판정 2026-08-29).
//
// 여기 있는 것은 **코드에 사는 사실**뿐이다. DB 판정(can_view × mimetype × 상한)은
//   실물 조회로 재고 보고서에 적는다 — **흉내 낸 판정은 내가 만든 것을 내가 부르는 것이라
//   아무것도 증명하지 못한다**(계열 ⑦).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (f: string) => readFileSync(f, 'utf8');
const LIST = 'src/app/(public)/library/LibraryList.tsx';
const MIG = 'supabase/migrations/20260902090001_library_inline_photo.sql';

describe('사진이 들어와도 §4「주소가 없다」가 산다', () => {
  it('★ `LibraryItem` 에 주소도 **경로도** 없다 — 사진이 생겨도 마찬가지다', () => {
    const domain = read('src/contracts/domain.ts');
    const block = domain.slice(domain.indexOf('export interface LibraryItem'), domain.indexOf('export interface LibrarySource'));
    expect(block).toContain('photo: boolean');
    // **필드 선언 줄만 본다** — 주석은 다른 타입을 언급할 수 있고(피드의 `photoPath` 처럼),
    //   그것까지 세면 자가 재려는 것보다 넓어진다(⑨-b: 창이 넓다).
    //   줄 첫 글자가 들여쓰기 뒤 바로 이름인 줄이 선언이다. 주석 줄은 `//`·`*` 로 시작한다.
    expect(block, '경로가 들어오면 목록이 주소를 내는 것과 같아진다')
      .not.toMatch(/^\s*(photoPath|storagePath|url)\s*[?:]/m);
  });

  it('목록은 주소를 **받지 않고 조립한다** — 프록시 라우트다', () => {
    const list = read(LIST);
    expect(list).toContain('/file`');
    expect(list, '서명 URL 이면 잔여 창이 생긴다').not.toMatch(/signedUrl|createSignedUrl|supabase\.co/);
  });
});

describe('★ 화면이 판정을 다시 하지 않는다 — 판정은 서버 한 곳이다', () => {
  it('목록은 `photo` 를 그대로 따른다', () => {
    expect(read(LIST)).toMatch(/\{i\.photo \? \(/);
  });

  it('★ 목록이 mimetype·크기·등급으로 **스스로 판정하지 않는다**', () => {
    const list = read(LIST);
    // 이 낱말들이 화면에 나타나면 판정이 두 곳이 된 것이다 — 한 곳만 고쳐질 때 갈린다.
    for (const bad of ['mimetype', 'image/', "tier === 'public'", 'MAX_BYTES']) {
      expect(list, `화면이 ${bad} 로 스스로 판정한다`).not.toContain(bad);
    }
  });
});

describe('★ 상한은 사본이 하나다(불변식 23)', () => {
  // **양방향으로 잰다**(지휘부 감리 2026-08-29). 아래 것만 두면 «TS 에 없다» 는 재지만
  //   «DB 에 있다» 는 안 재므로 **DB 쪽 상한이 사라져도 초록**이다 —
  //   실제로 정의를 지우고 돌려 보니 7/7 초록이었다. **한 방향만 재는 자는 절반만 잰다.**
  it('★ 상한이 **DB 에 실재한다** — 정의가 있고 숫자를 낸다', () => {
    const mig = read(MIG);
    // 호출이 아니라 **정의**가 있어야 한다. 호출만 남기고 정의를 지우는 것이 그 구멍이었다.
    expect(mig, '상한 함수의 정의가 없다 — 호출만 있으면 DB 에서 터진다')
      .toMatch(/create (or replace )?function public.library_inline_photo_max_bytes()/);
    const at = mig.search(/create (or replace )?function public.library_inline_photo_max_bytes/);
    const def = mig.slice(at);
    const body = def.slice(0, def.indexOf('$fn$;') + 5);
    // 정의가 **바이트 수를 낸다**. 숫자를 여기 적지 않는다 — 적으면 사본이 둘이 된다(불변식 23).
    expect(body, '상한 함수가 숫자를 내지 않는다').toMatch(/[0-9]/);
    expect(body, '반환형이 바이트 수가 아니다').toContain('returns bigint');
  });

  it('★ 되돌아가는 문이 상한 함수를 **걷는다** — 짝이 맞는다', () => {
    const rb = read('supabase/migrations/20260902090000_library_inline_photo_rollback.sql');
    expect(rb, '롤백이 상한 함수를 남기면 되돌린 뒤에 고아가 선다')
      .toMatch(/drop function if exists public.library_inline_photo_max_bytes/);
  });

  it('상한 숫자가 **DB 에만** 있다 — TS 어디에도 없다', () => {
    expect(read(MIG)).toContain('library_inline_photo_max_bytes');
    for (const f of [LIST, 'src/app/_vocab/library.ts', 'src/core/context.ts', 'src/contracts/domain.ts']) {
      expect(read(f), `${f} 에 상한 숫자가 옮겨 적혀 있다`).not.toMatch(/5\s*\*\s*1024\s*\*\s*1024|5242880/);
    }
  });

  it('상한 함수를 목록 RPC 가 **불러서** 쓴다 — 숫자를 박지 않는다', () => {
    const mig = read(MIG);
    const fn = mig.slice(mig.indexOf('create function public.library_list'));
    expect(fn).toContain('public.library_inline_photo_max_bytes()');
    expect(fn, 'RPC 안에 숫자를 박으면 함수와 갈린다').not.toMatch(/<=\s*\d{4,}/);
  });
});

describe('★ 판정이 갈라지지 않는다 — can_view 가 거짓이면 photo 도 거짓이다', () => {
  it('RPC 가 `can_view` 를 **한 번만** 부르고 둘이 그것을 함께 쓴다', () => {
    const mig = read(MIG);
    const fn = mig.slice(mig.indexOf('create function public.library_list'));
    // 두 번 부르면 두 값이 갈릴 자리가 생긴다.
    const calls = (fn.match(/library_can_view\(/g) ?? []).length;
    expect(calls, `library_can_view 를 ${calls}번 부른다 — 한 번이어야 한다`).toBe(1);
    // 그리고 사진 조건이 그 값과 **곱해져** 있어야 한다.
    expect(fn).toMatch(/coalesce\(\s*v\.can_view/);
  });
});
// 등급 뜻 세 문장의 잠금은 **확정 문안 잠금**(`library.copy.test.ts`)에 있다 —
//   최박사 결재분이라 §1 의 넷과 **같은 급**이고, 잠금도 같은 자리에 있어야 다음 사람이 함께 본다.
