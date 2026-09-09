async function loadOrders() {
  const body = document.getElementById("orders-body");
  const status = document.getElementById("status-filter").value;
  body.innerHTML = "<tr><td colspan='5'>Loading…</td></tr>";
  try {
    const { orders } = await window.adminApi.orders.list(status);
    body.innerHTML = orders.length
      ? orders
          .map(
            (o) => `
        <tr>
          <td><a class="row-link" href="/admin/html/order-detail.html?id=${o.id}">${o.order_number}</a></td>
          <td>${o.customer_name}<br/><span class="helper-text">${o.customer_email}</span></td>
          <td><span class="badge badge-${o.status}">${o.status.replace(/_/g, " ")}</span></td>
          <td>${window.formatMoney(o.total_cents)}</td>
          <td>${o.created_at}</td>
        </tr>`
          )
          .join("")
      : '<tr><td colspan="5">No orders found.</td></tr>';
  } catch (e) {
    body.innerHTML = `<tr><td colspan="5" class="error-text">${e.message}</td></tr>`;
  }
}

document.addEventListener("admin:ready", () => {
  loadOrders();
  document.getElementById("status-filter").addEventListener("change", loadOrders);
});
