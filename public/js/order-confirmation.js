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
        <h1>Thank you, ${order.customer_name.split(" ")[0]}!</h1>
        <p class="helper-text">Order <strong>${order.order_number}</strong> &middot; <span class="badge badge-${order.status}">${order.status.replace(/_/g, " ")}</span></p>

        <div class="confirmation-grid">
          <div>
            <h3>Items</h3>
            ${items
              .map(
                (i) => `<div class="checkout-summary__item"><span>${i.product_name} &times;${i.quantity}</span><span>${window.formatMoney(i.line_total_cents)}</span></div>`
              )
              .join("")}
            <div class="checkout-summary__total"><span>Total</span><span>${window.formatMoney(order.total_cents)}</span></div>
          </div>
          <div>
            <h3>Shipping to</h3>
            <p>${order.shipping_name}<br/>${order.shipping_address}<br/>${order.shipping_city}, ${order.shipping_state} ${order.shipping_postal}<br/>${order.shipping_country}</p>
            ${order.tracking_number ? `<p class="helper-text">Tracking: ${order.tracking_number}${order.carrier ? ` (${order.carrier})` : ""}</p>` : ""}
          </div>
        </div>

        <h3>Order history</h3>
        <ul class="order-history">
          ${history.map((h) => `<li><span class="badge badge-${h.status}">${h.status.replace(/_/g, " ")}</span> <span class="helper-text">${h.changed_at}${h.note ? " — " + h.note : ""}</span></li>`).join("")}
        </ul>

        <p class="helper-text">We've emailed a confirmation to your inbox, and we'll email you again whenever your order status changes.</p>
        <a href="/html/shop.html" class="btn btn-outline">Continue shopping</a>
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<p class="empty-state">Couldn't find that order: ${e.message}</p>`;
  }
}

document.addEventListener("DOMContentLoaded", renderConfirmation);
