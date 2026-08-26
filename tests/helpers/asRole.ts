// 역할 시뮬레이션 헬퍼 — 실DB 통합테스트 공용.
//
// `rls.integration.test.ts` 안에 있던 것을 떼어 냈다. 회원 상태 진실표(S-1 단계 4)가 같은 헬퍼를
//   필요로 하는데, 복사하면 이 저장소가 반복해서 데인 "사본이 둘"이 된다(ADR-112·114·119).
//   동작은 한 줄도 바꾸지 않았다.
//
// 공통 규약: 모든 호출은 `set local role authenticated` + `request.jwt.claims` 로 그 사용자를
//   시뮬레이션하고 끝나면 `reset role` 한다. 트랜잭션은 호출자가 열고 끝에 rollback 한다(영속 0).
import { expect } from 'vitest';
import type { Client } from 'pg';

async function becomeUser(client: Client, sub: string): Promise<void> {
  await client.query(`set local role authenticated`);
  await client.query(`select set_config('request.jwt.claims', $1, true)`, [
    JSON.stringify({ sub, role: 'authenticated' }),
  ]);
}

/** 주어진 sub(사용자)로 authenticated 역할을 시뮬레이션해 count 쿼리를 평가한다. */
export async function countAs(client: Client, sub: string, sql: string): Promise<number> {
  await becomeUser(client, sub);
  const r = await client.query(sql);
  await client.query(`reset role`);
  return Number(r.rows[0].count);
}

/** sub 로 authenticated 시뮬레이션해 문장을 실행(void). 실패 시 savepoint 로 트랜잭션 복구 후 throw(이후 검증 계속 가능). */
export async function runAs(client: Client, sub: string, sql: string): Promise<void> {
  await client.query('savepoint sp');
  try {
    await becomeUser(client, sub);
    await client.query(sql);
  } catch (e) {
    await client.query('rollback to savepoint sp');
    await client.query('release savepoint sp');
    throw e;
  }
  await client.query('reset role');
  await client.query('release savepoint sp');
}

/** 주어진 문장이 특정 sqlstate 로 raise 하는지 확인. */
export async function expectRaise(client: Client, sub: string, sql: string, sqlstate: string): Promise<void> {
  let code: string | undefined;
  try {
    await runAs(client, sub, sql);
  } catch (e) {
    code = (e as { code?: string }).code;
  }
  expect(code).toBe(sqlstate);
}

/** sub 로 UPDATE 를 실행하고 영향 행수를 반환(USING 으로 가려진 행은 0). */
export async function updateCountAs(client: Client, sub: string, sql: string): Promise<number> {
  await becomeUser(client, sub);
  const r = await client.query(sql);
  await client.query(`reset role`);
  return r.rowCount ?? 0;
}

/** sub 로 스칼라 한 값을 읽는다(member_state 등 DEFINER 함수용). 첫 열을 문자열로 돌려준다. */
export async function scalarAs(client: Client, sub: string, sql: string): Promise<string> {
  await becomeUser(client, sub);
  const r = await client.query(sql);
  await client.query(`reset role`);
  const row = r.rows[0];
  return String(row[Object.keys(row)[0]]);
}
