const orderId = new URLSearchParams(location.search).get("id");
const STATUSES = ["pending_payment", "payment_submitted", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"];

async function loadOrder() {
  const content = document.getElementById("order-content");
  try {
    const { order, items, history } = await window.adminApi.orders.get(orderId);
    document.getElementById("order-title").textContent = `Order ${order.order_number}`;

    content.innerHTML = `
      <div>
        <div class="card">
          <h3 style="margin-top:0;">Items</h3>
          ${items.map((i) => `<div class="item-row"><span>${i.product_name} &times;${i.quantity}</span><span>${window.formatMoney(i.line_total_cents)}</span></div>`).join("")}
          <div class="item-row" style="border-bottom:none; font-weight:700;"><span>Total</span><span>${window.formatMoney(order.total_cents)}</span></div>
        </div>

        <div class="card">
          <h3 style="margin-top:0;">Customer &amp; shipping</h3>
          <p><strong>${order.customer_name}</strong><br/>${order.customer_email}${order.customer_phone ? " · " + order.customer_phone : ""}</p>
          <p>${order.shipping_address}<br/>${order.shipping_city}, ${order.shipping_state} ${order.shipping_postal}<br/>${order.shipping_country}</p>
          ${order.customer_notes ? `<p class="helper-text">Note from customer: ${order.customer_notes}</p>` : ""}
          <p class="helper-text">Payment method: ${order.payment_method}${order.payment_reference ? ` — reference: <strong>${order.payment_reference}</strong>` : " — not yet submitted"}</p>
        </div>

        <div class="card">
          <h3 style="margin-top:0;">Status history</h3>
          ${history
            .map(
              (h) =>
                `<div class="history-item"><span class="badge badge-${h.status}">${h.status.replace(/_/g, " ")}</span><span class="helper-text">${h.changed_at}${h.changed_by ? " · " + h.changed_by : ""}${h.note ? " — " + h.note : ""}</span></div>`
            )
            .join("")}
        </div>
      </div>

      <div>
        <div class="card">
          <h3 style="margin-top:0;">Update status</h3>
          <p class="helper-text" style="margin-bottom:14px;">Current: <span class="badge badge-${order.status}">${order.status.replace(/_/g, " ")}</span></p>
          <form id="status-form">
            <div class="field">
              <label for="status">New status</label>
              <select id="status">
                ${STATUSES.map((s) => `<option value="${s}" ${s === order.status ? "selected" : ""}>${s.replace(/_/g, " ")}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="tracking_number">Tracking number (optional)</label>
              <input id="tracking_number" value="${order.tracking_number || ""}" />
            </div>
            <div class="field">
              <label for="carrier">Carrier (optional)</label>
              <input id="carrier" value="${order.carrier || ""}" />
            </div>
            <div class="field">
              <label for="note">Internal note (optional)</label>
              <textarea id="note" rows="2"></textarea>
            </div>
            <p class="helper-text">Saving sends a branded status-update email to the customer automatically.</p>
            <p class="error-text" id="status-error" style="display:none;"></p>
            <button type="submit" class="btn btn-primary btn-block">Save &amp; notify customer</button>
          </form>
        </div>
      </div>
    `;

    document.getElementById("status-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById("status-error");
      errorEl.style.display = "none";
      try {
        await window.adminApi.orders.updateStatus(orderId, {
          status: document.getElementById("status").value,
          tracking_number: document.getElementById("tracking_number").value,
          carrier: document.getElementById("carrier").value,
          note: document.getElementById("note").value,
        });
        loadOrder();
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = "block";
      }
    });
  } catch (e) {
    content.innerHTML = `<p class="error-text">${e.message}</p>`;
  }
}

document.addEventListener("admin:ready", loadOrder);
