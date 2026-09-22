import { all, first, run } from "../../lib/db.js";
import { ok, error } from "../../lib/response.js";
import { requireRole } from "../../lib/auth.js";

// GET /api/customers/:id -> shop-admin only: customer details + their order history
export async function onRequestGet({ request, params, env }) {
  const admin = await requireRole(request, env.DB, ["admin"]);
  if (!admin) return error("Not authenticated", 401);

  const customer = await first(env.DB, "SELECT * FROM customers WHERE id = ?", params.id);
  if (!customer) return error("Customer not found", 404);

  const orders = await all(
    env.DB,
    "SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC",
    params.id
  );

  // "Paid" = payment already confirmed (status is 'paid' or further along the
  // fulfillment pipeline); "pending" = order placed but payment not yet
  // confirmed; cancelled/refunded orders count toward neither total.
  const totals = await first(
    env.DB,
    `SELECT
       COUNT(*) AS total_orders,
       COALESCE(SUM(CASE WHEN status NOT IN ('cancelled','refunded') THEN total_cents ELSE 0 END), 0) AS total_spent_cents,
       COALESCE(SUM(CASE WHEN status IN ('paid','processing','shipped','delivered') THEN total_cents ELSE 0 END), 0) AS total_paid_cents,
       COALESCE(SUM(CASE WHEN status IN ('pending_payment','payment_submitted') THEN total_cents ELSE 0 END), 0) AS pending_cents,
       MAX(created_at) AS last_order_at
     FROM orders WHERE customer_id = ?`,
    params.id
  );
  const summary = {
    total_orders: totals.total_orders,
    total_spent_cents: totals.total_spent_cents,
    total_paid_cents: totals.total_paid_cents,
    pending_cents: totals.pending_cents,
    avg_order_cents: totals.total_orders ? Math.round(totals.total_spent_cents / totals.total_orders) : 0,
    last_order_at: totals.last_order_at,
  };

  return ok({ customer, orders, summary });
}

// PUT /api/customers/:id -> shop-admin only: edit contact/address details
export async function onRequestPut({ request, params, env }) {
  const admin = await requireRole(request, env.DB, ["admin"]);
  if (!admin) return error("Not authenticated", 401);

  const body = await request.json().catch(() => null);
  if (!body || !body.name || !body.email) return error("name and email are required");

  const existing = await first(env.DB, "SELECT id FROM customers WHERE id = ?", params.id);
  if (!existing) return error("Customer not found", 404);

  await run(
    env.DB,
    `UPDATE customers SET name=?, email=?, phone=?, address=?, city=?, state=?, postal_code=?, country=?
     WHERE id=?`,
    body.name,
    body.email.toLowerCase(),
    body.phone || "",
    body.address || "",
    body.city || "",
    body.state || "",
    body.postal_code || "",
    body.country || "",
    params.id
  );
  return ok();
}
