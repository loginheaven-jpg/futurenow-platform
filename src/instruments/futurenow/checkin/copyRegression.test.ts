import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import baseline from './copyBaseline.json';

// 문안 회귀 잠금(ADR-90 · 지시서 §5-1).
//   ADR-90 은 슬롯 이름(desire→pairText·futureArea→areaPick)과 배치를 바꾼다. 그래서 파일 diff 로는
//   '문안이 그대로인가'를 증명할 수 없다 — 구조 변경분에 파묻힌다.
//   대신 **변경 전 한국어 문자열 리터럴 집합**을 스냅샷으로 박아 두고, 그중 하나라도 사라지거나 바뀌면 실패시킨다.
//   추가는 허용한다(요약 줄·되비추기 캡션 이관처럼 정당한 증가가 있다). 삭제·변경만 막는다.
//   copyBaseline.json 은 ADR-90 착수 직전 HEAD(78b47b0)의 session1·session2 에서 뽑았다 —
//   즉 ADR-88(목적 세 질문·요약 줄)과 165db9e(2회차 문안 교정 2건)까지 반영된 **최신 확정 문안**을 지킨다.
//   재생성할 일이 있으면 반드시 그 시점 이후 커밋에서 뽑는다(7d40ee7 로 되돌리면 15건이 오탐된다).

const RE = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g;

function koreanLiterals(file: string): Set<string> {
  const src = readFileSync(new URL(`./${file}.ts`, import.meta.url), 'utf8');
  const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  const out = new Set<string>();
  for (const m of code.matchAll(RE)) {
    const s = m[1] ?? m[2];
    if (/[가-힣]/.test(s)) out.add(s);
  }
  return out;
}

// ADR-94(2026-08-07): session3 을 잠금에 넣었다. 그전까지 3회차 문안 전체가 회귀 보호 **밖**에 있었다 —
//   '3회차는 baseline 대상이 아니므로 갱신이 필요 없다'는 사실이었으나, **필요 없다는 것과 안 하는 게 옳다는 것은 다르다.**
//   session3 스냅샷은 책 페이지 참조 다섯을 **붙인 뒤** 뽑았다(먼저 뽑으면 참조 없는 상태를 잠그고 즉시 깨진다).
describe('1~6회차 문안 회귀 — 리터럴 집합에서 삭제·변경 0', () => {
  for (const file of ['session1', 'session2', 'session3', 'session4', 'session5', 'session6'] as const) {
    it(`${file}: 스냅샷의 모든 문자열이 그대로 남아 있다`, () => {
      const now = koreanLiterals(file);
      const missing = baseline[file].filter((s) => !now.has(s));
      expect(missing, `사라지거나 바뀐 문안: ${JSON.stringify(missing)}`).toEqual([]);
    });
  }

  // 증가분은 허용하되 눈에 보이게 남긴다 — 몰래 늘지 않도록.
  for (const file of ['session1', 'session2', 'session3', 'session4', 'session5', 'session6'] as const) {
    it(`${file}: 스냅샷에 없는 문자열이 새로 생기지 않았다`, () => {
      const added = [...koreanLiterals(file)].filter((s) => !baseline[file].includes(s));
      expect(added).toEqual([]);
    });
  }
});

