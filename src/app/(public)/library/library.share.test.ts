// 서가 공유·영상 잠금 — 링크 복사 ① · 제목 자동 ② · 얼굴판 ③.
//
// **코드에 사는 사실만 잰다.** 다만 ③ 의 급소인 「누르기 전 유튜브 요청 0회」는
//   문자열로 재면 창이 대상보다 좁다(⑨-a) — 그래서 **순수 함수를 직접 먹여** 잰다.
//
// ★ **판정 함수는 실행으로 잰다.** `youtubeId` 는 SSRF 방어까지 겸하므로
//   「정규식이 있는가」로 확인하면 그것은 잠금이 아니다(조항 ⑬). 나쁜 주소를 먹인다.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  youtubeId, youtubeOembedUrl, youtubeThumbUrl, youtubeEmbedUrl, youtubeWatchUrl,
} from '@/core/library/youtube';
import { SHARE_COPY } from './copy';
import { LIBRARY_TITLE_MAX } from '@/app/_vocab/library';

const read = (f: string) => readFileSync(f, 'utf8');
const NL = String.fromCharCode(10);
const DIR = 'src/app/(public)/library';
const VIEW = `${DIR}/[id]/LibraryItemView.tsx`;
const FACADE = `${DIR}/[id]/VideoFacade.tsx`;
const COPYBTN = `${DIR}/[id]/CopyLink.tsx`;
const THUMB = `${DIR}/[id]/thumb/route.ts`;
const ACTIONS = `${DIR}/actions.ts`;
const PANEL = `${DIR}/UploadPanel.tsx`;
const PAGE = `${DIR}/[id]/page.tsx`;
const LIST = `${DIR}/LibraryList.tsx`;

/** 주석을 걷어낸 코드만 — 주석 속 낱말이 단언에 걸리면 자가 엉뚱한 것을 잰다. */
const code = (f: string) =>
  read(f)
    .split(NL)
    .filter((l) => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*'); })
    .join(NL);

describe('★ 영상 판정 — 실행으로 잰다 (③ · SSRF 방어 겸)', () => {
  it('유튜브 네 모양에서 id 를 뽑는다', () => {
    // ★ 실물이다 — 지금 서가에 있는 자료 셋이 이 모양이다(실측 2026-08-31).
    expect(youtubeId('https://youtu.be/p8HDt61uMfA?si=cf5an9dprbl6HgsW')).toBe('p8HDt61uMfA');
    expect(youtubeId('https://www.youtube.com/watch?v=5ze0HGCnVw4')).toBe('5ze0HGCnVw4');
    expect(youtubeId('https://www.youtube.com/watch?t=30&v=7B_JM7SAOMs')).toBe('7B_JM7SAOMs');
    expect(youtubeId('https://www.youtube.com/shorts/p8HDt61uMfA')).toBe('p8HDt61uMfA');
    expect(youtubeId('https://m.youtube.com/watch?v=p8HDt61uMfA')).toBe('p8HDt61uMfA');
  });

  it('★★ 유튜브를 흉내 낸 주소를 물리친다 — 여기가 SSRF 자리다', () => {
    // 부분일치로 봤으면 전부 통과했을 것들이다.
    expect(youtubeId('https://youtube.com.evil.test/watch?v=p8HDt61uMfA')).toBeNull();
    expect(youtubeId('https://evil.test/?u=https://youtube.com/watch?v=p8HDt61uMfA')).toBeNull();
    expect(youtubeId('https://notyoutube.com/watch?v=p8HDt61uMfA')).toBeNull();
    expect(youtubeId('https://youtu.be.evil.test/p8HDt61uMfA')).toBeNull();
    // 스킴도 본다 — 파일·내부 주소로 나가지 않는다.
    expect(youtubeId('file:///etc/passwd')).toBeNull();
    expect(youtubeId('http://169.254.169.254/latest/meta-data/')).toBeNull();
    // 주소가 아니면 유튜브도 아니다.
    expect(youtubeId('그냥 글자')).toBeNull();
    expect(youtubeId(null)).toBeNull();
    expect(youtubeId('')).toBeNull();
  });

  it('id 모양이 아니면 물리친다 — 11자가 아니거나 이상한 문자', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=short')).toBeNull();
    expect(youtubeId('https://www.youtube.com/watch?v=' + 'a'.repeat(12))).toBeNull();
    expect(youtubeId('https://youtu.be/../../etc')).toBeNull();
    expect(youtubeId('https://www.youtube.com/')).toBeNull();
  });

  it('★ 나가는 주소를 **우리가 조립한다** — 사용자 문자열이 남지 않는다', () => {
    const dirty = 'https://youtu.be/p8HDt61uMfA?si=TRACKER&list=EVIL';
    const id = youtubeId(dirty)!;
    for (const built of [youtubeOembedUrl(id), youtubeThumbUrl(id), youtubeEmbedUrl(id), youtubeWatchUrl(id)]) {
      expect(built, `사용자 문자열이 새어 나갔다: ${built}`).not.toContain('TRACKER');
      expect(built).not.toContain('EVIL');
      expect(built.startsWith('https://'), 'https 가 아니다').toBe(true);
    }
  });

  it('★ 재생은 `youtube-nocookie` 다 (설계서 §4.2)', () => {
    expect(youtubeEmbedUrl('p8HDt61uMfA')).toContain('youtube-nocookie.com');
    expect(youtubeThumbUrl('p8HDt61uMfA')).toContain('i.ytimg.com');
  });
});

