// 서가 확정 문안 잠금 — **얼어야 하는 값에는 잠금을 함께 둔다**(CLAUDE.md §11 ⑵).
//
// §1 의 셋은 최박사 확정분이라 **한 글자도 고칠 수 없다.** 손으로 옮겨 적는 순간
//   그것은 ⑵ 를 ⑴ 처럼 다루는 일이 되므로, 글자 단위로 잠근다(원고 §1~§4 와 같은 방식).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { UPLOAD_CONSENT, UPLOAD_CLOSED, LINK_NOTE } from './copy';
import { LIBRARY_NAME, LIBRARY_HREF } from '@/app/_vocab/library';

describe('서가 확정 문안 — 한 글자도 고치지 않는다(§1)', () => {
  it('동의 문안 — 다섯 줄이 줄바꿈까지 그대로다', () => {
    expect(UPLOAD_CONSENT).toBe(
      '자료를 올리기 전에 확인해 주세요.\n' +
      '\n' +
      '올리신 자료는 열람 권한을 가진 분들께 공개됩니다.\n' +
      '다른 분의 저작물이라면 공유해도 되는 것인지 먼저 확인해 주세요.\n' +
      '개인정보나 참여자의 사적인 내용이 담기지 않았는지 살펴봐 주세요.\n' +
      '올리신 자료는 본인이 가릴 수 있고, 삭제는 운영자에게 문의해 주세요.',
    );
  });

  it('꺼진 구획 안내 — 초안의 옛 문장이 아니라 확정분이다', () => {
    expect(UPLOAD_CLOSED).toBe('자료 올리기는 세미나 참여자와 포럼회원께 열려 있습니다.');
    // 초안 문장은 인도자·운영자가 빠졌고 참여자를 기간으로 좁혔다 — 폐기됐다.
    expect(UPLOAD_CLOSED).not.toContain('기간');
  });

  it('외부 링크 안내', () => {
    expect(LINK_NOTE).toBe('주소로 거는 자료는 그쪽 공유 설정도 함께 확인해 주세요.');
  });

  it('★ 화면이 문안을 **다시 적지 않는다** — 사본이 둘이면 한쪽만 고쳐진다', () => {
    const panel = readFileSync('src/app/(public)/library/UploadPanel.tsx', 'utf8');
    expect(panel, '동의 문안을 화면이 직접 적었다').not.toContain('올리기 전에 확인해');
    expect(panel).toContain('UPLOAD_CONSENT');
    expect(panel).toContain('UPLOAD_CLOSED');
    expect(panel).toContain('LINK_NOTE');
  });
});

describe('§12 개명 — 두 이름이 공존하지 않는다', () => {
  it('이름은 「서가」이고 주소는 `/library` 그대로다', () => {
    expect(LIBRARY_NAME).toBe('서가');
    // **주소는 얼어야 하는 값이다**(ADR-155) — 이름이 바뀌어도 링크가 죽지 않는다.
    expect(LIBRARY_HREF).toBe('/library');
  });

  it('★ 운영 코드에 「자료실」이 **한 곳도** 남지 않았다', () => {
    // 실측으로 16 파일이었다(발주서의 「네 곳」과 달랐다). 하나라도 빠지면 두 이름이 공존한다.
    const files = [
      'src/app/_screens/site/publicNav.ts',
      'src/app/_lib/memberSheet.ts',
      'src/app/_screens/console/consoleNav.ts',
      'src/app/(member)/home/page.tsx',
      'src/app/(member)/feed/page.tsx',
      'src/app/(member)/pending/page.tsx',
      'src/app/(member)/my/cohorts/[cohortId]/page.tsx',
      'src/app/_lib/f4Fixture.tsx',
      'src/app/_screens/site/galleryFixture.tsx',
      'src/app/(member)/home/homeFixture.ts',
      'src/contracts/core-context.ts',
      'src/core/context.ts',
    ];
    for (const f of files) {
      expect(readFileSync(f, 'utf8'), `${f} 에 「자료실」이 남았다`).not.toContain('자료실');
    }
  });

  it('★ 이름을 **각자 적지 않는다** — 이름을 드는 곳이 전부 같은 출처를 읽는다', () => {
    // `screenChrome` 은 여기 없다 — `/library` 를 `gnb` 로 두어 **표가 제목을 들지 않기** 때문이다.
    //   (`bar` 로 두면 공개 GNB 가 사라져 로고가 없어진다 · U-4 §5 의 근거가 깨진다.)
    for (const f of ['src/app/_screens/site/publicNav.ts', 'src/app/_lib/memberSheet.ts',
                     'src/app/_screens/console/consoleNav.ts', 'src/app/(public)/library/page.tsx']) {
      expect(readFileSync(f, 'utf8'), `${f} 가 이름을 스스로 적고 있다`).toContain("from '@/app/_vocab/library'");
    }
  });
});
