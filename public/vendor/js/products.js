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
      <td><a class="row-link" href="/vendor/html/product-edit.html?id=${p.id}">${p.name}</a></td>
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
          <a class="btn btn-outline" style="padding:6px 14px;" href="/vendor/html/product-edit.html?id=${p.id}">Edit</a>
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
  await window.vendorApi.products.update(product.id, {
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
      await window.vendorApi.products.remove(id);
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
    const { products } = await window.vendorApi.products.list();
    allProducts = products;
    renderKpis(products);
    renderTable();
  } catch (e) {
    body.innerHTML = `<tr><td colspan="6" class="error-text">${e.message}</td></tr>`;
  }
}

// ---------- Export ----------

const CSV_COLUMNS = ["name", "slug", "category", "price", "currency", "stock_qty", "is_active", "image_url", "description"];

function csvField(value) {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function productsToCsv(products) {
  const header = CSV_COLUMNS.join(",");
  const rows = products.map((p) =>
    [
      p.name,
      p.slug,
      p.category_name || "",
      (p.price_cents / 100).toFixed(2),
      p.currency || "INR",
      p.stock_qty,
      p.is_active ? "Yes" : "No",
      p.image_url || "",
      p.description || "",
    ]
      .map(csvField)
      .join(",")
  );
  return [header, ...rows].join("\r\n");
}

function downloadCsv(filename, csvText) {
  // Prefix a BOM so Excel opens the file as UTF-8 instead of guessing wrong
  // on non-ASCII product names/descriptions.
  const blob = new Blob(["﻿" + csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportProducts() {
  const csv = productsToCsv(allProducts);
  const date = new Date().toISOString().slice(0, 10);
  downloadCsv(`products-${date}.csv`, csv);
}

// ---------- Import ----------

// Small hand-rolled CSV parser (quoted fields, embedded commas/newlines,
// doubled-quote escaping) — no library needed for a format this contained.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const s = text.replace(/^﻿/, ""); // strip a BOM if this file was itself exported from here (or Excel)

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseBoolean(value) {
  const v = (value || "").trim().toLowerCase();
  return !["no", "false", "0", "hidden", "inactive", ""].includes(v);
}

async function importProductsFromCsv(file) {
  const summaryEl = document.getElementById("import-summary");
  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) {
    summaryEl.style.display = "block";
    summaryEl.innerHTML = `<p class="error-text">That file doesn't have any data rows to import.</p>`;
    return;
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const colIndex = {};
  CSV_COLUMNS.forEach((col) => {
    const idx = header.indexOf(col);
    if (idx !== -1) colIndex[col] = idx;
  });
  if (colIndex.name === undefined || colIndex.price === undefined) {
    summaryEl.style.display = "block";
    summaryEl.innerHTML = `<p class="error-text">The file needs at least "name" and "price" columns. Use Export CSV once to see the expected format.</p>`;
    return;
  }

  const dataRows = rows.slice(1);
  if (!confirm(`Import ${dataRows.length} row${dataRows.length === 1 ? "" : "s"} from this file? Existing products with a matching slug will be updated; everything else is created new.`)) {
    return;
  }

  const cell = (row, col) => (colIndex[col] !== undefined ? (row[colIndex[col]] || "").trim() : "");

  const existingBySlug = new Map(allProducts.map((p) => [p.slug, p]));
  const { categories: existingCategories } = await window.vendorApi.categories.list();
  const categoryByName = new Map(existingCategories.map((c) => [c.name.toLowerCase(), c.id]));

  let created = 0, updated = 0;
  const errors = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNum = i + 2; // +1 for header, +1 for 1-indexing
    const name = cell(row, "name");
    const priceStr = cell(row, "price");

    if (!name) { errors.push(`Row ${rowNum}: missing name — skipped.`); continue; }
    const price = Number(priceStr);
    if (!priceStr || Number.isNaN(price)) { errors.push(`Row ${rowNum} ("${name}"): missing or invalid price — skipped.`); continue; }

    let categoryId = null;
    const categoryName = cell(row, "category");
    if (categoryName) {
      const key = categoryName.toLowerCase();
      if (categoryByName.has(key)) {
        categoryId = categoryByName.get(key);
      } else {
        try {
          const { id } = await window.vendorApi.categories.create({ name: categoryName });
          categoryByName.set(key, id);
          categoryId = id;
        } catch (e) {
          errors.push(`Row ${rowNum} ("${name}"): couldn't create category "${categoryName}" (${e.message}) — imported without a category.`);
        }
      }
    }

    const slug = cell(row, "slug") || slugify(name);
    const payload = {
      name,
      slug,
      description: cell(row, "description"),
      price_cents: Math.round(price * 100),
      currency: cell(row, "currency") || "INR",
      category_id: categoryId,
      image_url: cell(row, "image_url"),
      stock_qty: Number(cell(row, "stock_qty")) || 0,
      is_active: parseBoolean(cell(row, "is_active")) ? 1 : 0,
    };

    try {
      const existing = existingBySlug.get(slug);
      if (existing) {
        await window.vendorApi.products.update(existing.id, payload);
        updated++;
      } else {
        await window.vendorApi.products.create(payload);
        created++;
      }
    } catch (e) {
      errors.push(`Row ${rowNum} ("${name}"): ${e.message}`);
    }
  }

  summaryEl.style.display = "block";
  summaryEl.innerHTML = `
    <p><strong>${created}</strong> created, <strong>${updated}</strong> updated${errors.length ? `, <strong>${errors.length}</strong> row${errors.length === 1 ? "" : "s"} skipped` : ""}.</p>
    ${errors.length ? `<ul class="error-text" style="margin:8px 0 0; padding-left:20px;">${errors.map((e) => `<li>${e}</li>`).join("")}</ul>` : ""}
  `;
  loadProducts();
}

document.addEventListener("click", closeAllMenus);
document.addEventListener("vendor:ready", () => {
  loadProducts();
  document.getElementById("product-search").addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    currentPage = 1;
    renderTable();
  });

  document.getElementById("export-products-btn").addEventListener("click", exportProducts);

  const fileInput = document.getElementById("import-products-file");
  document.getElementById("import-products-btn").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    fileInput.value = ""; // allow re-selecting the same file next time
    if (!file) return;
    const btn = document.getElementById("import-products-btn");
    btn.disabled = true;
    btn.textContent = "Importing…";
    try {
      await importProductsFromCsv(file);
    } catch (e) {
      const summaryEl = document.getElementById("import-summary");
      summaryEl.style.display = "block";
      summaryEl.innerHTML = `<p class="error-text">Import failed: ${e.message}</p>`;
    } finally {
      btn.disabled = false;
      btn.textContent = "Import CSV";
    }
  });
});
