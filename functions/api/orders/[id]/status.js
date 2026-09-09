import { first, run } from "../../../lib/db.js";
import { ok, error } from "../../../lib/response.js";
import { requireAdmin } from "../../../lib/auth.js";
import { enqueueOrderEvent } from "../../../lib/order-events.js";

const VALID_STATUSES = [
  "pending_payment",
  "payment_submitted",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

// PUT /api/orders/:id/status  { status, note, tracking_number, carrier } -> admin only
// Every status change is logged to order_status_history and enqueues a
// branded status-update email to the customer.
export async function onRequestPut({ request, params, env }) {
  const admin = await requireAdmin(request, env.DB);
  if (!admin) return error("Not authenticated", 401);

  const body = await request.json().catch(() => null);
  if (!body || !VALID_STATUSES.includes(body.status)) {
    return error(`status must be one of: ${VALID_STATUSES.join(", ")}`);
  }

  const isNumeric = /^\d+$/.test(params.id);
  const order = await first(env.DB, `SELECT * FROM orders WHERE ${isNumeric ? "id" : "order_number"} = ?`, params.id);
  if (!order) return error("Order not found", 404);

  const previousStatus = order.status;
  if (previousStatus === body.status) return ok({ unchanged: true });

  await run(
    env.DB,
    `UPDATE orders SET status = ?, tracking_number = COALESCE(?, tracking_number),
       carrier = COALESCE(?, carrier), admin_notes = COALESCE(?, admin_notes), updated_at = datetime('now')
     WHERE id = ?`,
    body.status,
    body.tracking_number || null,
    body.carrier || null,
    body.note ? `${order.admin_notes ? order.admin_notes + "\n" : ""}${body.note}` : null,
    order.id
  );
  await run(
    env.DB,
    "INSERT INTO order_status_history (order_id, status, note, changed_by) VALUES (?, ?, ?, ?)",
    order.id,
    body.status,
    body.note || null,
    admin.email
  );

  await enqueueOrderEvent(env, {
    type: "order_status_changed",
    orderId: order.id,
    previousStatus,
    newStatus: body.status,
  });

  return ok();
}
