async function loadCustomers() {
  const body = document.getElementById("customers-body");
  try {
    const { customers } = await window.adminApi.customers.list();
    body.innerHTML = customers.length
      ? customers
          .map(
            (c) => `
        <tr>
          <td>${c.name}</td>
          <td>${c.email}</td>
          <td>${c.phone || "—"}</td>
          <td>${c.order_count}</td>
          <td>${window.formatMoney(c.lifetime_cents)}</td>
        </tr>`
          )
          .join("")
      : '<tr><td colspan="5">No customers yet.</td></tr>';
  } catch (e) {
    body.innerHTML = `<tr><td colspan="5" class="error-text">${e.message}</td></tr>`;
  }
}

document.addEventListener("admin:ready", loadCustomers);