// ADR-98 — 3회차 개정 1차(실강 녹취 근거). 리터럴 잠금은 baseline 대비 '변경'만 보므로,
//   재생성 뒤에는 무엇이 왜 바뀌었는지가 스냅샷에서 사라진다. 되돌아가지 않도록 여기서 못 박는다.
describe('3회차 개정 1차가 되돌아가지 않는다 (ADR-98)', () => {
  const lits = koreanLiterals('session3');

  it('습관 짝 — 기입 순서 반전에 맞춘 라벨·연결선', () => {
    for (const old of ['오늘 다시 짠 습관 중에서, 짝 하나만 옮겨 주세요. (책 117~118쪽)', '↓ 그 자리에', '줄이거나 없애기로 한 것', '그 자리에 들이기로 한 것']) {
      expect(lits.has(old), `옛 문안이 살아 있다: ${old}`).toBe(false);
    }
    for (const now of ['이번 주에 실제로 바꿔 볼 짝 하나만 옮겨 주세요. (책 117~118쪽)', '↓ 그 자리를 만들려면', '이번 주에 새로 시작하거나 늘릴 것', '줄이거나 없앨 것']) {
      expect(lits.has(now), `새 문안이 없다: ${now}`).toBe(true);
    }
    // to.help 는 삭제했다 — 연결선 문구가 같은 논리를 진다.
    expect(lits.has('비운 자리를 그냥 두면 며칠 안에 원래대로 돌아갑니다. 실패가 아니라 원래 그렇게 됩니다.')).toBe(false);
  });

  // ADR-100 이 심화①(identity_gap)을 통째로 지우면서 ADR-98 개정 3 의 대상 자체가 사라졌다.
  //   개정 4(심화② 축약)도 라벨 교체와 함께 help 가 삭제됐다. 단언을 그 사실에 맞춘다 —
  //   **옛 문안 부재는 그대로 지키고**(되돌아가지 않게), 새 문안 존재는 ADR-100 절로 옮긴다.
  it('심화 — 옛 문안 넷이 모두 사라졌다', () => {
    for (const old of [
      '고쳐야 할 것을 찾는 칸이 아닙니다. 어긋난 곳이 보이면 그것만으로 충분합니다.',
      '보인 것 하나면 충분합니다. 오늘은 알아차리는 데까지가 몫이에요.',
      '좋은 말이든 아니든 상관없습니다. 그냥 자주 나오는 말이면 됩니다.',
      '좋은 말이든 아니든, 그냥 자주 나오는 말이면 됩니다.',
    ]) expect(lits.has(old), old).toBe(false);
  });

  // ADR-102 가 이 문장의 **어미만** 요구형으로 바꿨다(하나면 됩니다 → 하나를 적으십시오).
  //   ADR-98 이 세운 것은 '한 걸음을 우당탕탕으로 대체하지 않고 보조 문구로 잇는다'이고 그 연결은 그대로다.
  //   옛 문안 부재는 계속 지키고, 새 문안 존재는 '연결이 살아 있는가'로 확인한다.
  it('우당탕탕 신설 + 한 걸음이 그것을 잇는다(두 개정은 묶음)', () => {
    expect(lits.has("그 영역에서 시작할 '우당탕탕 프로젝트'의 이름")).toBe(true);
    expect(lits.has('오늘 마지막에 정하신 그 하나를 그대로 옮기시면 됩니다.')).toBe(false);
    const stepHelp = [...lits].find((s) => s.includes('우당탕탕 프로젝트를 적으셨다면'));
    expect(stepHelp, '한 걸음이 우당탕탕을 가리키는 연결이 끊겼다').toBeTruthy();
    expect(stepHelp).toContain('그 첫 걸음이어도 좋습니다');
  });

  // 1·2회차는 이 개정의 대상이 아니다 — 한 글자도 건드리지 않았음을 양방향으로 확인한다.
  it('1·2회차 습관·심화 문안은 무영향', () => {
    for (const file of ['session1', 'session2'] as const) {
      expect(koreanLiterals(file).has('↓ 그 자리를 만들려면'), file).toBe(false);
      expect(koreanLiterals(file).has("그 영역에서 시작할 '우당탕탕 프로젝트'의 이름"), file).toBe(false);
    }
  });
});

