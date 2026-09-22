const ICONS = {
  check: `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 6-6"/></svg>`,
  bag: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12l1 13H5L6 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>`,
  pin: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
  clock: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`,
};

async function renderConfirmation() {
  const container = document.getElementById("confirmation-content");
  const orderNumber = new URLSearchParams(location.search).get("order");
  if (!orderNumber) {
    container.innerHTML = '<p class="empty-state">No order specified.</p>';
    return;
  }

  try {
    const { order, items, history } = await window.api.orders.get(orderNumber);
    container.innerHTML = `
      <div class="confirmation">
        <div class="confirmation-hero">
          <div class="confirmation-hero__icon">${ICONS.check}</div>
          <h1>Thank you, ${order.customer_name.split(" ")[0]}!</h1>
          <p class="order-ref">Order <strong>${order.order_number}</strong></p>
          <span class="badge badge-${order.status}">${order.status.replace(/_/g, " ")}</span>
        </div>

        <div class="confirmation-grid">
          <div class="checkout-summary">
            <div class="checkout-summary__header">
              <span class="checkout-summary__icon">${ICONS.bag}</span>
              <h2>Items</h2>
            </div>
            <div class="checkout-summary__items">
              ${items
                .map(
                  (i) =>
                    `<div class="checkout-summary__item"><span>${i.product_name} &times;${i.quantity}</span><span>${window.formatMoney(i.line_total_cents)}</span></div>`
                )
                .join("")}
            </div>
            <div class="checkout-summary__totals">
              <div class="checkout-summary__row checkout-summary__row--total"><span>Total</span><span>${window.formatMoney(order.total_cents)}</span></div>
            </div>
          </div>

          <div class="confirmation-side">
            <div class="checkout-summary">
              <div class="checkout-summary__header">
                <span class="checkout-summary__icon">${ICONS.pin}</span>
                <h2>Shipping to</h2>
              </div>
              <div class="checkout-summary__body">
                <p>${order.shipping_name}<br/>${order.shipping_address}<br/>${order.shipping_city}, ${order.shipping_state} ${order.shipping_postal}<br/>${order.shipping_country}</p>
                ${order.tracking_number ? `<p class="helper-text" style="margin-top:10px;">Tracking: ${order.tracking_number}${order.carrier ? ` (${order.carrier})` : ""}</p>` : ""}
              </div>
            </div>

            <div class="checkout-summary">
              <div class="checkout-summary__header">
                <span class="checkout-summary__icon">${ICONS.clock}</span>
                <h2>Order history</h2>
              </div>
              <div class="checkout-summary__body">
                <ul class="order-history">
                  ${history
                    .map(
                      (h) =>
                        `<li><span class="badge badge-${h.status}">${h.status.replace(/_/g, " ")}</span><span class="helper-text">${h.changed_at}${h.note ? " — " + h.note : ""}</span></li>`
                    )
                    .join("")}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div class="confirmation-footer">
          <p class="helper-text">We've emailed a confirmation to your inbox, and we'll email you again whenever your order status changes.</p>
          <a href="/html/shop.html" class="btn btn-primary">Continue shopping</a>
        </div>
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<p class="empty-state">Couldn't find that order: ${e.message}</p>`;
  }
}

document.addEventListener("DOMContentLoaded", renderConfirmation);
