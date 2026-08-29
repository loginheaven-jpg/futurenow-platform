// 서가 B 잠금 — **뼈대 · 순위 · 이름 가리기 · 권한**(ORDER library_v2_B).
//
// 여기 있는 것은 **코드에 사는 사실**뿐이다. DB 판정(권한이 실제로 걷혔는가 · 가리기가 실제로
//   가리는가)은 **실물 조회**로 재고 보고서에 적는다 — 흉내 낸 판정은 아무것도 증명하지 못한다(계열 ⑦).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { B_COPY, REPORT_NOTICE } from './copy';

const read = (f: string) => readFileSync(f, 'utf8');
// 줄 나누기 상수. **이스케이프를 쓰지 않는다** — 편집 도구가 그것을 제어문자로 바꾼 일이
//   이 회차에 네 번 났다(하네스 계열 ⑪).
const NL = String.fromCharCode(10);
const MIG = 'supabase/migrations/20260903090001_library_v2_b.sql';
const MIG2 = 'supabase/migrations/20260903090002_library_v2_b_anon_revoke.sql';
const ROLLBACK = 'supabase/migrations/20260903090000_library_v2_b_rollback.sql';
const LIST = 'src/app/(public)/library/LibraryList.tsx';
const SOCIAL = 'src/app/(public)/library/[id]/ItemSocial.tsx';

