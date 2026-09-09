import { renderLayout, statusBadge, formatMoney, escapeHtml } from "./layout.js";

const STATUS_MESSAGES = {
  pending_payment: "We're waiting for your payment to be confirmed.",
  payment_submitted: "Thanks — we've received your payment reference and will verify it shortly.",
  paid: "Your payment has been confirmed. Your order is next in line to be handmade and packed.",
  processing: "Your order is being handmade and carefully packed.",
  shipped: "Your order is on its way!",
  delivered: "Your order has been delivered. We hope you love it.",
  cancelled: "Your order has been cancelled. If this is unexpected, just reply to this email.",
  refunded: "Your order has been refunded.",
};

// Sent every time an admin (or the customer, for payment_submitted) changes
// an order's status.
export function orderStatusUpdateEmail({ brand, order, customer, previousStatus, newStatus }) {
  const message = STATUS_MESSAGES[newStatus] || `Your order status is now "${newStatus.replace(/_/g, " ")}".`;
  const trackingHtml =
    newStatus === "shipped" && order.tracking_number
      ? `<p style="margin:16px 0 0;">Tracking number: <strong>${escapeHtml(order.tracking_number)}</strong>${order.carrier ? ` (${escapeHtml(order.carrier)})` : ""}</p>`
      : "";

  const bodyHtml = `
    <h1 style="font-size:22px;margin:0 0 12px;">Update on your order</h1>
    <p style="margin:0 0 16px;color:#6b5d54;">Order <strong>${escapeHtml(order.order_number)}</strong> for ${escapeHtml(customer.name.split(" ")[0])}</p>
    <p style="margin:0 0 16px;">${statusBadge(newStatus, brand.brand_color || "#a9744f")}</p>
    <p style="margin:0 0 8px;">${escapeHtml(message)}</p>
    ${trackingHtml}
    <p style="margin:24px 0 0;color:#6b5d54;">Order total: ${formatMoney(order.total_cents, order.currency)}</p>
  `;

  return renderLayout({
    brand,
    title: `Order ${order.order_number} — ${newStatus.replace(/_/g, " ")}`,
    preheader: message,
    bodyHtml,
  });
}
