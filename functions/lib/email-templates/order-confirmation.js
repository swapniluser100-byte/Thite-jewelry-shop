import { renderLayout, formatMoney, escapeHtml } from "./layout.js";

// Sent once, right after a customer places an order (status = pending_payment).
export function orderConfirmationEmail({ brand, order, items, customer }) {
  const itemsHtml = items
    .map(
      (i) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #e8ddd3;">${escapeHtml(i.product_name)} &times; ${i.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #e8ddd3;text-align:right;">${formatMoney(i.line_total_cents, order.currency)}</td>
      </tr>`
    )
    .join("");

  const bodyHtml = `
    <h1 style="font-size:22px;margin:0 0 12px;">Thank you for your order, ${escapeHtml(customer.name.split(" ")[0])}!</h1>
    <p style="margin:0 0 20px;color:#6b5d54;">We've received order <strong>${escapeHtml(order.order_number)}</strong>. Here's what you ordered:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      ${itemsHtml}
      <tr>
        <td style="padding:12px 0 0;font-weight:bold;">Total</td>
        <td style="padding:12px 0 0;font-weight:bold;text-align:right;">${formatMoney(order.total_cents, order.currency)}</td>
      </tr>
    </table>
    <p style="margin:20px 0 6px;color:#6b5d54;">Shipping to:</p>
    <p style="margin:0 0 24px;">${escapeHtml(order.shipping_address)}<br/>${escapeHtml(order.shipping_city)}, ${escapeHtml(order.shipping_state)} ${escapeHtml(order.shipping_postal)}<br/>${escapeHtml(order.shipping_country)}</p>
    ${
      order.status === "pending_payment"
        ? `<p style="padding:14px 18px;background:#f3e3c8;border-radius:10px;color:#8a5c3c;margin:0;">We're still waiting on your payment confirmation. Scan the QR code shown at checkout, then submit your transaction reference — we'll start on your order as soon as that's in.</p>`
        : `<p style="margin:0;color:#4b7a52;">We'll email you again as soon as your order ships.</p>`
    }
  `;

  return renderLayout({
    brand,
    title: `Order confirmation — ${order.order_number}`,
    preheader: `Your order ${order.order_number} has been received.`,
    bodyHtml,
  });
}
