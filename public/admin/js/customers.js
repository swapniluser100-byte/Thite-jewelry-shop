const KPI_ICONS = {
  people: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 15c2.5.3 4.5 2 4.5 5"/></svg>`,
  box: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>`,
  refresh: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M3 16v4h4"/><path d="M21 8V4h-4"/></svg>`,
  chart: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><rect x="7" y="13" width="3" height="5"/><rect x="12.5" y="9" width="3" height="9"/><rect x="18" y="6" width="3" height="12"/></svg>`,
};

function renderKpis(customers) {
  const totalCustomers = customers.length;
  const totalOrders = customers.reduce((sum, c) => sum + c.order_count, 0);
  const lifetimeRevenueCents = customers.reduce((sum, c) => sum + c.lifetime_cents, 0);
  const avgSpendCents = totalCustomers ? Math.round(lifetimeRevenueCents / totalCustomers) : 0;

  document.getElementById("stat-grid").innerHTML = `
    <div class="stat-card">
      <div class="stat-card__head"><span class="stat-icon stat-icon--blue">${KPI_ICONS.people}</span><span class="label">Total Customers</span></div>
      <div class="value">${totalCustomers}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card__head"><span class="stat-icon stat-icon--orange">${KPI_ICONS.box}</span><span class="label">Total Orders</span></div>
      <div class="value">${totalOrders}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card__head"><span class="stat-icon stat-icon--green">${KPI_ICONS.refresh}</span><span class="label">Lifetime Revenue</span></div>
      <div class="value">${window.formatMoney(lifetimeRevenueCents)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card__head"><span class="stat-icon stat-icon--blue">${KPI_ICONS.chart}</span><span class="label">Avg. Spend per Customer</span></div>
      <div class="value">${window.formatMoney(avgSpendCents)}</div>
    </div>
  `;
}

let allCustomers = [];
let searchQuery = "";

function filteredCustomers() {
  if (!searchQuery) return allCustomers;
  const q = searchQuery.toLowerCase();
  return allCustomers.filter((c) =>
    `${c.name} ${c.email} ${c.phone || ""}`.toLowerCase().includes(q)
  );
}

function renderTable() {
  const body = document.getElementById("customers-body");
  const filtered = filteredCustomers();

  document.getElementById("customer-count").textContent = searchQuery
    ? `${filtered.length} of ${allCustomers.length} customers`
    : `${allCustomers.length} customer${allCustomers.length === 1 ? "" : "s"}`;

  body.innerHTML = filtered.length
    ? filtered
        .map(
          (c) => `
      <tr>
        <td><strong>${c.name}</strong></td>
        <td>${c.email}</td>
        <td>${c.phone || "—"}</td>
        <td>${c.order_count}</td>
        <td>${window.formatMoney(c.lifetime_cents)}</td>
        <td><a class="btn btn-outline" style="padding:6px 14px;" href="/admin/html/customer-detail.html?id=${c.id}">Edit</a></td>
      </tr>`
        )
        .join("")
    : `<tr><td colspan="6">${searchQuery ? "No customers match your search." : "No customers yet."}</td></tr>`;
}

async function loadCustomers() {
  const body = document.getElementById("customers-body");
  try {
    const { customers } = await window.adminApi.customers.list();
    allCustomers = customers;
    document.getElementById("last-updated").textContent = `Last updated: ${new Date().toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`;
    renderKpis(customers);
    renderTable();
  } catch (e) {
    body.innerHTML = `<tr><td colspan="6" class="error-text">${e.message}</td></tr>`;
  }
}

document.addEventListener("admin:ready", () => {
  loadCustomers();
  document.getElementById("customer-search").addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    renderTable();
  });
});
