import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { POST_OPEN_HEAD, postJoinHref, postNudgeText, postOpenBody } from './postNudge';
import { TOOL } from './tool';
import { resumeStep } from '@/app/(public)/join/resumeStep';

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = `${dir}/${e}`;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

// 마무리 체크 독려 (U-8 · 지휘부 지시 2026-09-03 「여러 방식으로 마무리를 독려」).
describe('마무리 체크 — 문 하나 · 문안 하나', () => {
  it('문이 하나다 — 주소를 짓는 곳이 여기뿐이다', () => {
    expect(postJoinHref('abc')).toBe('/join?cohort=abc&wave=post');
  });

  it('★★ **화면이 주소를 손으로 적지 않는다** — 전에는 사본이 넷이었다', () => {
    const offenders = walk('src/app')
      .filter((f) => !/\.test\.tsx?$/.test(f) && !f.endsWith('_vocab/postNudge.ts'))
      .filter((f) => {
        // 주석은 세지 않는다 — 「?wave=post 진입」 같은 설명이 라우트 주석에 있다.
        const body = readFileSync(f, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .split(String.fromCharCode(10))
          .filter((l) => !l.trim().startsWith('//'))
          .join(String.fromCharCode(10));
        return body.includes('wave=post');
      });
    expect(offenders, '마무리 체크 주소를 손으로 적은 자리가 있다 — 파라미터가 바뀌면 어긋난다').toEqual([]);
  });

  it('★ 인도자 안내는 **참여자 홈이 쓰는 문장 그대로**다 — 새 문안을 짓지 않았다', () => {
    const text = postNudgeText('예봄 2기', 'c1', 'https://x');
    expect(text).toContain(POST_OPEN_HEAD);
    expect(text).toContain(postOpenBody('예봄 2기'));
    expect(text).toContain(`https://x${postJoinHref('c1')}`);
    // 도구 이름도 단일 출처에서 온다.
    expect(POST_OPEN_HEAD).toContain(TOOL.post);
  });

  it('★★ **참여자 홈과 인도자 안내가 같은 출처를 읽는다** — 갈라지면 두 말이 된다', () => {
    for (const f of ['src/app/_screens/MemberHome.tsx', 'src/app/_screens/console/CohortDetail.tsx']) {
      expect(readFileSync(f, 'utf8'), `${f} 가 문안을 스스로 적는다`).toContain("from '@/app/_vocab/postNudge'");
    }
  });
});

describe('재진입 딥링크 — `null` 의 뜻 둘을 가른다', () => {
  it('그 회기 사람이면 곧장 시작으로', () => {
    expect(resumeStep({ hasMeta: true, signedIn: true })).toBe('start');
    expect(resumeStep({ hasMeta: true, signedIn: false })).toBe('start');
  });

  it('★★ **로그인을 안 했으면 로그인으로** — 전에는 코드 입력으로 조용히 떨어졌다', () => {
    expect(resumeStep({ hasMeta: false, signedIn: false }), '딥링크가 끊긴다').toBe('auth');
  });

  it('로그인은 했는데 그 회기 사람이 아니면 코드 입력으로', () => {
    expect(resumeStep({ hasMeta: false, signedIn: true })).toBe('code');
  });

  it('★ 화면이 그 판정을 **실제로 쓴다** — 순수 함수만 두고 안 쓰면 아무것도 안 바뀐다(⑦)', () => {
    const src = readFileSync('src/app/(public)/join/JoinClient.tsx', 'utf8');
    expect(src).toContain('resumeStep({');
    expect(src, '로그인 여부를 안 본다').toContain('supabase.auth.getUser()');
  });
});
