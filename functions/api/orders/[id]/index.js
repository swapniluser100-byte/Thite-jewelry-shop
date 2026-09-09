import { all, first, run } from "../../../lib/db.js";
import { ok, error } from "../../../lib/response.js";
import { requireAdmin } from "../../../lib/auth.js";
import { enqueueOrderEvent } from "../../../lib/order-events.js";

// GET /api/orders/:id
//   :id can be the numeric order id (admin views) or the order_number
//   (customer-facing order-confirmation / lookup page).
//   Admin session unlocks admin_notes + full customer PII; public callers get
//   a trimmed view.
// PATCH /api/orders/:id  { payment_reference }  -> public: customer submits their
//   UPI/bank transaction reference after paying via the QR code.
export async function onRequestGet({ request, params, env }) {
  const isNumeric = /^\d+$/.test(params.id);
  const whereColumn = isNumeric ? "o.id" : "o.order_number";
  const order = await first(
    env.DB,
    `SELECT o.*, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone
     FROM orders o JOIN customers c ON c.id = o.customer_id
     WHERE ${whereColumn} = ?`,
    params.id
  );
  if (!order) return error("Order not found", 404);

  const items = await all(env.DB, "SELECT * FROM order_items WHERE order_id = ?", order.id);
  const history = await all(
    env.DB,
    "SELECT status, note, changed_at FROM order_status_history WHERE order_id = ? ORDER BY changed_at ASC",
    order.id
  );

  const admin = await requireAdmin(request, env.DB);
  if (!admin) {
    delete order.admin_notes;
  }

  return ok({ order, items, history });
}

export async function onRequestPatch({ request, params, env }) {
  const body = await request.json().catch(() => null);
  if (!body || !body.payment_reference) return error("payment_reference is required");

  const isNumeric = /^\d+$/.test(params.id);
  const order = await first(
    env.DB,
    `SELECT * FROM orders WHERE ${isNumeric ? "id" : "order_number"} = ?`,
    params.id
  );
  if (!order) return error("Order not found", 404);
  if (order.status !== "pending_payment") {
    return error("This order is not awaiting payment confirmation", 400);
  }

  await run(
    env.DB,
    "UPDATE orders SET payment_reference = ?, status = 'payment_submitted', updated_at = datetime('now') WHERE id = ?",
    body.payment_reference,
    order.id
  );
  await run(
    env.DB,
    "INSERT INTO order_status_history (order_id, status, note) VALUES (?, 'payment_submitted', 'Customer submitted payment reference')",
    order.id
  );

  await enqueueOrderEvent(env, {
    type: "order_status_changed",
    orderId: order.id,
    previousStatus: "pending_payment",
    newStatus: "payment_submitted",
  });

  return ok();
}
