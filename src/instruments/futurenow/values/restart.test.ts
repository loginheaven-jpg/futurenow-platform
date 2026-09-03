import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GATE } from './copy';

// ── 다시 하기 (ADR-187) ─────────────────────────────────────────────────────
//
// 이 기능의 실패는 **조용하다.** 화면은 멀쩡히 초기화된 것처럼 보이는데 서버 행에 옛 결과가
//   남아 있으면, 참여자는 새로 고르고 저장할 때 `already finalized` 로 막히거나 옛 라벨이
//   되살아난 결과를 본다. 그래서 **지우는 목록**을 잠근다.
//
// 실DB 없이 재는 잠금이다. 실행 권한·SECURITY DEFINER 는 배포 때 실측했다(보고서 참조).

const SQL = readFileSync('supabase/migrations/20260903120000_value_restart.sql', 'utf8');
const CLIENT = readFileSync(
  'src/app/(member)/my/cohorts/[cohortId]/values/ValuesClient.tsx',
  'utf8',
);

describe('value_restart — 참여자 산출물을 하나도 남기지 않는다', () => {
  // 하나라도 빠지면 그 칸만 옛 것이 남는다. 표에서 직접 뽑은 목록이다.
  const 지워야 = [
    'stage', 'progress', 'candidates',
    'value1_id', 'value2_id', 'value3_id',
    'value1_label', 'value2_label', 'value3_label',
    'wb_peak', 'wb_strength', 'wb_longing',
    'alignment',
    'stage1_completed_at', 'stage2_started_at',
    'finalized_at',
  ];

  const body = SQL.slice(SQL.indexOf('UPDATE public.value_assessments'), SQL.indexOf('WHERE id = v_cur.id'));

  for (const col of 지워야) {
    it(`${col} 를 비운다`, () => {
      expect(body, `${col} 가 SET 목록에 없다 — 그 칸만 옛 것이 남는다`).toMatch(
        new RegExp(`(^|[^a-z_])${col}\\s*=`),
      );
    });
  }

  // 이것을 안 비우면 다음 저장이 'already finalized' 로 막혀 화면이 잠긴다.
  it('finalized_at 을 비운다 — 안 비우면 다음 저장이 막힌다', () => {
    expect(body).toMatch(/finalized_at\s*=\s*NULL/);
  });

  it('stage 를 exploring 으로 되돌린다', () => {
    expect(body).toMatch(/stage\s*=\s*'exploring'/);
  });

  // 행을 지우면 인도자 화면의 참조가 끊기고 부분 유니크 인덱스와도 다툰다.
  it('행을 지우지 않고 비운다', () => {
    expect(SQL).not.toMatch(/DELETE\s+FROM\s+public\.value_assessments/i);
  });

  it('남기는 것은 신원뿐이다 — cohort_id·created_at 은 건드리지 않는다', () => {
    expect(body).not.toMatch(/(^|[^a-z_])cohort_id\s*=/);
    expect(body).not.toMatch(/(^|[^a-z_])created_at\s*=/);
  });
});

describe('value_restart — 권한과 경계', () => {
  it('SECURITY DEFINER 이고 search_path 를 고정한다', () => {
    expect(SQL).toContain('SECURITY DEFINER');
    expect(SQL).toContain('SET search_path = public');
  });

  it('응시 게이트와 회기 검증을 그대로 지난다', () => {
    expect(SQL).toContain("member_can_assess(auth.uid(), 'standing')");
    expect(SQL).toContain('is_cohort_member(p_cohort_id, auth.uid())');
  });

  it('자기 행만 만진다 — auth.uid() 로 잠근다', () => {
    expect(SQL).toContain('user_id = auth.uid()');
    // 개인 응시는 cohort_id 가 NULL 이라 = 로는 안 잡힌다.
    expect(SQL).toContain('cohort_id IS NOT DISTINCT FROM p_cohort_id');
  });

  it('anon 은 실행하지 못한다', () => {
    expect(SQL).toMatch(/REVOKE ALL ON FUNCTION public\.value_restart\(uuid\) FROM PUBLIC, anon/);
    expect(SQL).toMatch(/GRANT EXECUTE ON FUNCTION public\.value_restart\(uuid\) TO authenticated/);
  });

  // 되돌림을 전이로 열면 **저장 경로로도 초기화가 가능해진다.**
  //   지우는 일은 자기 이름을 가진 한 곳에서만 일어나야 한다.
  it('전이표를 건드리지 않는다 — 초기화 통로는 하나뿐이다', () => {
    // 주석은 뺀다 — 규율을 설명하는 주석이 이름을 인용하는 것은 정상이다.
    const 코드 = SQL.split(/\r?\n/).filter((l) => !l.trim().startsWith('--')).join(' ');
    expect(코드).not.toContain('value_stage_ok');
    const 표 = readFileSync('supabase/migrations/20260826120000_value_assessments.sql', 'utf8');
    const 전이 = 표.slice(표.indexOf('CREATE FUNCTION public.value_stage_ok'), 표.indexOf('-- 4.1'));
    expect(전이, '전이표에 되돌아가는 쌍이 생겼다').not.toMatch(/'final'\s*,\s*'exploring'/);
  });
});

