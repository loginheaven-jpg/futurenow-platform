// 단위테스트용 경량 Supabase 모킹. supabase-js 의 체이닝 빌더를 흉내내고 호출을 기록한다.
// (RLS 는 모킹으로 검증 불가 — 실제 DB 격리 테스트는 rls.integration.test.ts 참조.)
import type { SupabaseClient } from '@supabase/supabase-js';

export interface QueryCall {
  table: string;
  op: 'select' | 'insert' | 'upsert';
  filters: Record<string, unknown>;
  payload?: unknown;
  selection?: string;
  single: 'single' | 'maybe' | false;
}

export type TableResolver = (call: QueryCall) => { data: unknown; error: unknown };
export type RpcResolver = (name: string, args: unknown) => { data: unknown; error: unknown };

class Builder {
  private call: QueryCall;
  constructor(
    table: string,
    private readonly resolver: TableResolver,
    private readonly record: (c: QueryCall) => void,
  ) {
    this.call = { table, op: 'select', filters: {}, single: false };
  }
  select(selection?: string) {
    this.call.selection = selection;
    return this;
  }
  insert(payload: unknown) {
    this.call.op = 'insert';
    this.call.payload = payload;
    return this;
  }
  upsert(payload: unknown) {
    // supabase-js 는 upsert(payload, { onConflict }) 로 호출하지만, 두 번째 인자는
    // 모킹에 불필요하므로 받지 않는다(런타임에서 여분 인자는 무시됨).
    this.call.op = 'upsert';
    this.call.payload = payload;
    return this;
  }
  eq(col: string, val: unknown) {
    this.call.filters[col] = val;
    return this;
  }
  single() {
    this.call.single = 'single';
    return this;
  }
  maybeSingle() {
    this.call.single = 'maybe';
    return this;
  }
  then<T>(
    onFulfilled?: (v: { data: unknown; error: unknown }) => T,
    onRejected?: (e: unknown) => T,
  ) {
    this.record(this.call);
    return Promise.resolve(this.resolver(this.call)).then(onFulfilled, onRejected);
  }
}

export interface MockOptions {
  authUser?: { id: string; email?: string } | null;
  tableResolver?: TableResolver;
  rpcResolver?: RpcResolver;
}

export function makeMockSupabase(opts: MockOptions = {}) {
  const calls: QueryCall[] = [];
  const rpcCalls: { name: string; args: unknown }[] = [];
  const tableResolver: TableResolver = opts.tableResolver ?? (() => ({ data: null, error: null }));
  const rpcResolver: RpcResolver = opts.rpcResolver ?? (() => ({ data: null, error: null }));

  const sb = {
    auth: {
      getUser: async () => ({ data: { user: opts.authUser ?? null }, error: null }),
    },
    from(table: string) {
      return new Builder(table, tableResolver, (c) => calls.push(c));
    },
    rpc(name: string, args: unknown) {
      rpcCalls.push({ name, args });
      const r = rpcResolver(name, args);
      return {
        then<T>(onFulfilled?: (v: { data: unknown; error: unknown }) => T, onRejected?: (e: unknown) => T) {
          return Promise.resolve(r).then(onFulfilled, onRejected);
        },
      };
    },
  };

  return { sb: sb as unknown as SupabaseClient, calls, rpcCalls };
}