describe('★★ 누르기 전 유튜브 요청 0회 (③ · 설계서 §4.2 수용 기준)', () => {
  it('얼굴판이 **유튜브 주소를 직접 그리지 않는다** — 우리 프록시만 쓴다', () => {
    const c = code(FACADE);
    // 여기에 유튜브 이미지 호스트가 있으면 화면을 여는 것만으로 요청이 나간다.
    for (const host of ['i.ytimg.com', 'img.youtube.com', 'ytimg']) {
      expect(c, `얼굴판이 ${host} 를 직접 부른다`).not.toContain(host);
    }
    // 대신 우리 주소를 조립한다.
    expect(c).toContain('/thumb');
  });

  it('★ iframe 은 **누른 뒤에만** 선다 — 조건 없이 그리면 안 된다', () => {
    const c = code(FACADE);
    expect(c).toContain('<iframe');
    // 재생 상태가 iframe 보다 **앞에** 있어야 조건부다.
    expect(c.indexOf('playing ?')).toBeGreaterThan(-1);
    expect(c.indexOf('playing ?')).toBeLessThan(c.indexOf('<iframe'));
  });

  it('썸네일 프록시가 **관문을 먼저** 지난다', () => {
    const c = code(THUMB);
    const gate = c.indexOf('openLibraryItem');
    const out = c.indexOf('fetch(');
    expect(gate, '관문이 없다').toBeGreaterThan(-1);
    expect(out, '나가는 요청이 없다').toBeGreaterThan(-1);
    expect(gate, '게이트가 나가는 요청보다 뒤에 있다').toBeLessThan(out);
    // 리다이렉트를 따라가면 호스트 검사가 우회된다.
    expect(c).toContain("redirect: 'error'");
    // 대기에 상한이 있다(고정 sleep 금지 · CLAUDE.md §11).
    expect(c).toContain('AbortController');
    expect(c).toContain('clearTimeout');
    // 파일 프록시와 같은 캐시 정책.
    expect(c).toContain("'cache-control': 'private, no-store'");
  });
});