// ADR-102 Phase 1 — 진취 전환. 전 회차 공통 문구 넷 + 심화 기본 펼침.
//   완충이 막으려던 문제는 실측에서 하나도 관측되지 않았다(자신감 2·5·7·8 부풀림 0 · 예시 베낌 0명).
//   반면 완충이 붙은 필수 칸(selfNote)은 4/8 이 비었다. 없는 위험에 대비하느라 있는 기회를 잃고 있었다.
describe('진취 전환 Phase 1 이 되돌아가지 않는다 (ADR-102)', () => {
  //   ★ **6회차는 넣지 않는다.** 아래 단언들이 「세 회차 공통」 문장을 요구하는데
  //   6회차는 selfNote 에 help 를 두지 않았고(다섯 줄 되비추기가 그 일을 대신한다) 심화 제목도 다르다.
  //   **발주서는 이 배열에도 넣으라 했으나 실물이 그 지시와 맞지 않았다** — 실물을 따른다.
  const S = ['session1', 'session2', 'session3', 'session4', 'session5'] as const;

  it('허락 문구 넷이 사라졌다', () => {
    for (const file of S) {
      const lits = koreanLiterals(file);
      expect(lits.has('다듬지 않으셔도 됩니다. 쓰신 그대로면 됩니다.'), file).toBe(false);
      expect(lits.has('꼭 칭찬이 아니어도 됩니다. 지금 나에게 필요한 말이면 됩니다.'), file).toBe(false);
      expect(lits.has('깊은 생각 갈무리하기'), file).toBe(false);
      expect(lits.has('지난 한 걸음이 남아 있지 않아요. 이번 시간부터 시작해도 괜찮습니다.'), file).toBe(false);
    }
  });

  it('selfNote 가 값을 말한다 — 세 회차 공통', () => {
    for (const file of S) {
      expect(koreanLiterals(file).has('오늘의 나에게 지금 필요한 말을 적으십시오. 이 한 줄이 회차마다 쌓입니다.'), file).toBe(true);
    }
  });

  // 허락('충분해요')은 지우되 **요구와 근거는 남긴다**(ADR-102 한계 규칙).
  //   '이번 주의 힘을 한 곳에 모으기 위해서입니다' 는 허락의 이유가 아니라 실행에 관한 사실이라,
  //   허락을 요구('하나만 정하십시오')로 바꾸면 그 문장이 요구의 근거로 제자리를 찾는다.
  //   한 번 함께 지웠다가 '왜 하나인지'가 사라져 되살렸다 — 그 전철을 여기서 못 박는다.
  //   Phase 2 의 '충분합니다' 둘(2회차 areaPick · 3회차 pairText)은 아직 남아 있다.
  it('충분해요는 사라지고 요구·근거는 남았다', () => {
    for (const file of S) {
      expect([...koreanLiterals(file)].some((s) => s.includes('충분해요')), file).toBe(false);
    }
    for (const file of ['session1', 'session2'] as const) {
      const lits = [...koreanLiterals(file)];
      const stepHelp = lits.find((s) => s.startsWith("이 세미나에서는 이것을 '한 걸음'이라고 부릅니다."));
      expect(stepHelp, `${file}: 한 걸음 help 가 없다`).toBeTruthy();
      expect(stepHelp, `${file}: 요구가 없다`).toContain('하나만 정하십시오');
      expect(stepHelp, `${file}: 근거가 사라졌다`).toContain('이번 주의 힘을 한 곳에 모으기 위해서입니다');
    }
    // 목적 세 질문은 뒤 문장(값)이 남는다 — 지운 것은 앞의 허락뿐이다.
    expect([...koreanLiterals('session2')].some((s) => s.startsWith('세 질문이 겹치는 자리에, 나의 목적이 있습니다.') && s.includes('재료가 됩니다'))).toBe(true);
  });

  it('심화 제목이 격상됐다 — 세 회차 공통', () => {
    for (const file of S) expect(koreanLiterals(file).has('여기서 한 겹 더 들어갑니다'), file).toBe(true);
  });

  it('지난 걸음 없음 안내가 누적을 말한다 — 2·3회차', () => {
    for (const file of ['session2', 'session3'] as const) {
      expect(koreanLiterals(file).has('이번 회차부터 한 걸음이 쌓입니다.'), file).toBe(true);
    }
  });

  // **1·2회차의 identity help 가 서로 다르다.** 사고가 아니라 의도다 —
  //   1회차 키(identity_sentence)는 2회차가 되비추므로 '다음 회차의 출발점'이 참이지만,
  //   2회차 키(identity_statement)를 읽는 자리는 ADR-100 이후 0곳이라 같은 문장이 거짓이 된다.
  //   제품이 지금 이행할 수 있는 값만 말한다(ADR-102 규범). 되비추기가 4회차에 생기면 그때 붙인다.
  it('identity help — 1회차만 값 문장을 갖는다', () => {
    const s1 = koreanLiterals('session1');
    const s2 = koreanLiterals('session2');
    expect(s1.has('손본 문장이 아니라 오늘 쓴 그대로 옮기십시오. 이 문장이 다음 회차의 출발점이 됩니다.')).toBe(true);
    expect(s2.has('손본 문장이 아니라 오늘 쓴 그대로 옮기십시오.')).toBe(true);
    expect(s2.has('손본 문장이 아니라 오늘 쓴 그대로 옮기십시오. 이 문장이 다음 회차의 출발점이 됩니다.')).toBe(false);
  });
});

