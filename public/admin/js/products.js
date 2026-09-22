const LOW_STOCK_THRESHOLD = 10;
const PAGE_SIZE = 20;
const CATEGORY_PALETTE = ["#2f6690", "#4b7a52", "#b8862f", "#8a5c8f", "#3d5f8a", "#a9744f"];

const KPI_ICONS = {
  wallet: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7H4a1 1 0 0 0-1 1v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8a1 1 0 0 0-1-1Z"/><path d="M16 7V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2"/><circle cx="16" cy="13" r="1.5" fill="currentColor" stroke="none"/></svg>`,
  chart: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><rect x="7" y="13" width="3" height="5"/><rect x="12.5" y="9" width="3" height="9"/><rect x="18" y="6" width="3" height="12"/></svg>`,
  alert: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.3 3.9-8 14a1.5 1.5 0 0 0 1.3 2.2h16.8a1.5 1.5 0 0 0 1.3-2.2l-8-14a1.5 1.5 0 0 0-2.6 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
};

let allProducts = [];
let currentPage = 1;
let searchQuery = "";

function categoryColor(name) {
  if (!name) return "#9aa0a8";
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return CATEGORY_PALETTE[hash % CATEGORY_PALETTE.length];
}

function stockBarsHtml(qty, low) {
  const bucket = qty <= 0 ? 0 : qty < 5 ? 1 : qty < LOW_STOCK_THRESHOLD ? 2 : qty < 20 ? 3 : 4;
  const heights = [6, 8, 10, 12, 14];
  const bars = heights.map((h, i) => `<span class="${i < bucket ? "filled" : ""}" style="height:${h}px"></span>`).join("");
  return `<span class="stock-bars ${low ? "stock-bars--low" : "stock-bars--ok"}">${bars}</span>`;
}

function computeKpis(products) {
  const inventoryValueCents = products.reduce((sum, p) => sum + p.price_cents * p.stock_qty, 0);
  const avgStock = products.length ? products.reduce((sum, p) => sum + p.stock_qty, 0) / products.length : 0;
  const lowStockCount = products.filter((p) => p.stock_qty <= LOW_STOCK_THRESHOLD).length;
  return { inventoryValueCents, avgStock, lowStockCount };
}

function renderKpis(products) {
  const { inventoryValueCents, avgStock, lowStockCount } = computeKpis(products);
  document.getElementById("stat-grid").innerHTML = `
    <div class="stat-card">
      <div class="stat-card__head"><span class="stat-icon stat-icon--green">${KPI_ICONS.wallet}</span><span class="label">Inventory Value</span></div>
      <div class="value">${window.formatMoney(inventoryValueCents)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card__head"><span class="stat-icon stat-icon--blue">${KPI_ICONS.chart}</span><span class="label">Average Stock</span></div>
      <div class="value">${avgStock.toFixed(1)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card__head"><span class="stat-icon stat-icon--orange">${KPI_ICONS.alert}</span><span class="label">Low Stock Alerts</span></div>
      <div class="value">${lowStockCount}</div>
    </div>
  `;
}

function productRowHtml(p) {
  const low = p.stock_qty <= LOW_STOCK_THRESHOLD;
  return `
    <tr>
      <td><a class="row-link" href="/admin/html/product-edit.html?id=${p.id}">${p.name}</a></td>
      <td>${p.category_name ? `<span class="category-pill" style="background:${categoryColor(p.category_name)}">${p.category_name}</span>` : "—"}</td>
      <td>${window.formatMoney(p.price_cents, p.currency)}</td>
      <td>
        <div class="stock-cell">
          ${stockBarsHtml(p.stock_qty, low)}
          <span>${p.stock_qty}</span>
          ${low ? '<span class="low-stock-chip">Low stock</span>' : ""}
        </div>
      </td>
      <td>
        <button class="status-toggle ${p.is_active ? "is-active" : ""}" data-id="${p.id}" title="Toggle visibility in the shop">
          <span class="track"></span>
          <span class="status-label">${p.is_active ? "Active" : "Hidden"}</span>
        </button>
      </td>
      <td>
        <div class="row-actions">
          <a class="btn btn-outline" style="padding:6px 14px;" href="/admin/html/product-edit.html?id=${p.id}">Edit</a>
          <div class="row-more">
            <button class="row-more-btn" data-menu-id="${p.id}">&hellip;</button>
            <div class="row-more-menu" data-menu="${p.id}">
              <button class="danger" data-delete-id="${p.id}">Delete</button>
            </div>
          </div>
        </div>
      </td>
    </tr>`;
}

async function toggleActive(product) {
  await window.adminApi.products.update(product.id, {
    name: product.name,
    description: product.description || "",
    price_cents: product.price_cents,
    currency: product.currency || "INR",
    category_id: product.category_id || null,
    image_url: product.image_url || "",
    stock_qty: product.stock_qty,
    is_active: product.is_active ? 0 : 1,
  });
}

function closeAllMenus() {
  document.querySelectorAll(".row-more-menu.open").forEach((m) => m.classList.remove("open"));
}

function filteredProducts() {
  if (!searchQuery) return allProducts;
  const q = searchQuery.toLowerCase();
  return allProducts.filter((p) => p.name.toLowerCase().includes(q) || (p.category_name || "").toLowerCase().includes(q));
}

function attachRowHandlers(body, items) {
  body.querySelectorAll(".status-toggle").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.id);
      const product = items.find((p) => p.id === id);
      btn.disabled = true;
      try {
        await toggleActive(product);
        loadProducts();
      } catch (e) {
        btn.disabled = false;
        alert(e.message);
      }
    });
  });

  body.querySelectorAll(".row-more-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const menu = body.querySelector(`.row-more-menu[data-menu="${btn.dataset.menuId}"]`);
      const wasOpen = menu.classList.contains("open");
      closeAllMenus();
      if (!wasOpen) menu.classList.add("open");
    });
  });

  body.querySelectorAll("[data-delete-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.deleteId);
      if (!confirm("Delete this product? This cannot be undone.")) return;
      await window.adminApi.products.remove(id);
      loadProducts();
    });
  });
}

function renderPagination(totalPages, filteredCount) {
  const el = document.getElementById("products-pagination");
  if (filteredCount <= PAGE_SIZE) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = `
    <button class="btn btn-outline" id="page-prev" ${currentPage <= 1 ? "disabled" : ""}>&larr; Previous</button>
    <span class="helper-text">Page ${currentPage} of ${totalPages}</span>
    <button class="btn btn-outline" id="page-next" ${currentPage >= totalPages ? "disabled" : ""}>Next &rarr;</button>
  `;
  document.getElementById("page-prev").addEventListener("click", () => {
    currentPage--;
    renderTable();
  });
  document.getElementById("page-next").addEventListener("click", () => {
    currentPage++;
    renderTable();
  });
}

function renderTable() {
  const body = document.getElementById("products-body");
  const filtered = filteredProducts();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  document.getElementById("product-count").textContent = searchQuery
    ? `${filtered.length} of ${allProducts.length} products matching "${searchQuery}"`
    : `${allProducts.length} product${allProducts.length === 1 ? "" : "s"}`;

  body.innerHTML = pageItems.length
    ? pageItems.map(productRowHtml).join("")
    : `<tr><td colspan="6">${searchQuery ? "No products match your search." : "No products yet — add your first one."}</td></tr>`;

  attachRowHandlers(body, pageItems);
  renderPagination(totalPages, filtered.length);
}

async function loadProducts() {
  const body = document.getElementById("products-body");
  try {
    const { products } = await window.adminApi.products.list();
    allProducts = products;
    renderKpis(products);
    renderTable();
  } catch (e) {
    body.innerHTML = `<tr><td colspan="6" class="error-text">${e.message}</td></tr>`;
  }
}

document.addEventListener("click", closeAllMenus);
document.addEventListener("admin:ready", () => {
  loadProducts();
  document.getElementById("product-search").addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    currentPage = 1;
    renderTable();
  });
});
