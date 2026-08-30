// 그룹 리포트 화면 잠금 — 인수 1·7·8·9(ORDER group_report v2 §4).
//
// **코드에 사는 사실만 잰다.** 렌더 정확성은 `groupModel.test.ts` 가 순수 함수로 잰다 —
//   흉내 낸 페이지 렌더는 내가 만든 것을 내가 부르는 것이라 아무것도 증명하지 못한다(계열 ⑦).
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';

const read = (f: string) => readFileSync(f, 'utf8');
// 줄 나누기 — **이스케이프를 쓰지 않는다**(하네스 계열 ⑫).
const NL = String.fromCharCode(10);
const PAGE = 'src/app/coach/cohort/[cohortId]/group/page.tsx';
const DESIGN = 'src/instruments/futurenow/report/GroupDesign.tsx';
const MODEL = 'src/instruments/futurenow/report/groupModel.ts';

describe('★ 블록 순서 (인수 1)', () => {
  it('0 → 1 → 2 → 3 → 4 가 그 차례로 선다', () => {
    const src = read(DESIGN);
    const order = [...src.matchAll(/no=\{(\d)\}\s*\n\s*title="([^"]+)"/g)].map((m) => [Number(m[1]), m[2]] as const);
    expect(order.map((o) => o[0]), '블록 번호가 순서대로가 아니다').toEqual([0, 1, 2, 3, 4]);
    expect(order.map((o) => o[1])).toEqual([
      '응답 현황', '돌봄 우선 명단', '활력 분포', '함정 분포 · 소그룹 편성', '가장 간절한 영역',
    ]);
  });

  it('★ 블록 5(함께 보는 자료)가 **페이지에서 마지막**이다', () => {
    const src = read(PAGE);
    const design = src.indexOf('<GroupDesign');
    const five = src.indexOf('함께 보는 자료 · 평균 지형');
    expect(design, 'GroupDesign 이 없다').toBeGreaterThan(0);
    expect(five, '블록 5 가 없다').toBeGreaterThan(design);
  });
});

describe('★ 사후 범위 (인수 9)', () => {
  it('블록 0~4 는 **사전 기준으로만** 그린다', () => {
    const src = read(PAGE);
    // GroupDesign 에 넘기는 것은 preMembers 하나여야 한다.
    expect(src).toMatch(/<GroupDesign[^>]*done=\{preMembers\}/);
    expect(src, '사후를 편성 블록에 넘긴다').not.toMatch(/<GroupDesign[^>]*postMembers/);
  });

  it('사후 비교는 **블록 5 안에서만** 산다', () => {
    const src = read(PAGE);
    const five = src.indexOf('함께 보는 자료 · 평균 지형');
    // 비교 렌더(postScores)가 블록 5 뒤에 있어야 한다.
    const post = src.indexOf('all={postScores}');
    expect(post, 'postScores 렌더가 없다').toBeGreaterThan(five);
  });

  it('비교가 있을 때 캡션이 그 사실을 말한다', () => {
    expect(read(PAGE)).toContain('위쪽 편성·돌봄 자료는');
  });
});

describe('★ 이름 링크 (인수 7)', () => {
  it('개인 리포트 경로로 가고 **새 창**으로 연다', () => {
    const src = read(DESIGN);
    expect(src).toContain('/coach/cohort/${cohortId}/report/${m.responseId}');
    expect(src).toContain("target=\"_blank\"");
    expect(src, '새 창에 rel 이 빠지면 opener 가 새어 나간다').toContain('rel="noopener noreferrer"');
  });

  it('모달을 쓰지 않는다 — 개인 리포트는 긴 화면이다', () => {
    expect(read(DESIGN)).not.toMatch(/modal|Modal|Dialog/);
  });
});

describe('★ 참여자 미노출 (인수 8 · 회귀 잠금)', () => {
  it('멤버는 되돌리고 비소유 차수는 404 다', () => {
    const src = read(PAGE);
    expect(src, '참여자 차단이 사라졌다').toContain("me.role === 'user'");
    expect(src).toContain("redirect('/home')");
    expect(src, '소유 게이트가 사라졌다').toContain('notFound()');
    expect(src).toContain("redirect('/login')");
  });
});