// ADR-102 Phase 2 — 회차별 문안 여덟 자리. 여기서 허락 계열이 레지스트리에서 완전히 걷힌다.
describe('진취 전환 Phase 2 가 되돌아가지 않는다 (ADR-102)', () => {
  const S = ['session1', 'session2', 'session3', 'session4', 'session5', 'session6'] as const;

  // 이 검사가 이 개편 전체의 잠금이다. 되돌아오면 톤 개편이 통째로 무너진다.
  //   **범위는 session*.ts 로 한정한다** — 원칙 §3 의 다섯 자리(연락 요청·익명 안내·오해 방지·
  //   사진 고지·결측 패널) 중 둘은 컴포넌트에 있어 여기 걸리지 않는다. 대신 아래에서 **존재**를 단언한다.
  //   (주석은 koreanLiterals 가 걷어내므로 설명문에 금지어를 인용해도 걸리지 않는다.)
  const BANNED = ['하셔도 됩니다', '않으셔도 됩니다', '괜찮습니다', '아니어도 됩니다', '충분합니다', '충분해요'];

  it('허락 어휘가 세 회차 문안에서 0건', () => {
    for (const file of S) {
      const hits = [...koreanLiterals(file)].filter((s) => BANNED.some((b) => s.includes(b)));
      expect(hits, `${file}: 허락 어휘가 살아 있다 → ${JSON.stringify(hits)}`).toEqual([]);
    }
  });

  it('1회차 — 표지 띠와 편지 첨부', () => {
    const l = koreanLiterals('session1');
    expect(l.has('오늘 꺼낸 갈망을 여기에 적어 둡니다. 7주 기록의 첫 장입니다.')).toBe(true);
    expect([...l].some((s) => s.includes('촬영해 첨부하십시오. (책 59쪽)'))).toBe(true);
  });

  it('2회차 — 영역·지난 걸음·편지 첨부', () => {
    const l = koreanLiterals('session2');
    expect(l.has('다섯 중 가장 가슴이 뛴 하나만 고르십시오. 이 선택이 4회차 원씽의 재료가 됩니다.')).toBe(true);
    expect(l.has('정직한 기록만이 다음 한 주를 바꿉니다.')).toBe(true);
    expect([...l].some((s) => s.includes('촬영해 첨부하십시오. (책 85~87쪽)'))).toBe(true);
  });

  it('3회차 — 우당탕탕·오늘의 질문·습관 짝', () => {
    const l = koreanLiterals('session3');
    expect(l.has('완성이 아니라 시작이 목적입니다. 이름을 붙이는 순간 프로젝트가 됩니다.')).toBe(true);
    expect(l.has('오늘 붙인 이름을 그대로 적으십시오. 알아본 순간의 느낌을 함께 적으면 더 좋습니다.')).toBe(true);
    expect(l.has('짝이 맞는 한 쌍만 고르십시오. 없앨 것과 들일 것이 함께 있어야 습관이 바뀝니다.')).toBe(true);
  });

  // 어미 교체 둘 — BANNED 로는 못 잡는 자리다('고르시면 됩니다'·'하나면 됩니다'는 어휘 잠금 밖).
  //   대신 여기서 명시로 못 박는다.
  it('어미가 요구형이다 — 1회차 갈망 쌍 · 3회차 한 걸음', () => {
    const s1 = [...koreanLiterals('session1')].find((s) => s.includes('바꿔 쓰는 순간'));
    expect(s1).toContain('하나만 고르십시오');
    expect(s1).not.toContain('고르시면 됩니다');
    const s3 = [...koreanLiterals('session3')].find((s) => s.includes('우당탕탕 프로젝트를 적으셨다면'));
    expect(s3).toContain('하나를 적으십시오');
    expect(s3).not.toContain('하나면 됩니다');
  });

  // **범위 예시는 남긴다**(원칙 §1 축1 네 번째 갈래). 허락이 아니라 답의 폭을 알려 주는 문장이라
  //   지우면 '무엇을 적어야 하는가'가 좁아진다. BANNED 에 넣지 않은 이유이기도 하다 —
  //   어휘로 막으면 이 셋이 즉시 걸리고 예외 목록이 길어져 잠금이 자기 예외로 무너진다.
  it('범위 예시 셋과 실행 사실 하나는 그대로다', () => {
    expect(koreanLiterals('session1').has('노트에 찍은 점 하나여도 좋습니다.')).toBe(true);
    expect([...koreanLiterals('session2')].some((s) => s.includes('어떤 소리여도 좋습니다'))).toBe(true);
    expect([...koreanLiterals('session3')].some((s) => s.includes('그 첫 걸음이어도 좋습니다'))).toBe(true);
    // 실행에 관한 사실 — 한 걸음 뒷문장과 같은 성격이다(위로가 아니라 정보).
    expect(koreanLiterals('session3').has('흐트러지는 날이 오면, 그날부터 다시 이어 가면 됩니다.')).toBe(true);
  });

  // 압박 어휘·판정어는 진취적 어조와 다른 것이다(원칙 §4).
  it('압박 어휘와 판정어가 0건', () => {
    for (const file of S) {
      const lits = [...koreanLiterals(file)];
      for (const w of ['반드시', '절대', '놓치지', '지각', '미제출', '함정']) {
        expect(lits.some((s) => s.includes(w)), `${file}: ${w}`).toBe(false);
      }
    }
  });
});

