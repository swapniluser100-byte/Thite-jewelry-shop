import { all, run } from "../../lib/db.js";
import { ok, error } from "../../lib/response.js";
import { requireAdmin } from "../../lib/auth.js";

// GET /api/settings  -> public (storefront needs the QR code/UPI info + brand info)
// PUT /api/settings  -> admin only, body: { key: value, ... }
export async function onRequestGet({ env }) {
  const rows = await all(env.DB, "SELECT key, value FROM settings");
  const settings = {};
  rows.forEach((r) => (settings[r.key] = r.value));
  return ok({ settings });
}

export async function onRequestPut({ request, env }) {
  const admin = await requireAdmin(request, env.DB);
  if (!admin) return error("Not authenticated", 401);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return error("Invalid body");

  for (const [key, value] of Object.entries(body)) {
    await run(
      env.DB,
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
      key,
      String(value)
    );
  }
  return ok();
}
