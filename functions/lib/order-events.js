// Wraps the ORDER_EVENTS_QUEUE producer binding. Every order create / status
// change goes through here instead of calling the email API directly, so a
// slow or failing email send never blocks the customer-facing request and
// Cloudflare Queues handles retries + dead-letter redrive for us.
export async function enqueueOrderEvent(env, message) {
  if (!env.ORDER_EVENTS_QUEUE) {
    console.warn("ORDER_EVENTS_QUEUE binding missing; skipping email event", message);
    return;
  }
  await env.ORDER_EVENTS_QUEUE.send({ ...message, enqueued_at: new Date().toISOString() });
}