describe('★ 경계 — 채점·초안·조회를 건드리지 않았다', () => {
  it('집계 모델이 **채점하지 않는다**(경계 2)', () => {
    const src = read(MODEL);
    expect(src, '집계가 점수를 다시 계산한다').not.toMatch(/scoreFuturenow|futurenowScoring/);
  });

  it('★ 초안(`response_drafts`)에 손대지 않는다(경계 6)', () => {
    // 「작성 중」 3단계는 RLS 가 본인 행만 허용해 만들 수 없고, 만들지 않기로 확정됐다.
    // **주석이 아니라 코드만 본다** — 이 결정을 설명하려면 그 이름을 적어야 하고,
    //   그것까지 세면 자가 재려는 것보다 넓어진다(⑨-b).
    for (const f of [PAGE, DESIGN, MODEL]) {
      const code = read(f).split(NL)
        .filter((l) => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*'); })
        .join(NL);
      expect(code, `${f} 가 초안을 만진다`).not.toMatch(/getDraft|response_drafts|saveDraft/);
    }
  });

  it('★ 컴포넌트가 스스로 조회하지 않는다 — 페이지가 이름을 조인해 넘긴다', () => {
    const src = read(DESIGN);
    expect(src, '컴포넌트가 코어를 부른다').not.toMatch(/createServerContext|listCohortMembers|listResponses/);
    // 조인은 페이지 층에서.
    // ★ 세 번째 인자(마스킹 옵트인)가 붙었다 — 인수 5 가 그것을 따로 잰다.
    expect(read(PAGE)).toContain('listCohortMembers(cohortId, true, true)');
  });

  it('AI 해석(`interpretation`)과 무관하다(경계 3)', () => {
    for (const f of [PAGE, DESIGN, MODEL]) {
      expect(read(f)).not.toContain('interpretation');
    }
  });
});

describe('★ PDF 대비 구조 (ORDER v2 §1)', () => {
  it('앱 크롬이 식별 가능한 컨테이너로 감싸여 있다', () => {
    const src = read(PAGE);
    expect(src).toContain('group-report-root');
    expect(src, '인쇄에서 숨길 크롬을 가릴 수 없다').toContain('group-report-chrome');
  });
});

describe('★ PDF 저장 — 브라우저 인쇄 경로 (ORDER (b) v2)', () => {
  const CSS = 'src/app/globals.css';

  it('인쇄 버튼을 **재사용**한다 — 새로 만들지 않았다', () => {
    const src = read(PAGE);
    expect(src).toContain('<ReportPrintButton />');
    // 개인 리포트의 것을 그대로 부른다(이미 두 화면이 재사용 중이다).
    expect(src).toContain("report/[responseId]/ReportPrintButton");
  });

  it('★ 앱 크롬이 인쇄에서 빠진다 (인수 2)', () => {
    expect(read(PAGE)).toContain('group-report-chrome no-print');
  });

  it('★ PDF 전용 문서 헤더가 **화면에는 안 보인다** (인수 3)', () => {
    const src = read(PAGE);
    const at = src.indexOf('className="print-only"');
    expect(at, 'PDF 전용 헤더가 없다').toBeGreaterThan(0);
    // `.print-only` 는 @media print 에서만 display:block 이 된다 — 화면에서는 none 이어야 한다.
    expect(src.slice(at, at + 200), '화면에서도 보인다').toContain("display: 'none'");
    // 담을 넷: 그룹명 · wave · 참여자 수 · 생성일.
    expect(src).toContain('{cohort.name} · 그룹 리포트');
    expect(src).toContain('등록 {members.length}명 · 완료 {preMembers.length}명');
    expect(src).toContain('toLocaleDateString');
  });

  it('★ 블록이 페이지 경계에서 잘리지 않는다 (인수 4)', () => {
    const css = read(CSS);
    const at = css.indexOf('.group-report-root');
    expect(at, '인쇄 규칙이 없다').toBeGreaterThan(0);
    const block = css.slice(at, at + 900);
    expect(block, '인쇄 폭을 안 넓힌다').toContain('max-width: none !important');
    expect(block, '블록이 갈린다').toContain('break-inside: avoid');
    // 함정 3열은 인쇄에서도 가로다 — 세로로 무너지면 「조 편성」 형태가 사라진다.
    expect(block).toContain('.group-report-root .group-traps');
    expect(read(DESIGN), '3열에 인쇄용 표식이 없다').toContain('className="group-traps"');
  });

  it('★★ 민감 채널을 부르지 않는다 (인수 5 · 경계 3)', () => {
    // 이름 마스킹을 위해 `getCohortMemberDetail` 을 부르면 **전화·주소까지 딸려 온다** —
    //   그 RPC 는 「전화 개방은 이 RPC 한정」이라 못 박은 자리이고 불변식 13 이 그것을 지킨다.
    //   ② 마스킹은 다음 회차에 **DB 안에서** 푼다(원문이 앱에 오지 않게).
    for (const f of [PAGE, DESIGN, MODEL]) {
      const code = read(f).split(NL)
        .filter((l) => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*'); })
        .join(NL);
      expect(code, `${f} 가 민감 채널을 만진다`).not.toMatch(/getCohortMemberDetail|user_contacts|listUsers|getPhone/);
    }
  });

  it('표시명을 만드는 지점이 **한 곳**이다 — 다음 회차에 마스킹을 붙일 자리', () => {
    // `displayName` 하나만 부르고 블록마다 따로 짓지 않는다.
    expect(read(DESIGN)).toContain('displayName');
    expect(read(MODEL)).toContain('export const displayName');
  });

  it('★ 시들음 색 판단 근거가 코드에 남아 있다 (③)', () => {
    // 나중 감사에서 논쟁이 재발하지 않게 한다.
    expect(read(DESIGN)).toContain("tone: 'care'");
    expect(read(DESIGN)).toContain('경계 4의 예외가 아니다');
  });
});

describe('★ 이름 없는 참여자 — DB 마스킹 (ORDER ②)', () => {
  const MIG = 'supabase/migrations/20260904090001_member_directory_mask.sql';
  const ROLLBACK = 'supabase/migrations/20260904090000_member_directory_mask_rollback.sql';
  const CORE = 'src/core/context.ts';

  it('★ 앱에 마스킹 로직이 **없다** — 가리는 일은 DB 에서 끝난다 (인수 4)', () => {
    // 앱이 이메일 원문을 받아 가리면 **가리려는 것을 먼저 내보내는 순서**가 된다.
    for (const f of [PAGE, DESIGN, MODEL]) {
      const code = read(f).split(NL)
        .filter((l) => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*'); })
        .join(NL);
      // `@` 하나로 재면 import 경로가 걸린다 — 자가 재려는 것보다 넓다(⑨-b).
      //   이메일을 **다루는 표시**를 본다: 로컬파트 자르기 · email 식별자 · 마스킹 문자열.
      const AT = String.fromCharCode(64);
      for (const bad of ['split_part', 'email', 'Email', `split('${AT}')`, `indexOf('${AT}')`]) {
        expect(code, `${f} 가 이메일을 만진다: ${bad}`).not.toContain(bad);
      }
      expect(code, `${f} 에 마스킹 로직이 있다`).not.toContain("'***'");
    }
  });

  it('★ 옵트인은 **그룹 리포트 한 곳뿐**이다 (인수 5)', () => {
    const files: string[] = [];
    const walk = (d: string) => {
      for (const e of readdirSync(d)) {
        const full = `${d}/${e}`;
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.tsx?$/.test(e) && !e.includes('.test.')) files.push(full);
      }
    };
    walk('src');
    const callers = files.filter((f) => /listCohortMembers\(/.test(read(f)) && !/contracts|core\/context/.test(f));
    // **물 것이 실재하는가** — 호출처를 하나도 못 찾으면 이 잠금은 헛돈다(계열 ⑦).
    expect(callers.length, '호출처를 못 찾았다').toBeGreaterThan(3);
    const optedIn = callers.filter((f) => /listCohortMembers\([^)]*true,\s*true\)/.test(read(f)));
    expect(optedIn, `옵트인이 여럿이다: ${optedIn.join(', ')}`).toEqual([PAGE]);
  });

  it('★ 기본값이 기존 동작이다 (인수 1)', () => {
    const mig = read(MIG);
    expect(mig).toContain('p_mask_unnamed boolean DEFAULT false');
    // 끄면 u.name 을 그대로 낸다 — NULL 이면 NULL.
    expect(mig).toContain('WHEN NOT p_mask_unnamed THEN u.name');
    expect(read(CORE)).toContain('maskUnnamed = false');
  });

  it('★ 마스킹 규칙과 **4자 경계** (인수 2)', () => {
    const mig = read(MIG);
    // 5자 이상 → 앞 4자 + ***
    expect(mig).toContain("char_length(split_part(u.email, '@', 1)) >= 5");
    expect(mig).toContain("left(split_part(u.email, '@', 1), 4) || '***'");
    // 4자 이하 → 전체 + *** (4자는 **아래쪽**이다)
    expect(mig).toContain("ELSE split_part(u.email, '@', 1) || '***'");
    // 도메인을 쓰지 않는다 — split_part 의 두 번째 조각을 부르는 자리가 없다.
    expect(mig, '도메인을 표시한다').not.toMatch(/split_part\(u\.email, '@', 2\)/);
  });

  it('★ 폴백 순서 — 이름 · 마스킹 · 「이름 없음」 (인수 3)', () => {
    const mig = read(MIG);
    const name = mig.indexOf('THEN u.name');                       // ① 이름이 있으면 이름
    const noMail = mig.indexOf('u.email IS NULL');                 // ② 이메일도 없으면 NULL
    const mask = mig.indexOf("|| '***'");                          // ③ 마스킹
    expect(name).toBeGreaterThan(0);
    expect(noMail).toBeGreaterThan(name);
    expect(mask).toBeGreaterThan(noMail);
    // 앱은 NULL 을 「이름 없음」으로 받는다 — 그 폴백이 살아 있다.
    expect(read(MODEL)).toContain("export const NO_NAME = '이름 없음'");
  });

  it('★ 권한 게이트가 그대로다 — 새 인자가 우회하지 않는다 (인수 8)', () => {
    const mig = read(MIG);
    expect(mig).toContain('public.is_cohort_coach(p_cohort_id, auth.uid()) OR public.is_admin(auth.uid())');
    // 게이트가 **인자 검사보다 먼저** 있어야 한다.
    expect(mig.indexOf('is_cohort_coach')).toBeLessThan(mig.indexOf('p_mask_unnamed THEN'));
  });

  it('★ 오버로드를 남기지 않는다 · 권한을 두 겹으로 걷는다', () => {
    const mig = read(MIG);
    // 인자 수가 바뀌면 둘이 공존해 2인자 호출이 어디로 갈지 갈린다.
    expect(mig).toContain('drop function if exists public.cohort_member_directory(uuid, boolean);');
    // `revoke … from public` 은 PUBLIC 만 걷는다 — anon 은 default privileges 로 따로 붙는다.
    expect(mig).toContain('from public;');
    expect(mig, 'anon 을 안 걷는다').toContain('from anon;');
    expect(mig).toContain('to authenticated, service_role;');
  });

  it('★ 되돌아가는 문이 옛 정의를 그대로 담는다', () => {
    const rb = read(ROLLBACK);
    expect(rb).toContain('drop function if exists public.cohort_member_directory(uuid, boolean, boolean);');
    expect(rb).toContain('SELECT u.id, u.name');
    expect(rb, '롤백도 anon 을 걷어야 옛 ACL 과 같아진다').toContain('from anon;');
    expect(rb, '옛 해시를 적어 두지 않았다').toContain('ef5382c291fe922b3a69c85d7e19fb0a');
  });

  it('계약 타입을 바꾸지 않았다 (인수 6)', () => {
    const domain = read('src/contracts/domain.ts');
    const block = domain.slice(domain.indexOf('export interface MemberRef'), domain.indexOf('export interface MemberRef') + 120);
    expect(block).toContain('userId: string');
    expect(block).toContain('name: string | null');
    expect(block, 'MemberRef 에 이메일이 들어왔다').not.toContain('email');
  });
});
