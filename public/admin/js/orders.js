const STAT_ICONS = {
  mail: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`,
  alert: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.3 3.9-8 14a1.5 1.5 0 0 0 1.3 2.2h16.8a1.5 1.5 0 0 0 1.3-2.2l-8-14a1.5 1.5 0 0 0-2.6 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
  check: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>`,
  chart: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><rect x="7" y="13" width="3" height="5"/><rect x="12.5" y="9" width="3" height="9"/><rect x="18" y="6" width="3" height="12"/></svg>`,
};

const PAGE_SIZE = 20;

let allOrders = [];
let statusFilter = "";
let customerFilter = "";
let searchQuery = "";
let currentPage = 1;

function computeStats(orders) {
  const total = orders.length;
  const needsAttention = orders.filter((o) => ["payment_submitted", "paid", "processing"].includes(o.status)).length;
  const revenueCents = orders
    .filter((o) => !["cancelled", "refunded", "pending_payment"].includes(o.status))
    .reduce((sum, o) => sum + o.total_cents, 0);
  const avgOrderCents = total ? Math.round(orders.reduce((sum, o) => sum + o.total_cents, 0) / total) : 0;
  return { total, needsAttention, revenueCents, avgOrderCents };
}

function renderStats(orders) {
  const { total, needsAttention, revenueCents, avgOrderCents } = computeStats(orders);
  document.getElementById("stat-grid").innerHTML = `
    <div class="stat-card">
      <div class="stat-card__head"><span class="stat-icon stat-icon--orange">${STAT_ICONS.mail}</span><span class="label">Total Orders</span></div>
      <div class="value">${total}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card__head"><span class="stat-icon stat-icon--red">${STAT_ICONS.alert}</span><span class="label">Needs Attention</span></div>
      <div class="value">${needsAttention}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card__head"><span class="stat-icon stat-icon--green">${STAT_ICONS.check}</span><span class="label">Revenue (Paid+)</span></div>
      <div class="value">${window.formatMoney(revenueCents)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card__head"><span class="stat-icon stat-icon--blue">${STAT_ICONS.chart}</span><span class="label">Avg. Order Value</span></div>
      <div class="value">${window.formatMoney(avgOrderCents)}</div>
    </div>
  `;
}

function populateCustomerFilter(orders) {
  const select = document.getElementById("customer-filter");
  const previous = select.value;
  const uniqueCustomers = [...new Map(orders.map((o) => [o.customer_email, o.customer_name])).entries()].sort((a, b) =>
    a[1].localeCompare(b[1])
  );
  select.innerHTML =
    '<option value="">All customers</option>' +
    uniqueCustomers.map(([email, name]) => `<option value="${email}">${name}</option>`).join("");
  if (uniqueCustomers.some(([email]) => email === previous)) select.value = previous;
}

function filteredOrders() {
  return allOrders.filter((o) => {
    if (statusFilter && o.status !== statusFilter) return false;
    if (customerFilter && o.customer_email !== customerFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const haystack = `${o.order_number} ${o.customer_name} ${o.customer_email}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

function renderPagination(totalPages, filteredCount) {
  const el = document.getElementById("orders-pagination");
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
  const body = document.getElementById("orders-body");
  const filtered = filteredOrders();
  const isFiltered = Boolean(statusFilter || customerFilter || searchQuery);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  document.getElementById("order-count").textContent = isFiltered
    ? `${filtered.length} of ${allOrders.length} orders`
    : `${allOrders.length} order${allOrders.length === 1 ? "" : "s"}`;

  body.innerHTML = pageItems.length
    ? pageItems
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
    : `<tr><td colspan="5">${isFiltered ? "No orders match your filters." : "No orders found."}</td></tr>`;

  renderPagination(totalPages, filtered.length);
}

async function loadOrders() {
  const body = document.getElementById("orders-body");
  try {
    const { orders } = await window.adminApi.orders.list();
    allOrders = orders;
    document.getElementById("last-updated").textContent = `Last updated: ${new Date().toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`;
    renderStats(orders);
    populateCustomerFilter(orders);
    renderTable();
  } catch (e) {
    body.innerHTML = `<tr><td colspan="5" class="error-text">${e.message}</td></tr>`;
  }
}

document.addEventListener("admin:ready", () => {
  loadOrders();
  document.getElementById("status-filter").addEventListener("change", (e) => {
    statusFilter = e.target.value;
    currentPage = 1;
    renderTable();
  });
  document.getElementById("customer-filter").addEventListener("change", (e) => {
    customerFilter = e.target.value;
    currentPage = 1;
    renderTable();
  });
  document.getElementById("order-search").addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    currentPage = 1;
    renderTable();
  });
});
