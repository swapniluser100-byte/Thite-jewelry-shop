import { all, first, run, generateOrderNumber } from "../../lib/db.js";
import { ok, error } from "../../lib/response.js";
import { requireAdmin } from "../../lib/auth.js";
import { sendOrderConfirmationEmail } from "../../lib/email.js";

// GET /api/orders  -> admin only: list all orders (optionally filter by status)
// POST /api/orders -> public: place a new order from the cart/checkout page
export async function onRequestGet({ request, env }) {
  const admin = await requireAdmin(request, env.DB);
  if (!admin) return error("Not authenticated", 401);

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  let sql = `SELECT o.*, c.name AS customer_name, c.email AS customer_email
             FROM orders o JOIN customers c ON c.id = o.customer_id`;
  const params = [];
  if (status) {
    sql += " WHERE o.status = ?";
    params.push(status);
  }
  sql += " ORDER BY o.created_at DESC";
  const orders = await all(env.DB, sql, ...params);
  return ok({ orders });
}

export async function onRequestPost({ request, env, waitUntil }) {
  const body = await request.json().catch(() => null);
  if (!body || !body.customer || !Array.isArray(body.items) || body.items.length === 0) {
    return error("customer and at least one item are required");
  }

  const { customer, items, shipping = {}, notes } = body;
  if (!customer.name || !customer.email) return error("customer name and email are required");

  // Re-price server-side from the DB so the client can't tamper with totals.
  let subtotalCents = 0;
  const resolvedItems = [];
  for (const item of items) {
    const product = await first(env.DB, "SELECT * FROM products WHERE id = ? AND is_active = 1", item.product_id);
    if (!product) return error(`Product ${item.product_id} is not available`, 400);
    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    const lineTotal = product.price_cents * qty;
    subtotalCents += lineTotal;
    resolvedItems.push({
      product_id: product.id,
      product_name: product.name,
      product_image: product.image_url,
      unit_price_cents: product.price_cents,
      quantity: qty,
      line_total_cents: lineTotal,
    });
  }

  const shippingCents = subtotalCents >= 200000 ? 0 : 4900; // free shipping over 2000.00, else flat 49.00 (in the smallest currency unit *100)
  const totalCents = subtotalCents + shippingCents;

  // Upsert the customer by email so repeat buyers accumulate order history.
  let customerRow = await first(env.DB, "SELECT * FROM customers WHERE email = ?", customer.email.toLowerCase());
  if (!customerRow) {
    const res = await run(
      env.DB,
      `INSERT INTO customers (name, email, phone, address, city, state, postal_code, country)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      customer.name,
      customer.email.toLowerCase(),
      customer.phone || "",
      shipping.address || "",
      shipping.city || "",
      shipping.state || "",
      shipping.postal_code || "",
      shipping.country || "India"
    );
    customerRow = { id: res.meta.last_row_id };
  }

  const orderNumber = generateOrderNumber();
  const orderResult = await run(
    env.DB,
    `INSERT INTO orders (order_number, customer_id, status, subtotal_cents, shipping_cents, total_cents,
       payment_method, shipping_name, shipping_address, shipping_city, shipping_state, shipping_postal,
       shipping_country, customer_notes)
     VALUES (?, ?, 'pending_payment', ?, ?, ?, 'qr_code', ?, ?, ?, ?, ?, ?, ?)`,
    orderNumber,
    customerRow.id,
    subtotalCents,
    shippingCents,
    totalCents,
    customer.name,
    shipping.address || "",
    shipping.city || "",
    shipping.state || "",
    shipping.postal_code || "",
    shipping.country || "India",
    notes || ""
  );
  const orderId = orderResult.meta.last_row_id;

  for (const item of resolvedItems) {
    await run(
      env.DB,
      `INSERT INTO order_items (order_id, product_id, product_name, product_image, unit_price_cents, quantity, line_total_cents)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      orderId,
      item.product_id,
      item.product_name,
      item.product_image,
      item.unit_price_cents,
      item.quantity,
      item.line_total_cents
    );
    // decrement stock, floor at 0
    await run(env.DB, "UPDATE products SET stock_qty = MAX(0, stock_qty - ?) WHERE id = ?", item.quantity, item.product_id);
  }

  await run(
    env.DB,
    "INSERT INTO order_status_history (order_id, status, note) VALUES (?, 'pending_payment', 'Order placed')",
    orderId
  );

  // Send the branded confirmation email in the background (waitUntil lets
  // the response go back to the customer immediately instead of waiting on
  // Resend); errors are caught and logged inside sendOrderConfirmationEmail
  // itself so a slow/failing email never breaks order placement.
  waitUntil(sendOrderConfirmationEmail(env, orderId).catch((err) => console.error("Order confirmation email failed:", err)));

  return ok({ order: { id: orderId, order_number: orderNumber, total_cents: totalCents, status: "pending_payment" } });
}
