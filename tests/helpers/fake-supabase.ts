/**
 * A chainable stand-in for the Supabase query builder. Every call on a table
 * is recorded; awaiting the chain resolves the next queued result for that
 * table. Tests assert on what was ASKED of the database, and on what the
 * action did with the answer.
 */
export type QueuedResult = { data?: unknown; error?: unknown; count?: number };
export type RecordedCall = { table: string; chain: { method: string; args: unknown[] }[] };

export function fakeSupabase(results: Record<string, QueuedResult[]> = {}) {
  const calls: RecordedCall[] = [];

  function from(table: string) {
    const call: RecordedCall = { table, chain: [] };
    calls.push(call);

    const builder: object = new Proxy(
      {},
      {
        get(_target, property) {
          if (property === 'then') {
            const next = results[table]?.shift() ?? {};
            return (resolve: (value: unknown) => void) =>
              resolve({ data: null, error: null, ...next });
          }
          return (...args: unknown[]) => {
            call.chain.push({ method: String(property), args });
            return builder;
          };
        },
      },
    );

    return builder;
  }

  /** The first recorded call on `table` that used `method`. */
  function find(table: string, method: string) {
    const call = calls.find(
      (candidate) =>
        candidate.table === table && candidate.chain.some((step) => step.method === method),
    );
    return call?.chain.find((step) => step.method === method);
  }

  return { client: { from }, calls, find };
}
