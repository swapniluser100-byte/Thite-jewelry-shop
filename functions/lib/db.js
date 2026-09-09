// Thin helpers around the D1 binding so route files stay readable.

export async function all(db, sql, ...params) {
  const stmt = params.length ? db.prepare(sql).bind(...params) : db.prepare(sql);
  const { results } = await stmt.all();
  return results;
}

export async function first(db, sql, ...params) {
  const stmt = params.length ? db.prepare(sql).bind(...params) : db.prepare(sql);
  return stmt.first();
}

export async function run(db, sql, ...params) {
  const stmt = params.length ? db.prepare(sql).bind(...params) : db.prepare(sql);
  return stmt.run();
}

// Generates a human-friendly, sufficiently-unique order number like JL-20260909-4F7A
export function generateOrderNumber() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const rand = crypto.randomUUID().split("-")[0].slice(0, 4).toUpperCase();
  return `JL-${y}${m}${d}-${rand}`;
}

export function nowIso() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}
