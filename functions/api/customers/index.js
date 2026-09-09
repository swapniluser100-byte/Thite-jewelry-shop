import { all } from "../../lib/db.js";
import { ok, error } from "../../lib/response.js";
import { requireAdmin } from "../../lib/auth.js";

// GET /api/customers -> admin only, with lifetime order stats
export async function onRequestGet({ request, env }) {
  const admin = await requireAdmin(request, env.DB);
  if (!admin) return error("Not authenticated", 401);

  const rows = await all(
    env.DB,
    `SELECT c.*, COUNT(o.id) AS order_count, COALESCE(SUM(o.total_cents), 0) AS lifetime_cents
     FROM customers c
     LEFT JOIN orders o ON o.customer_id = c.id
     GROUP BY c.id
     ORDER BY c.created_at DESC`
  );
  return ok({ customers: rows });
}