describe('갈림길 화면 — 진행 중·완료에서 고를 수 있다 (층2·3)', () => {
  it('하던 것이 있으면 단계로 곧장 뛰지 않는다', () => {
    // 전에는 finalists 면 안내 없이 비교 화면 한가운데로 떨어졌다.
    expect(CLIENT).toContain("initial ? 'gate' : 'intro'");
    expect(CLIENT).not.toMatch(/if \(initial\.stage === 'finalists'\) return 'pairwise'/);
  });

  it('갈림길이 이어서 하기와 다시 하기를 둘 다 낸다', () => {
    const gate = CLIENT.slice(CLIENT.indexOf("screen === 'gate'"), CLIENT.indexOf("screen === 'confirmRestart'"));
    expect(gate).toContain('GATE.resume');
    expect(gate).toContain('GATE.restart');
    expect(gate).toContain('GATE.see');
    // 되돌리기는 보조 버튼이다 — 쉽게 닿되 먼저 눌리지는 않아야 한다.
    expect(gate).toMatch(/ui-btn--ghost[^]*GATE\.restart/);
  });

  it('확인을 거치지 않고는 지워지지 않는다', () => {
    const gate = CLIENT.slice(CLIENT.indexOf("screen === 'gate'"), CLIENT.indexOf("screen === 'confirmRestart'"));
    expect(gate, '갈림길에서 곧바로 지우면 안 된다').not.toContain('onClick={restart}');
    expect(gate).toContain("setScreen('confirmRestart')");
  });

  // 서버가 비었는데 화면이 채워져 있으면 다음 저장이 어긋난 채로 나간다.
  it('되돌린 뒤 화면 상태를 남김없이 비운다', () => {
    const fn = CLIENT.slice(CLIENT.indexOf('const restart = ()'), CLIENT.indexOf("setScreen('intro');"));
    for (const call of ['setPicked(new Set())', 'setPage(0)', 'setCandidates([])', 'setFive([])',
      'setPw(null)', 'setFinalIds([])', 'setLabels(', 'setWb(', 'setAlign(null)']) {
      expect(fn, `${call} 가 없다 — 그 상태만 옛 것이 남는다`).toContain(call);
    }
  });
});

describe('갈림길 문구 — 무엇을 잃는지 단계마다 다르게 말한다', () => {
  it('완료 뒤가 가장 무겁다 — 인도자 쪽에서도 사라진다고 말한다', () => {
    expect(GATE.loseFinal).toContain('인도자');
    expect(GATE.loseFinal.length).toBeGreaterThan(GATE.loseExploring.length);
  });

  it('세 단계가 서로 다른 문장을 쓴다', () => {
    const 셋 = new Set([GATE.loseExploring, GATE.loseCandidates, GATE.loseFinal]);
    expect(셋.size).toBe(3);
  });

  it('어디까지 왔는지 말해 준다 — 그것을 알아야 고를 수 있다', () => {
    expect(GATE.atExplore(3, 5, 9)).toContain('3');
    expect(GATE.atExplore(3, 5, 9)).toContain('5');
    expect(GATE.atExplore(3, 5, 9)).toContain('9');
    expect(GATE.atCandidates(11)).toContain('11');
  });
});