describe('★ 목록은 그대로다 — 영상 id 가 실리지 않는다 (설계서 §4.2)', () => {
  it('목록 화면이 유튜브를 아예 모른다', () => {
    const c = code(LIST);
    for (const bad of ['youtube', 'ytimg', 'youtu.be', 'VideoFacade', 'youtubeId']) {
      expect(c, `목록이 ${bad} 를 안다`).not.toContain(bad);
    }
  });

  it('계약이 넓어지지 않았다 — `LibraryItem` 에 영상 칸이 없다', () => {
    const dom = read('src/contracts/domain.ts');
    const start = dom.indexOf('export interface LibraryItem {');
    const block = dom.slice(start, dom.indexOf('}', start));
    for (const bad of ['video', 'youtube', 'thumb', 'Url']) {
      expect(block, `계약에 ${bad} 가 생겼다`).not.toContain(bad);
    }
  });
});

describe('★ 링크 복사 (① · 설계서 §6)', () => {
  it('복사되는 주소는 `/library/{id}` 하나다 — 오리진을 박지 않는다', () => {
    const c = code(COPYBTN);
    expect(c).toContain('window.location.origin');
    expect(c).toContain('/library/');
    // 사이트 주소를 손으로 박으면 프리뷰·로컬에서 낡는다(값의 두 분류 ⑴).
    expect(c, '오리진을 박았다').not.toContain('future.yebom.org');
    // 자격에 따라 다른 주소를 만들지 않는다 — 토큰·서명이 붙을 자리가 없다.
    for (const bad of ['token', 'signed', 'expires']) {
      expect(c.toLowerCase(), `주소에 ${bad} 가 붙는다`).not.toContain(bad);
    }
  });

  it('★ 실패를 감추지 않는다 — 주소를 화면에 띄운다 (설계서 §6.4)', () => {
    const c = code(COPYBTN);
    expect(c).toContain('catch');
    expect(c).toContain('setFallback');
    // 경고색을 쓰지 않는다(불변식 9). `toast.info` 이지 `error` 가 아니다.
    expect(c, '경고 토스트를 쓴다').not.toContain('toast.error');
    for (const bad of ['--color-danger', '--color-error', '--color-warning']) {
      expect(c, `경고색 ${bad} 를 썼다`).not.toContain(bad);
    }
  });

  it('자료 화면에 복사 단추가 있다 — 잠긴 자료에도 남긴다(설계서 §6.3)', () => {
    const c = code(VIEW);
    expect(c).toContain('<CopyLink');
    // 조건부로 감추면 §6.3 이 깨진다 — 단추가 삼항 안에 있지 않아야 한다.
    expect(c, '복사 단추가 조건부다').not.toMatch(/\?[^]{0,80}<CopyLink/);
  });
});

describe('★ 제목 자동 입력 (②)', () => {
  it('★★ 재호출을 막는다 — U-4 의 초당 37회를 되풀이하지 않는다', () => {
    const c = code(PANEL);
    // ⑴ 입력 중이 아니라 blur 에서 부른다.
    expect(c).toContain('onBlur');
    expect(c, 'onChange 에서 부른다').not.toMatch(/onChange=\{[^}]*fillTitle/);
    // ⑵ 같은 주소를 다시 묻지 않는다.
    expect(c).toContain('askedFor');
    // ⑶ 사람이 쓴 제목을 덮지 않는다.
    expect(c).toContain('cur.trim() ? cur');
  });

  it('★ 밖으로 나가는 자리가 자격을 먼저 본다 — URL 대리 호출기가 되지 않는다', () => {
    const c = code(ACTIONS);
    const i = c.indexOf('fetchLinkTitleAction');
    const seg = c.slice(i);
    const gate = seg.indexOf('canUploadLibrary');
    const out = seg.indexOf('fetch(');
    expect(gate, '자격 검사가 없다').toBeGreaterThan(-1);
    expect(gate, '자격 검사가 요청보다 뒤다').toBeLessThan(out);
    expect(seg).toContain("redirect: 'error'");
    expect(seg).toContain('AbortController');
  });

  it('★ 제목 상한이 **표의 CHECK 와 같은 수**다 (불변식 23)', () => {
    // 사본이 셋이다: 표 CHECK · 입력칸 maxLength · 자동 입력 자르기.
    //   하나만 고쳐지면 23514 가 나고 화면은 「자격을 확인해 주세요」를 낸다 — 원인이 아니다.
    const mig = read('supabase/migrations/20260827130000_public_area.sql');
    expect(mig, '표의 CHECK 가 바뀌었다').toContain(`char_length(title) BETWEEN 1 AND ${LIBRARY_TITLE_MAX}`);
    expect(code(PANEL), '입력칸 상한이 갈렸다').toContain(`maxLength={${LIBRARY_TITLE_MAX}}`);
    expect(code(ACTIONS)).toContain('LIBRARY_TITLE_MAX');
  });
});

