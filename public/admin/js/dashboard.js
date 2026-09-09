async function renderDashboard() {
  try {
    const [{ orders }, { products }, { customers }] = await Promise.all([
      window.adminApi.orders.list(),
      window.adminApi.products.list(),
      window.adminApi.customers.list(),
    ]);

    const revenueCents = orders
      .filter((o) => !["cancelled", "refunded", "pending_payment"].includes(o.status))
      .reduce((sum, o) => sum + o.total_cents, 0);
    const awaitingAction = orders.filter((o) => ["payment_submitted", "paid", "processing"].includes(o.status)).length;

    document.getElementById("stat-grid").innerHTML = `
      <div class="stat-card"><div class="label">Total orders</div><div class="value">${orders.length}</div></div>
      <div class="stat-card"><div class="label">Needs attention</div><div class="value">${awaitingAction}</div></div>
      <div class="stat-card"><div class="label">Revenue (paid+)</div><div class="value">${window.formatMoney(revenueCents)}</div></div>
      <div class="stat-card"><div class="label">Products</div><div class="value">${products.length}</div></div>
      <div class="stat-card"><div class="label">Customers</div><div class="value">${customers.length}</div></div>
    `;

    const body = document.getElementById("recent-orders-body");
    const recent = orders.slice(0, 8);
    body.innerHTML = recent.length
      ? recent
          .map(
            (o) => `
        <tr>
          <td><a class="row-link" href="/admin/html/order-detail.html?id=${o.id}">${o.order_number}</a></td>
          <td>${o.customer_name}</td>
          <td><span class="badge badge-${o.status}">${o.status.replace(/_/g, " ")}</span></td>
          <td>${window.formatMoney(o.total_cents)}</td>
          <td>${o.created_at}</td>
        </tr>`
          )
          .join("")
      : '<tr><td colspan="5">No orders yet.</td></tr>';
  } catch (e) {
    document.getElementById("stat-grid").innerHTML = `<p class="error-text">Couldn't load dashboard: ${e.message}</p>`;
  }
}

document.addEventListener("admin:ready", renderDashboard);