// 원칙 §3 의 다섯 자리 — **BANNED 검사가 닿지 않는 곳까지 존재로 지킨다.**
//   이 자리들은 허락 어휘를 그대로 쓰지만 지우면 안 되는 것들이다: 5주차에 무너진 사람이 여는 문(연락 요청·
//   익명 안내), 오답을 막는 지시(오해 방지), 프라이버시 고지(사진), 채우게 만드는 장치(결측 패널).
//   앞의 셋은 session*.ts 에 있어 BANNED 검사에 **걸리지 않을 뿐** 지워도 안 잡힌다. 뒤의 둘은 컴포넌트에 있다.
describe('§3 다섯 자리는 지워지지 않았다 (ADR-102)', () => {
  const src = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');

  it('연락 요청 · 익명 안내 — 세 회차', () => {
    for (const file of ['session1', 'session2', 'session3', 'session4', 'session5', 'session6'] as const) {
      const l = koreanLiterals(file);
      expect(l.has('짧은 안부 연락입니다. 코칭 세션이 아닙니다.'), file).toBe(true);
      expect(l.has('이름 없이 전달합니다. 다만 인원이 적은 차수에서는 글의 결로 짐작될 수 있습니다.'), file).toBe(true);
    }
  });

  it('오해 방지 — 1회차 첫 방문 안내', () => {
    expect(koreanLiterals('session1').has('이건 진단이 아닙니다. 점수도, 정답도 없습니다.')).toBe(true);
  });

  it('★ 사진 열람 고지를 **걷었다** — 되살아나면 운다 (지휘부 판정 2026-09-02)', () => {
    // 전에는 「고지가 있는가」를 쟀다. 그 고지를 걷었으므로 **잠금을 뒤집는다** —
    //   없어서 빠진 것이 아니라 일부러 뺐고, 다음 사람이 결손으로 보고 되살리면 안 된다.
    //   ★ **위치정보 제거는 그대로 돈다** — 말을 걷었지 동작을 걷은 것이 아니다.
    const s = src('../../../app/(member)/my/cohorts/[cohortId]/checkin/[session]/LetterPhotos.tsx');
    for (const bad of ['인도자와 운영자가 볼 수 있습니다', '위치정보는 자동으로 지워져요']) {
      // 주석에는 남아 있어도 된다 — 화면에 뜨는 것만 잰다.
      const shown = s.split(String.fromCharCode(10))
        .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join(String.fromCharCode(10));
      expect(shown, `열람 고지가 되살아났다: ${bad}`).not.toContain(bad);
    }
    // ★ **동작은 살아 있다** — EXIF 제거(재디코드)가 그대로다.
    //   처음엔 `/canvas|drawImage|toBlob/` 로 쟀는데 **셋 중 하나만 있어도 통과**했다 —
    //   물려 보니 `drawImage`·`toBlob` 을 지워도 `canvas` 가 남아 초록이었다(⑨-b 창이 넓다).
    //   재디코드는 **넷이 이어져야** 성립하므로 넷을 다 요구한다.
    for (const step of ['createImageBitmap', 'canvas', 'drawImage', 'toBlob']) {
      expect(s, `EXIF 제거 단계가 사라졌다: ${step}`).toContain(step);
    }
  });

  it('결측 안내 패널 — 컴포넌트', () => {
    const s = src('../../../app/(member)/my/cohorts/[cohortId]/checkin/[session]/CheckinCardClient.tsx');
    expect(s).toContain('지금 저장하거나, 더 적을 수 있습니다.'); // 몰아세우면 이탈한다 — 여기만은 허락을 남긴다
    expect(s).toContain('채우러 가기');
    expect(s).toContain('나중에 이어 쓰기');
  });
});