describe('문안 — 지은 것을 지었다고 적었다', () => {
  it('여섯 문장이 한 자리에 있고 결재 청구가 붙어 있다', () => {
    expect(Object.keys(SHARE_COPY).sort()).toEqual(
      ['copied', 'copyFailed', 'copyLabel', 'playLabel', 'videoAlt', 'watchOnYoutube'],
    );
    expect(read(`${DIR}/copy.ts`), '결재 청구 표시가 없다').toContain('결재를 청합니다');
  });

  it('★ 확정분과 급을 섞지 않았다 — 위 블록은 한 글자도 안 건드렸다', () => {
    const c = read(`${DIR}/copy.ts`);
    expect(c).toContain('자료는 50MB까지 올릴 수 있어요. 더 큰 자료는 주소로 걸어 주세요.');
    expect(c).toContain('주소로 거는 자료는 그쪽 공유 설정도 함께 확인해 주세요.');
    expect(c).toContain('로그인하시면 마음을 남길 수 있어요.');
  });

  it('★ recruit 의 복사 문안과 갈리지 않는다 (불변식 23 — 사본이 둘)', () => {
    // 같은 말을 두 곳에 뒀다. import 로 묶으면 화면끼리 결합되므로 **잠금으로** 묶는다.
    expect(read('src/app/(public)/recruit/copy.ts')).toContain(`copied: '${SHARE_COPY.copied}'`);
  });

  it('금지 어휘를 쓰지 않는다 — 「실패」라 적지 않고 할 수 있는 일을 말한다', () => {
    for (const [k, v] of Object.entries(SHARE_COPY)) {
      for (const bad of ['오류', '실패', '에러']) {
        expect(v, `${k} 에 「${bad}」가 있다`).not.toContain(bad);
      }
    }
  });
});

describe('경계 — 서버가 판정하고 화면은 다시 판정하지 않는다', () => {
  it('영상 판정이 서버(page.tsx)에 있고 화면은 결과만 받는다', () => {
    expect(code(PAGE)).toContain('youtubeId(source.url)');
    // 화면이 다시 훑으면 판정이 두 곳이 된다.
    expect(code(VIEW), '화면이 다시 판정한다').not.toContain('youtubeId');
    expect(code(FACADE), '얼굴판이 다시 판정한다').not.toContain('youtubeId');
  });

  it('★ 영상 id 가 화면 prop 으로 내려가지 않는다 — 조립된 주소만 간다', () => {
    const c = code(VIEW);
    expect(c).toContain('embedUrl');
    expect(c).toContain('watchUrl');
    expect(c, '날 id 를 내려보낸다').not.toMatch(/videoId|youtubeId=/);
  });

  it('판정 규칙이 **한 자리**에만 산다 (불변식 23)', () => {
    // 호스트 목록·id 모양을 두 곳에 적으면 「제목은 받았는데 썸네일은 안 뜬다」가 조용히 난다.
    for (const f of [THUMB, ACTIONS, FACADE, PAGE, COPYBTN]) {
      expect(code(f), `${f} 가 호스트 목록을 다시 적는다`).not.toContain('youtu.be');
      expect(code(f), `${f} 가 id 정규식을 다시 적는다`).not.toContain('{11}');
    }
  });
});
