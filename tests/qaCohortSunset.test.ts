// ★ QA 기수 일몰 잠금 — **잊으면 남는다**(지휘부 경계 ⑤ 2026-08-29).
//
// **치우는 스크립트만으로는 부족하다.** 그것은 *사람이 돌릴 것*이라는 가정 위에 선다.
//   9월 20일에 실기수가 둘이 되는데 그때 QA 기수가 남아 있으면 인도자·참여자가 그것을 본다.
//   그래서 **날짜가 지나면 스스로 우는** 장치를 둔다 — 돌리는 사람이 없어도 운다.
//
// **이 테스트가 재는 것은 두 가지다**:
//   ⑴ 기한 전 — 도구와 치우는 길이 **실재하는가**(만들어 놓고 치울 길이 없으면 그것이 곧 남는 길이다)
//   ⑵ 기한 후 — **레드다.** 그날이 오면 «치웠는가» 를 사람이 답해야 넘어간다.
//
// **왜 DB 를 보지 않는가**: 이 테스트는 CI·로컬 어디서나 돌아야 하고 자격이 없을 수도 있다.
//   DB 조회를 넣으면 자격 없는 환경에서 **조용히 건너뛰고**, 그것이 이 조항이 막으려는 바로 그 모양이다.
//   대신 **날짜**로 운다 — 자격이 필요 없고 어디서나 같은 값을 낸다.
//   실제 0 확인은 `node scripts/qaCohort.mjs status` 가 한다(그 명령을 아래에 적어 둔다).
import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

/**
 * **기한 — 실기수 둘째 기수가 서는 날 하루 전**(2026-09-19).
 *   이 값을 미루려면 **사람이 손으로 미뤄야 한다.** 그것이 이 잠금의 목적이다 —
 *   미루는 일이 눈에 보이고 커밋에 남는다.
 */
export const QA_COHORT_SUNSET = '2026-09-19';

describe('QA 기수 — 남아 있으면 운다(경계 ⑤)', () => {
  it('도구와 **치우는 길**이 한 파일에 있다 — 나중에 만들지 않는다', () => {
    const p = 'scripts/qaCohort.mjs';
    expect(existsSync(p), 'QA 기수 도구가 없다').toBe(true);
    const src = readFileSync(p, 'utf8');
    for (const cmd of ['async function up(', 'async function down(', 'async function check(']) {
      expect(src, `${cmd} 가 없다 — 세우는 길만 있고 치우는 길이 없으면 그것이 남는 길이다`).toContain(cmd);
    }
    // 치운 뒤 **0 을 확인**하는지까지 본다. «지웠다» 와 «0 이다» 는 다르다.
    expect(src).toContain('★ 다 치워지지 않았다');
  });

  it('실기수·실계정에 닿는 길이 **코드로 막혀** 있다', () => {
    const src = readFileSync('scripts/qaCohort.mjs', 'utf8');
    expect(src).toContain("FORBIDDEN_CODES = ['ZR4KB', 'HMT7Z']");
    expect(src, '실기수를 지우려 할 때 던지지 않는다').toContain('★ 멈춘다 — 실기수를 지우려 한다');
  });

  it('★ **기한이 지나면 레드다** — 그날이 오면 사람이 답해야 넘어간다', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(
      today <= QA_COHORT_SUNSET,
      `오늘(${today})이 QA 기수 일몰(${QA_COHORT_SUNSET})을 지났다.\n` +
      '  ① `node scripts/qaCohort.mjs status` 로 **0 인지 실제로 재고**\n' +
      '  ② 0 이면 이 테스트와 도구를 걷거나, 기한을 옮긴 사유를 커밋에 적어라.\n' +
      '  **자동으로 넘어가지 않는다 — 그것이 이 잠금의 목적이다.**',
    ).toBe(true);
  });
});