// ADR-102 Phase 3 — 진행·상태 표시. **이 구간은 session*.ts 밖이라 리터럴 잠금이 닿지 않는다.**
//   Phase 2 에서 컴포넌트 존재 단언이 실제로 작동함이 음성 대조로 증명됐으므로 같은 방식으로 건다.
describe('진행·상태 문구가 되돌아가지 않는다 (ADR-102 Phase 3)', () => {
  const card = readFileSync(new URL('../../../app/(member)/my/cohorts/[cohortId]/checkin/[session]/CheckinCardClient.tsx', import.meta.url), 'utf8');
  // ★ **조립이 옮겨 갔다**(ADR-181) — 회기 홈과 `/home` 이 같은 함수를 쓰므로 문구도 거기 있다.
  //   잠금이 지키는 것은 «파일»이 아니라 **«카드와 홈이 같은 문장을 쓴다»** 이므로 자리만 고친다.
  const home = readFileSync(new URL('../../../app/(member)/my/cohorts/[cohortId]/dashboard.tsx', import.meta.url), 'utf8');
  // 4차 F-4 — 표시 층이 갈렸다. 진행 표시·오늘 카드는 이제 화면 부품에 있다.
  const screen = readFileSync(new URL('../../../app/(member)/my/cohorts/[cohortId]/CohortHomeScreen.tsx', import.meta.url), 'utf8');
  // 금지어 검사는 **주석을 걷어내고** 본다. 규율을 설명하는 주석이 금지어를 인용하는 것은 정상이고
  //   (CheckinCardClient.tsx:4 가 '설문·진단·지각·미제출·워크북 미사용'이라 적어 둔 것이 그렇다),
  //   그것까지 잡으면 검사가 자기 문서를 때린다. koreanLiterals 와 같은 사고다.
  const noComments = (s: string) => s.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n');

  // '완성'을 버리고 '완료'로 통일했다 — '완성'은 품질 판정처럼 읽히고 우리가 세는 것은 칸이 다 찼는지다.
  //   두 화면이 **같은 문장**을 쓴다: 화면을 옮겨도 같은 것을 세고 있음이 보인다.
  it('카드 하단·차수 홈이 같은 문장을 쓴다', () => {
    expect(card).toContain('칸 더 채우면 완료');
    expect(home).toContain('칸 더 채우면 완료');
  });

  it('완료 표기가 붙었다 — 카드는 회차 번호와, 홈은 번호 없이', () => {
    expect(card).toContain('회차 기록 완료');
    expect(home).toContain("'기록 완료'"); // 바로 위에 '{N}회차 갈무리'가 있어 번호를 겹치지 않는다(원칙 §2-6)
  });

  // 결핍·판정 어휘를 되돌리지 않는다. '아직 완성되지 않았습니다'는 미제출과 명제가 같아 판정 금지에 저촉했다.
  it('옛 문구와 결핍·판정 어휘가 0건', () => {
    for (const [name, src] of [['card', noComments(card)], ['home', noComments(home)]] as const) {
      for (const w of ['칸이 비어 있어요', '칸 남음', '쓰시던 자리가 남아 있어요', '다 적으셨습니다', '아직 완성되지 않', '미제출']) {
        expect(src.includes(w), `${name}: ${w}`).toBe(false);
      }
    }
  });

  // 7 로 박으면 5주·6주 편성에서 깨진다. 회차 수는 cohort_sessions 가 정한다(progress.ts 가 순수 함수로 잠근다).
  //
  // **4차 F-4 에서 화면이 `CohortHomeScreen` 으로 갈렸다.** 단언을 지우지 않고 **뜻을 따라 옮겼다** —
  //   지키던 것은 ⑴ 라벨이 있다 ⑵ 회차 수를 박지 않는다 ⑶ **상태 무관 앵커**로 카드보다 먼저 온다,
  //   셋이고 셋 다 그대로 잠근다. (`AppHeader`·`ordered` 는 사라진 이름이라 자리를 새 구조로 옮겼다.)
  it('진행 표시가 카드보다 먼저 오고 회차 수를 하드코딩하지 않는다', () => {
    expect(home, '회차 수는 순수 함수가 정한다').toContain('buildProgress');
    expect(home, '라벨은 화면이 아니라 페이지가 준다').toContain("label: '7주 기록'");
    expect(screen).toContain('progress.label');
    expect(screen).toContain('progress.done');
    expect(screen, '완료 낱말을 잃지 않는다').toContain('완료');
    // **상태 무관 앵커** — 사전진단 미완이면 밀리는 자리(before·today)보다 앞이어야 한다.
    const progressAt = screen.indexOf('cohort-progress');
    const beforeAt = screen.indexOf('{before ?? null}');
    const todayAt = screen.indexOf('cohort-today');
    expect(progressAt).toBeGreaterThan(-1);
    expect(progressAt).toBeLessThan(beforeAt);
    expect(beforeAt).toBeLessThan(todayAt);
  });

  // 판정·색을 두지 않는다. 안 쓴 회차는 결핍이 아니라 아직 안 온 주다.
  it('진행 표시에 경고색이 없다', () => {
    // F-4 이후 이 블록은 화면 부품에 있다. **막대도 없다**(불변식 11 — 시안 `.p-fill` 불채택).
    const block = screen.slice(screen.indexOf('cohort-progress'), screen.indexOf('{before ?? null}'));
    expect(block.includes('p-fill'), '채움 막대를 두지 않는다').toBe(false);
    for (const t of ['--color-danger', '--color-care', '--care-', '--color-warning']) {
      expect(block.includes(t), t).toBe(false);
    }
  });
});

// ADR-104 — 4회차 문안. baseline 은 '변경'만 보므로 재생성 뒤에는 무엇이 왜 그렇게 쓰였는지가 사라진다.
//   설계가 걸린 네 자리를 여기서 못 박는다.
describe('4회차 문안이 되돌아가지 않는다 (ADR-104)', () => {
  const l = koreanLiterals('session4');

  // 아래 칸이 검산기 노릇을 한다 — 함께 넘어갈 것을 못 적으면 그것은 첫 도미노가 아니라
  //   그냥 해야 할 일 중 하나다. 인도자가 판정하지 않고 참여자가 스스로 안다.
  it('첫 도미노 짝 — 검산 구조', () => {
    expect(l.has('↓ 그것이 넘어지면')).toBe(true);
    expect(l.has('함께 넘어갈 것은')).toBe(true);
  });

  // STEP 5 의 유일한 판별 기준이 '끝나는 날'이다. 이 문장을 지우면 마감일 칸이 단순 서식이 된다.
  it('마감일 — STEP 5 원리', () => {
    expect(l.has('프로젝트 이름과 마감일을 함께 적어, 결심을 일정으로 바꿉니다.')).toBe(true);
  });

  // 세션 안에서만 통하는 내부 용어다. 강의 어휘를 못 들은 사람도 문장만으로 무엇을 쓸지 알아야 한다.
  it("'대기열' 을 참여자 문안에 쓰지 않는다", () => {
    expect([...l].some((s) => s.includes('대기열'))).toBe(false);
  });

  // STEP 7 이 환경 설계이고 여기 적힌 방해 요인이 그대로 그 시간의 재료가 된다.
  //   이 회차에서는 방해에 대한 답을 주지 않는 것이 설계다.
  it('방해 요인 보조 문구는 5회차 인계다', () => {
    expect(l.has('여기 적어 두신 것이 다음 시간의 재료가 됩니다.')).toBe(true);
    expect([...l].some((s) => s.includes('사흘쯤 뒤에'))).toBe(false);
  });
});

