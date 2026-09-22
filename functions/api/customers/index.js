import { all, first, run } from "../../lib/db.js";
import { ok, error } from "../../lib/response.js";
import { requireRole } from "../../lib/auth.js";

// GET /api/customers -> shop-admin only, with lifetime order stats
export async function onRequestGet({ request, env }) {
  const admin = await requireRole(request, env.DB, ["admin"]);
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

// POST /api/customers -> shop-admin only: manually add a customer.
// Same email/phone dedupe rule as order placement, so an admin can't
// accidentally create a second record for someone who already has one.
export async function onRequestPost({ request, env }) {
  const admin = await requireRole(request, env.DB, ["admin"]);
  if (!admin) return error("Not authenticated", 401);

  const body = await request.json().catch(() => null);
  if (!body || !body.name || !body.email) return error("name and email are required");

  const normalizedEmail = body.email.toLowerCase();
  const normalizedPhone = (body.phone || "").trim();
  const existing = normalizedPhone
    ? await first(env.DB, "SELECT id FROM customers WHERE email = ? OR (phone != '' AND phone = ?)", normalizedEmail, normalizedPhone)
    : await first(env.DB, "SELECT id FROM customers WHERE email = ?", normalizedEmail);
  if (existing) return error("A customer with this email or phone already exists", 409, { existing_id: existing.id });

  const result = await run(
    env.DB,
    `INSERT INTO customers (name, email, phone, address, city, state, postal_code, country)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    body.name,
    normalizedEmail,
    normalizedPhone,
    body.address || "",
    body.city || "",
    body.state || "",
    body.postal_code || "",
    body.country || ""
  );
  return ok({ id: result.meta.last_row_id });
}
