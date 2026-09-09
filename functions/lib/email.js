// Sends branded order emails directly from the API — no queue, no separate
// worker to deploy. Simpler to run; the trade-off is that if Resend is slow,
// the request that triggered the email (placing an order / changing status)
// waits slightly longer. Callers should wrap these in `context.waitUntil()`
// so the customer's request doesn't block on the email actually sending.
import { orderConfirmationEmail } from "./email-templates/order-confirmation.js";
import { orderStatusUpdateEmail } from "./email-templates/order-status-update.js";

async function loadOrderBundle(db, orderId) {
  const order = await db
    .prepare(
      `SELECT o.*, c.name AS customer_name, c.email AS customer_email
       FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = ?`
    )
    .bind(orderId)
    .first();
  if (!order) throw new Error(`Order ${orderId} not found`);

  const { results: items } = await db.prepare("SELECT * FROM order_items WHERE order_id = ?").bind(orderId).all();
  const customer = { name: order.customer_name, email: order.customer_email };
  return { order, items, customer };
}

async function loadBrandSettings(db) {
  const { results } = await db.prepare("SELECT key, value FROM settings").all();
  const settings = {};
  results.forEach((r) => (settings[r.key] = r.value));
  return settings;
}

async function sendViaResend(env, { to, from, subject, html }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.RESEND_API_KEY}` },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend API error (${response.status}): ${body}`);
  }
}

async function logAttempt(db, { orderId, emailType, recipient, subject, status, error = null }) {
  try {
    await db
      .prepare(
        `INSERT INTO email_log (order_id, email_type, recipient, subject, status, error, attempts, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))`
      )
      .bind(orderId, emailType, recipient, subject, status, error)
      .run();
  } catch (e) {
    console.error("Failed to write email_log row:", e);
  }
}

export async function sendOrderConfirmationEmail(env, orderId) {
  const { order, items, customer } = await loadOrderBundle(env.DB, orderId);
  const brand = await loadBrandSettings(env.DB);
  const subject = `Order confirmation — ${order.order_number}`;
  const html = orderConfirmationEmail({ brand, order, items, customer });

  try {
    await sendViaResend(env, { to: customer.email, from: brand.from_email || "orders@example.com", subject, html });
    await logAttempt(env.DB, { orderId, emailType: "order_confirmation", recipient: customer.email, subject, status: "sent" });
  } catch (err) {
    await logAttempt(env.DB, { orderId, emailType: "order_confirmation", recipient: customer.email, subject, status: "failed", error: err.message });
    console.error("sendOrderConfirmationEmail failed:", err);
  }
}

export async function sendOrderStatusEmail(env, orderId, previousStatus, newStatus) {
  const { order, customer } = await loadOrderBundle(env.DB, orderId);
  const brand = await loadBrandSettings(env.DB);
  const subject = `Order ${order.order_number} — ${String(newStatus).replace(/_/g, " ")}`;
  const html = orderStatusUpdateEmail({ brand, order, customer, previousStatus, newStatus });

  try {
    await sendViaResend(env, { to: customer.email, from: brand.from_email || "orders@example.com", subject, html });
    await logAttempt(env.DB, { orderId, emailType: "order_status_update", recipient: customer.email, subject, status: "sent" });
  } catch (err) {
    await logAttempt(env.DB, { orderId, emailType: "order_status_update", recipient: customer.email, subject, status: "failed", error: err.message });
    console.error("sendOrderStatusEmail failed:", err);
  }
}