describe('★ 순위를 만들지 않는다 (불변식 11 · 발주 §0-2)', () => {
  it('목록이 반응 수를 **정렬에 쓰지 않는다**', () => {
    const mig = read(MIG);
    // **그 함수 안에서만 본다** — 뒤에 오는 다른 함수의 `order by` 를 잡으면 자가 넓어진다(⑨-b).
    const at = mig.indexOf('create function public.library_list');
    const fn = mig.slice(at, mig.indexOf('$fn$;', at) + 5);
    // 순서는 시간순 **그대로**여야 한다. 반응·댓글이 order by 에 들어가면 순위가 생긴다.
    //
    // ★ **앞선 잣대는 이것을 못 잡았다**(2026-08-30 · 물려 보고 알았다).
    //   `order by cm.n desc, i.created_at desc` 를 심었더니 **초록**이었다 —
    //   「`i.created_at desc` 를 포함하는가」와 「낱말 셋이 없는가」만 물었기 때문이다.
    //   **포함은 정렬키가 하나임을 말하지 않는다.** 그래서 **절 전체가 그것뿐인지**를 묻는다.
    const orderBy = fn.slice(fn.lastIndexOf('order by')).replace(/\s+/g, ' ').trim();
    expect(orderBy, `목록 정렬키가 시간 하나가 아니다: ${orderBy}`).toBe('order by i.created_at desc; $fn$;');
  });

  it('★ 화면이 반응 수로 정렬·비교하지 않는다', () => {
    const list = read(LIST);
    // sort 가 들어오면 순위가 생긴다. 화면은 서버가 준 순서를 그대로 그린다.
    expect(list, '화면이 목록을 다시 정렬한다').not.toMatch(/\.sort\(/);
    for (const bad of ['백분위', '평균', 'percent', 'gauge']) {
      expect(list).not.toContain(bad);
    }
  });

  it('반응을 그리되 **크기를 그리지 않는다** — 막대·게이지·색이 없다', () => {
    const social = read(SOCIAL);
    expect(social, '막대·게이지가 들어왔다').not.toMatch(/progress|<meter|width:\s*`?\$\{/);
  });
});

describe('★ 이름 가리기는 한 자리에만 산다 (결재 ⑶⑷⑸⑻)', () => {
  it('가리기 규칙이 **DB 함수 하나**에만 있다', () => {
    expect(read(MIG)).toContain('create or replace function public.library_mask_name');
    // 화면·코어가 스스로 가리면 사본이 둘이 된다 — 한쪽만 고쳐진다.
    for (const f of [SOCIAL, LIST, 'src/core/context.ts']) {
      expect(read(f), `${f} 가 스스로 이름을 가린다`).not.toMatch(/repeat\('\*'|\*{3}|maskName\s*=/);
    }
  });

  it('★ 규칙이 **하나**다 — 글자 수별로 따로 적지 않았다', () => {
    const mig = read(MIG);
    const fn = mig.slice(mig.indexOf('create or replace function public.library_mask_name'));
    const body = fn.slice(0, fn.indexOf('$fn$;') + 5);
    // ★ **「그것뿐인가」로 묻는다** — 「어떤 갈래가 있는가」가 아니라 **갈래가 넷을 넘지 않는가**.
    //   널 · 안 가림 · 한 글자 · 두 글자 + 그 밖(else) 하나. **영문·공백을 위한 갈래가 더 붙으면**
    //   예외를 둔 것이고 그 예외가 나중에 낡는다(결재 ⑻).
    const whens = (body.match(/when/g) ?? []).length;
    expect(whens, `갈래가 ${whens} 개다 — 예외가 붙었다`).toBeLessThanOrEqual(4);
    expect(body, '영문에 예외를 두었다').not.toMatch(/[Aa]scii|A-Za-z/);
    expect(body).toContain('char_length(p_name) = 2');
  });

  it('밖에서는 작성자 **id 도** 내주지 않는다 — 이름을 가려도 id 로 사람이 붙는다', () => {
    const mig = read(MIG);
    const at = mig.indexOf('create or replace function public.library_comment_list');
    const fn = mig.slice(at, mig.indexOf('$fn$;', at));
    expect(fn).toContain('case when v_uid is null then null else c.author_id end');
    // ★ **「있는가」에서 한 단계 건넜다**(지휘부 기준 · 감리 2026-08-30) —
    //   조건식이 **있어도** 그 옆에 원본을 함께 낼 수 있다. 그러면 가려도 id 로 사람이 붙는다.
    //   그래서 **원본 `c.author_id` 를 벌거벗은 채 내는 자리가 없는지**까지 본다.
    const select = fn.slice(fn.indexOf('select c.id'), fn.indexOf('from public.library_comments'));
    expect(select, '조건식과 나란히 원본 author_id 를 낸다').not.toMatch(/^\s*c\.author_id\s*,?\s*$/m);
  });

  it('목록의 **작성자 이름도** 가린다 — 댓글만 가리고 목록을 열어 두면 뚫린다', () => {
    const mig = read(MIG);
    // **그 함수 안에서만 본다** — 뒤 함수의 것을 잡으면 자가 넓어진다(⑨-b).
    const at = mig.indexOf('create function public.library_list');
    const fn = mig.slice(at, mig.indexOf('$fn$;', at));
    expect(fn).toContain('public.library_mask_name(u.name, auth.uid() is null)');
    // ★ **「부르는가」로 그치지 않는다** — 그 결과가 `author_name` 자리에 **실제로 놓이는지**를 본다.
    //   부르고 버리면 가려지지 않은 `u.name` 이 나간다.
    expect(fn, '가리기 결과를 쓰지 않고 원본을 낸다').not.toMatch(/^\s+u\.name,\s*$/m);
  });
});

// ★ **이 절은 「썼는가」를 잰다. 「걷혔는가」는 `tests/defaultPrivileges.integration.test.ts` 가 잰다.**
//   문장이 포함돼도 **사실이 아닐 수 있다**(하네스 계열 ⑬ · 이 회차에 실제로 겪었다) —
//   그래서 **사실 검사를 실DB 쪽으로 옮겼고**, 여기 남은 것은 «마이그레이션이 그 문장을 갖는가» 다.
//   둘은 겹치지 않는다: 여기가 없으면 새 마이그레이션이 걷기를 잊고,
//   저기가 없으면 **썼는데 안 걷힌 것**을 못 본다.
describe('★ 권한 — 썼는지 잰다 (§0 ①②) · 걷혔는지는 실DB 잠금이 잰다 (§0 ③)', () => {
  it('표 다섯을 **전부** 걷는다 — 쓰지 않는 태그 표까지', () => {
    const mig = read(MIG);
    for (const t of ['library_tags', 'library_item_tags', 'library_reactions', 'library_comments', 'library_reports']) {
      expect(mig, `${t} 를 안 걷는다 — 걷은 것과 안 걷은 것이 섞인다`)
        .toMatch(new RegExp(`revoke all on public\\.${t}\\s+from anon, authenticated;`));
    }
  });

  it('★ 함수는 `public` 과 `anon` 을 **두 겹으로** 걷는다', () => {
    // `revoke … from public` 은 PUBLIC 만 걷는다. 이 프로젝트는 함수에도 default privileges 가
    //   걸려 있어 **anon 에 따로 붙는다**(실측). 한 겹만 걷으면 로그아웃이 쓰기 함수를 부른다.
    const both = read(MIG) + read(MIG2);
    // **정규식으로 공백을 짜맞추지 않는다** — 이름만 확인하고, 그 이름 뒤에 `from anon` 이
    //   실제로 오는지를 줄 단위로 본다. 공백 개수를 맞추려다 자가 헛돈다(계열 ⑪).
    const anonRevoked = new Set(
      both.split(NL)
        .filter((l) => l.trim().startsWith('revoke execute on function') && l.includes('from anon'))
        .map((l) => (l.match(/public\.(\w+)/) ?? [])[1])
        .filter(Boolean) as string[],
    );
    const publicRevoked = new Set(
      both.split(NL)
        .filter((l) => l.trim().startsWith('revoke all on function') && l.includes('from public'))
        .map((l) => (l.match(/public\.(\w+)/) ?? [])[1])
        .filter(Boolean) as string[],
    );
    for (const f of ['library_react', 'library_comment_create', 'library_report_create', 'library_my_reactions']) {
      expect(publicRevoked.has(f), `${f} 의 PUBLIC 을 안 걷는다`).toBe(true);
      expect(anonRevoked.has(f), `${f} 의 anon 을 안 걷는다`).toBe(true);
    }
  });

  it('로그아웃이 부를 수 있는 것은 **읽기 둘뿐**이다', () => {
    const mig = read(MIG);
    const grants = mig.slice(mig.indexOf('-- 로그아웃도 보는 것'));
    const anonLines = grants.split('\n').filter((l) => l.startsWith('grant') && l.includes('anon'));
    expect(anonLines).toHaveLength(2);
    expect(anonLines.join('\n')).toContain('library_list()');
    expect(anonLines.join('\n')).toContain('library_comment_list(uuid)');
  });
});

describe('★ 되돌아가는 문 — 만든 것을 전부 걷는다 (§4)', () => {
  it('본문이 만드는 함수를 롤백이 **하나도 빠짐없이** 걷는다', () => {
    const made = [...read(MIG).matchAll(/create (?:or replace )?function public\.(\w+)/g)].map((m) => m[1]);
    const dropped = [...read(ROLLBACK).matchAll(/drop function if exists public\.(\w+)/g)].map((m) => m[1]);
    const missing = made.filter((f) => !dropped.includes(f));
    // 서가 A 에서 `service_role` 이, 이 회차 예행에서 함수 둘이 빠졌던 그 형태다.
    expect(missing, `롤백이 안 걷는 함수: ${missing.join(', ')}`).toHaveLength(0);
    expect(made.length).toBeGreaterThan(0); // 물 것이 실재하는지 먼저 본다
  });
});

describe('★ 신고는 운영자만 본다 (결재 ⑺)', () => {
  it('신고 함수 셋이 `is_admin` 을 본다', () => {
    const mig = read(MIG);
    for (const f of ['library_report_open_count', 'library_report_list', 'library_report_handle']) {
      const at = mig.indexOf(`function public.${f}`);
      const body = mig.slice(at, mig.indexOf('$fn$;', at));
      // ★ **「부르는가」가 아니라 「막는가」를 묻는다**(지휘부 감리 2026-08-30 · 예 ②).
      //   게이트 호출이 포함돼도 **결과를 무시할 수 있다** — 도구 게이트에서 이미 겪은 형태다.
      //   `if not is_admin(...) then raise` 로 **이어져야** 실제로 막는다.
      expect(body.replace(/\s+/g, ' '), `${f} 가 운영자 판정 결과를 쓰지 않는다`)
        .toMatch(/if not public\.is_admin\(auth\.uid\(\)\) then raise exception/);
    }
  });

  it('★ 신고 목록이 **신고한 사람을 내주지 않는다** — 타입으로 막았다', () => {
    const domain = read('src/contracts/domain.ts');
    const block = domain.slice(domain.indexOf('export interface LibraryReport'));
    const fields = block.slice(0, block.indexOf('}'));
    expect(fields).not.toMatch(/reporter|reporterId/);
    const mig = read(MIG);
    const fn = mig.slice(mig.indexOf('function public.library_report_list'));
    expect(fn.slice(0, fn.indexOf('$fn$;'))).not.toContain('reporter_id,');
  });
});

describe('문안 열 — 최박사 결재분(2026-08-30)', () => {
  it('열 문장이 글자 그대로다', () => {
    expect(B_COPY.reactLocked).toBe('로그인하시면 마음을 남길 수 있어요.');
    expect(B_COPY.commentPlaceholder).toBe('이 자료에 한마디 남겨 주세요.');
    expect(B_COPY.commentEmpty).toBe('아직 남긴 말이 없어요. 먼저 한마디 남겨 주세요.');
    expect(B_COPY.commentDeleteConfirm).toBe('남기신 말을 지웁니다. 되돌릴 수 없어요.');
    expect(B_COPY.maskedNote).toBe('이름은 로그인하신 분께만 보입니다.');
    expect(B_COPY.reportButton).toBe('운영자에게 알리기');
    expect(B_COPY.reportPrompt).toBe('무엇이 마음에 걸리셨는지 알려 주세요. 이 글은 운영자만 봅니다.');
    expect(B_COPY.reportDone).toBe('알려 주셔서 고맙습니다. 운영자가 확인하겠습니다.');
    expect(B_COPY.reportAlready).toBe('이미 알려 주셨어요. 운영자가 확인하고 있습니다.');
    expect(REPORT_NOTICE.line(3)).toBe('확인하지 않은 신고 3건');
    expect(REPORT_NOTICE.sub).toBe('자료를 열어 확인합니다');
  });

  it('★ 「운영자」가 네 자리에서 **하나로** 선다 — 앞이 약속한 것을 뒤가 지킨다', () => {
    for (const s of [B_COPY.reportButton, B_COPY.reportPrompt, B_COPY.reportDone, B_COPY.reportAlready]) {
      expect(s, '신고 갈래에서 낱말이 갈렸다').toContain('운영자');
    }
  });

  it('★ 「한마디」가 두 자리에서 하나로 선다', () => {
    expect(B_COPY.commentPlaceholder).toContain('한마디');
    expect(B_COPY.commentEmpty).toContain('한마디');
  });

  it('금지 기호·어휘가 없다(표 §0)', () => {
    for (const [k, v] of Object.entries(B_COPY)) {
      for (const bad of ['—', '–', '않으셔도 됩니다', '오류', '실패']) {
        expect(v as string, `${k} 에 ${bad}`).not.toContain(bad);
      }
    }
  });

  it('화면이 문장을 다시 적지 않는다 — 사본이 둘이면 갈린다', () => {
    const social = read(SOCIAL);
    for (const v of Object.values(B_COPY)) expect(social).not.toContain(v as string);
    expect(social).toContain('B_COPY.');
  });

  it('★ 운영 화면의 「신고」와 참여자의 「운영자에게 알리기」는 **일부러 다르다**', () => {
    // 하나로 통일하면 참여자에게 «고발» 의 말이 가거나 운영자가 무엇이 쌓였는지 못 읽는다.
    expect(REPORT_NOTICE.line(1)).toContain('신고');
    expect(B_COPY.reportButton).not.toContain('신고');
  });
});
