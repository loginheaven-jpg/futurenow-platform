// 문안 회차 결재분 잠금 — **최박사 결재 2026-08-30 · 여섯 항목**.
//
// **얼어야 하는 값에는 잠금을 함께 둔다**(CLAUDE.md §11 ⑵).
//   ★ **여섯 중 하나는 제 권고와 다르게 결재되었다** — C4 는 제가 물결(`1~2회차`)을 권했으나
//   최박사께서 **㉮(`1-2회차`)** 로 정하셨다. **§0 의 허용 목록을 넓히지 않는 쪽**이다.
//   그 사실을 여기 적어 둔다 — 다음 사람이 「물결이 관용구인데 왜」로 되돌리지 않게.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (f: string) => readFileSync(f, 'utf8');
const DASH = ` ${String.fromCharCode(8212)} `;   // ' — '
const EN_DASH = String.fromCharCode(8211);        // '–'

describe('문안 회차 결재분 (2026-08-30)', () => {
  it('① 4회차 갈무리 묶음 제목 — 가운뎃점', () => {
    const s = read('src/instruments/futurenow/checkin/session4.ts');
    expect(s).toContain('인생의 원씽 · 세 원이 겹치는 자리');
    expect(s, '옛 문장이 살아 있다').not.toContain('인생의 원씽 —');
  });

  it('★ ③ 5회차 「만약」 칸 — **기호만 바꿨다**(㉮ · 짝 구조를 지킨다)', () => {
    // 제 권고 ㉯(꼬리표를 앞으로)가 **틀렸다** — 「만약」은 앞 문장의 꼬리표가 아니라
    //   **바로 아래 칸의 문두**였다. 참여자가 이어 읽으면
    //   「만약 월요일 아침 사무실에 앉으면, 나는 그 자료를 30분 먼저 연다」로 **한 문장**이 된다.
    //   `session5.test.ts` 의 짝 구조 잠금이 그것을 잡았고, **남은 후보는 ㉮ 하나였다.**
    const s = read('src/instruments/futurenow/checkin/session5.ts');
    expect(s).toContain(`오늘 만든 신호를 이번엔 첫 도미노에 걸어 본다면 ${String.fromCharCode(183)} 만약`);
    expect(s, '금지 기호가 되살아났다').not.toContain(`걸어 본다면 ${String.fromCharCode(8212)}`);
    // ★ 「만약」이 **끝에 남아야** 아래 칸으로 이어진다 — 앞으로 옮기면 짝이 깨진다.
    expect(s, '「만약」을 앞으로 옮겼다').not.toContain('만약 오늘 만든 신호를');
  });

  it('④ 여정 표 범위 표기 — **㉮ 로 결재되었다**(규칙을 넓히지 않는다)', () => {
    for (const f of ['src/app/_screens/site/programCopy.ts', 'src/app/_screens/site/galleryFixture.tsx']) {
      const s = read(f);
      expect(s, `${f} 에 1-2회차가 없다`).toContain('1-2회차');
      // en dash 는 §0 금지 기호다.
      expect(s.includes(`1${EN_DASH}2회차`), `${f} 에 en dash 가 남았다`).toBe(false);
      // ★ 물결로 되돌리지 않는다 — 그것은 **허용 목록을 넓히는 결정**이고 채택되지 않았다.
      expect(s, '물결로 되돌렸다 — ㉮ 가 결재분이다').not.toContain('1~2회차');
    }
  });

  it('⑤ 자동 로그인 안내 — 금지 어휘를 걷고 하는 일을 말한다', () => {
    const s = read('src/app/(member)/account/AccountForm.tsx');
    expect(s).toContain('켜져 있습니다. 이 기기에서는 로그인이 유지됩니다.');
    // §0 금지 어휘. 이 자리에서 걷은 것이므로 되살아나면 운다.
    expect(s, '금지 어휘가 되살아났다').not.toContain('않으셔도 됩니다');
  });

  it('★ 참여자가 읽는 갈무리 문자열에 대시가 없다 — 주석은 세지 않는다', () => {
    // 주석은 이 결정을 설명하므로 뺀다. 세면 자가 넓어진다(⑨-b).
    const NL = String.fromCharCode(10);
    // ★ `session5` 도 이제 대상이다 — ③ 이 ㉮ 로 적용되어 대시가 없다.
    for (const f of ['src/instruments/futurenow/checkin/session4.ts',
                     'src/instruments/futurenow/checkin/session5.ts']) {
      const code = read(f).split(NL)
        .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
        .join(NL);
      const inStrings = (code.match(/'[^']*'/g) ?? []).filter((x) => x.includes(DASH));
      expect(inStrings, `${f} 문자열에 대시: ${inStrings.join(' / ')}`).toHaveLength(0);
    }
  });
});
