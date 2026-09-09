import { sendEmail } from "./resend.js";
import { orderConfirmationEmail } from "./templates/order-confirmation.js";
import { orderStatusUpdateEmail } from "./templates/order-status-update.js";

export default {
  // HTTP fetch is unused (this worker only consumes the queue) but Workers
  // require a fetch handler to exist.
  async fetch() {
    return new Response("jewelry-shop-email-worker: queue consumer, no HTTP API", { status: 200 });
  },

  async queue(batch, env) {
    if (batch.queue.endsWith("-dlq")) {
      return handleDeadLetterBatch(batch, env);
    }
    for (const message of batch.messages) {
      try {
        await processOrderEvent(message.body, env);
        message.ack();
      } catch (err) {
        console.error("Failed to process order event, will retry:", err, message.body);
        // Not calling ack() lets Cloudflare Queues redeliver this message up
        // to max_retries (see wrangler.toml), after which it's automatically
        // moved to the order-events-dlq dead-letter queue.
        message.retry();
      }
    }
  },
};

async function processOrderEvent(event, env) {
  const { type, orderId, newStatus } = event;

  const order = await env.DB.prepare(
    `SELECT o.*, c.name AS customer_name, c.email AS customer_email
     FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = ?`
  )
    .bind(orderId)
    .first();
  if (!order) throw new Error(`Order ${orderId} not found`);

  const { results: items } = await env.DB.prepare("SELECT * FROM order_items WHERE order_id = ?").bind(orderId).all();
  const brand = await loadBrandSettings(env);
  const customer = { name: order.customer_name, email: order.customer_email };

  let subject;
  let html;
  let emailType;

  if (type === "order_created") {
    emailType = "order_confirmation";
    subject = `Order confirmation — ${order.order_number}`;
    html = orderConfirmationEmail({ brand, order, items, customer });
  } else if (type === "order_status_changed") {
    emailType = "order_status_update";
    subject = `Order ${order.order_number} — ${String(newStatus).replace(/_/g, " ")}`;
    html = orderStatusUpdateEmail({ brand, order, customer, previousStatus: event.previousStatus, newStatus });
  } else {
    throw new Error(`Unknown order event type: ${type}`);
  }

  const logId = await logEmailAttempt(env, { orderId, emailType, recipient: customer.email, subject });

  try {
    await sendEmail(env, {
      to: customer.email,
      from: brand.from_email || "orders@example.com",
      subject,
      html,
    });
    await markEmailLog(env, logId, "sent");
  } catch (err) {
    await markEmailLog(env, logId, "failed", err.message);
    throw err; // rethrow so the queue retries per max_retries
  }
}

async function loadBrandSettings(env) {
  const { results } = await env.DB.prepare("SELECT key, value FROM settings").all();
  const settings = {};
  results.forEach((r) => (settings[r.key] = r.value));
  return settings;
}

async function logEmailAttempt(env, { orderId, emailType, recipient, subject }) {
  const result = await env.DB.prepare(
    `INSERT INTO email_log (order_id, email_type, recipient, subject, status, attempts, updated_at)
     VALUES (?, ?, ?, ?, 'queued', 1, datetime('now'))`
  )
    .bind(orderId, emailType, recipient, subject)
    .run();
  return result.meta.last_row_id;
}

async function markEmailLog(env, logId, status, error = null) {
  await env.DB.prepare(
    `UPDATE email_log SET status = ?, error = ?, attempts = attempts + 1, updated_at = datetime('now') WHERE id = ?`
  )
    .bind(status, error, logId)
    .run();
}

// Messages that exhausted every retry on order-events land in
// order-events-dlq. We don't try to send email from here (that already
// failed 5 times) — we just make the failure visible so a human can fix the
// root cause (bad API key, Resend outage, etc.) and redrive the message.
async function handleDeadLetterBatch(batch, env) {
  for (const message of batch.messages) {
    const event = message.body;
    console.error("Order event moved to dead-letter queue:", event);
    try {
      await env.DB.prepare(
        `INSERT INTO email_log (order_id, email_type, recipient, subject, status, error, attempts, updated_at)
         VALUES (?, ?, '(unknown - see order)', ?, 'dead_letter', 'Exhausted retries on order-events queue', 5, datetime('now'))`
      )
        .bind(event.orderId || null, event.type || "unknown", `Failed event: ${event.type}`)
        .run();
    } catch (err) {
      console.error("Failed to record dead-lettered event:", err);
    }
    message.ack(); // stop retrying automatically; redrive manually once fixed
  }
}