// ADR-91 D — 완충 문구를 '허락'에서 '용도'로 바꾼 교체. 실측이 근거를 지웠기 때문이다:
//   실행 자신감 값은 2·5·7·8(평균 5.5)로 부풀림이 없었고, self_note placeholder 를 그대로 베낀 사람은 0명이었다.
//   없애는 것이 아니라 문법을 바꾼다 — 정직성 확보 효과는 같고 자세가 반대다.
//   이 교체가 baseline 을 깨뜨렸으므로 스냅샷을 재생성했고, 되돌아가지 않도록 여기서 못 박는다.
// ADR-100 — 심화① 삭제 + 심화② 문항 교체. 지휘부 지시 2026-08-10.
describe('3회차 심화 개정이 되돌아가지 않는다 (ADR-100)', () => {
  const lits = koreanLiterals('session3');

  it('identity_gap 문항과 그 되비추기가 사라졌다', () => {
    expect(lits.has('지금 내 하루 중에서, 지난 시간에 쓴 문장과 어긋난 채 반복되고 있는 것 하나는 무엇인가요? (책 108~111쪽)')).toBe(false);
    expect(lits.has('지난 시간에 쓰신 문장')).toBe(false);
    expect(lits.has('identity_statement')).toBe(false);
  });

  it('심화② 가 무엇을·어떻게 를 함께 묻는다', () => {
    expect(lits.has('요즘 내 입에서 가장 자주 나오는 말 한마디는 무엇인가요? (책 126~133쪽)')).toBe(false);
    expect(lits.has('요즘 자주 하는 말 중에 꼭 바꾸고 싶은 말은 무엇이고, 어떻게 바꿀 건가요? (책 126~133쪽)')).toBe(true);
  });

  it('요약 줄이 한 갈래로 줄었다', () => {
    expect(lits.has('정체성과 어긋난 하루 · 내 입에 붙은 말')).toBe(false);
    expect(lits.has('내 입에 붙은 말')).toBe(true);
  });

  // 1·2회차는 이 개정의 대상이 아니다.
  it('1·2회차 심화 문안은 무영향', () => {
    for (const file of ['session1', 'session2'] as const) {
      expect(koreanLiterals(file).has('요즘 자주 하는 말 중에 꼭 바꾸고 싶은 말은 무엇이고, 어떻게 바꿀 건가요? (책 126~133쪽)'), file).toBe(false);
    }
  });
});

