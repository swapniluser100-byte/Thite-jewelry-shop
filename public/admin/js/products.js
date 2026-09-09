async function loadProducts() {
  const body = document.getElementById("products-body");
  try {
    const { products } = await window.adminApi.products.list();
    document.getElementById("product-count").textContent = `${products.length} product${products.length === 1 ? "" : "s"}`;
    body.innerHTML = products.length
      ? products
          .map(
            (p) => `
        <tr>
          <td><a class="row-link" href="/admin/html/product-edit.html?id=${p.id}">${p.name}</a></td>
          <td>${p.category_name || "—"}</td>
          <td>${window.formatMoney(p.price_cents, p.currency)}</td>
          <td>${p.stock_qty}</td>
          <td>${p.is_active ? '<span class="badge badge-paid">Active</span>' : '<span class="badge badge-cancelled">Hidden</span>'}</td>
          <td><a class="row-link" href="/admin/html/product-edit.html?id=${p.id}">Edit</a></td>
        </tr>`
          )
          .join("")
      : '<tr><td colspan="6">No products yet — add your first one.</td></tr>';
  } catch (e) {
    body.innerHTML = `<tr><td colspan="6" class="error-text">${e.message}</td></tr>`;
  }
}

document.addEventListener("admin:ready", loadProducts);