describe('완충 문구 교체가 되돌아가지 않는다', () => {
  const REPLACED = '솔직하게요. 낮게 답하셔도 아무 일 없습니다.';
  const NOW = '지금 느끼는 그대로 표시해 주세요. 숫자가 낮으면 인도자가 한 걸음을 더 잘게 나눠 드립니다.';

  // ★ **6회차는 넣지 않는다.** 90일 한 걸음이라 보조문구가 다르다
  //   ('낮게 적힌 숫자가 인도자에게는 가장 쓸모 있습니다. 종료 뒤 연락의 우선순위가 됩니다.')
  //   되돌아가지 않았는지는 6회차 자체 잠금(session6.test.ts)이 본다.
  for (const file of ['session1', 'session2', 'session3', 'session4', 'session5'] as const) {
    it(`${file}: 실행 자신감 보조문구가 용도 문법으로 바뀌었다`, () => {
      const lits = koreanLiterals(file);
      expect(lits.has(REPLACED)).toBe(false);
      expect(lits.has(NOW)).toBe(true);
    });
  }

  // self_note 예시는 회차마다 다르다 — label 은 이미 회차별인데 예시만 고정이었던 설계 누락을 메운다.
  //   멈춤을 모델링하지 않고 정직을 모델링한다(강요된 밝음도 아니다).
  it('self_note 예시가 회차마다 다르다', () => {
    const old = '괜찮아, 오늘은 여기까지만 해도 돼';
    expect(koreanLiterals('session1').has(old)).toBe(false);
    expect(koreanLiterals('session2').has(old)).toBe(false);
    expect(koreanLiterals('session1').has('오늘 꺼내길 잘했다')).toBe(true);
    expect(koreanLiterals('session2').has('아직 흐릿해도, 방향은 잡았다')).toBe(true);
  });

  // §6-2: 완충을 일괄 제거하지 않는다. 5주차에 실제로 무너진 사람이 여는 문이라 여기까지 딱딱해지면 소수를 잃는다.
  it('남겨 두기로 한 완충은 그대로다', () => {
    const koreanStrings3 = koreanLiterals('session3');
    for (const file of ['session1', 'session2', 'session3', 'session4', 'session5', 'session6'] as const) {
      const lits = koreanLiterals(file);
      // ADR-102 가 이 목록에서 selfNote 완충 하나를 **뺐다**(판례 부분 파기). 남은 둘은 그대로다 —
      //   연락 요청과 익명 안내는 '무너진 사람이 여는 문'이지만 self_note 는 자기에게 쓰는 말이라
      //   도움을 청하는 통로가 아니다. 그리고 그 칸만 필수인데 4/8 이 비었다.
      expect(lits.has('짧은 안부 연락입니다. 코칭 세션이 아닙니다.'), file).toBe(true);
      expect(lits.has('이름 없이 전달합니다. 다만 인원이 적은 차수에서는 글의 결로 짐작될 수 있습니다.'), file).toBe(true);
    }
    // 1·2회차 마음 낱말은 바꾸지 않는다(C는 3회차만) — 저장된 답이 화면에서 지워지지 않게.
    expect(koreanLiterals('session1').has('아직 모르겠음')).toBe(true);
    expect(koreanLiterals('session2').has('아직 모르겠음')).toBe(true);
    // 3회차는 반대다. 회차 간 낱말 차이는 사고가 아니라 ADR-91 C 의 의도된 차이다 — 양방향으로 못 박는다.
    //   (2기 시작 전 1·2회차도 통일할 예정이며, 그때 이 단언 셋을 함께 고친다.)
    expect(koreanStrings3.has('아직 모르겠음')).toBe(false);
    expect(koreanStrings3.has('딱 맞는 말이 없음')).toBe(true);
  });
});

// ADR-108 — 5회차. 이 회차의 판단이 문안에서 되돌아가지 않는다.
//   금지 어휘 검사는 **5회차 문안으로 스코프한다** — 3회차에 '점수'가 리터럴로 둘 있고(워크북에서
//   참여자가 실제로 점수를 매긴 활동을 가리킨다) 그것은 측정 도구의 이름이 아니라 남긴 것이다.
//   공용 BANNED(허락 어휘 여섯)에는 손대지 않는다 — 그것은 전 회차 공통 규범이다.
describe('5회차 문안이 되돌아가지 않는다 (ADR-108)', () => {
  const l = koreanLiterals('session5');

  it('트리거 짝 — 신호 강제 구조', () => {
    expect(l.has('→ 그러면')).toBe(true);
  });

  it('결산 다섯째 — 조정은 실패가 아니다', () => {
    expect(l.has('크기나 내용을 바꿨습니다')).toBe(true);
  });

  it('환경 한 줄이 책 참조와 함께 선다', () => {
    expect(l.has('오늘 바꾸기로 하신 환경 하나를 그대로 옮겨 적어 주세요. (책 210~213쪽)')).toBe(true);
  });

  it('방해 요인 보조 문구가 3회차 위로로 돌아왔다 — 4회차가 넘긴 재료를 여기서 받는다', () => {
    expect(l.has('미리 적어 두면, 그때 무엇을 할지 이미 정해져 있습니다.')).toBe(true);
    expect([...l].some((s) => s.includes('다음 시간의 재료가 됩니다'))).toBe(false);
  });

  it('되비추기가 한 걸음과 첫 도미노를 한 상자에서 대조하게 한다', () => {
    expect(l.has('지난 시간의 한 걸음과 첫 도미노')).toBe(true);
  });

  it('금지 낱말 — 5회차 신규 여섯 포함', () => {
    const banned = ['의지력', '게으름', '원씽', '스프린트', '전두엽', '도파민', '단톡방', '체크', '대기열'];
    banned.forEach((w) => expect([...l].some((s) => s.includes(w)), w).toBe(false));
  });

  it('마음 낱말이 원안의 겹치던 둘에서 바뀌었다', () => {
    expect(l.has('가뿐함')).toBe(true);
    expect(l.has('단단함')).toBe(true);
    expect(l.has('홀가분함')).toBe(false); // 3회차와 문자열이 같았다
    expect(l.has('든든함')).toBe(false);   // 4회차와 문자열이 같았다
  });
});
