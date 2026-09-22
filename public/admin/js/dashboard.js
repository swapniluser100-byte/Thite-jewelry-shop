const STAT_ICONS = {
  mail: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`,
  alert: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.3 3.9-8 14a1.5 1.5 0 0 0 1.3 2.2h16.8a1.5 1.5 0 0 0 1.3-2.2l-8-14a1.5 1.5 0 0 0-2.6 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
  check: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>`,
  bag: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12l1 13H5L6 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>`,
  people: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 15c2.5.3 4.5 2 4.5 5"/></svg>`,
  edit: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/></svg>`,
};

const STATUS_ICONS = {
  pending_payment: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m10.6 4-7.6 13a1 1 0 0 0 .9 1.5h14.2a1 1 0 0 0 .9-1.5l-7.6-13a1 1 0 0 0-1.8 0Z"/><path d="M12 9v4"/><path d="M12 16h.01"/></svg>`,
  payment_submitted: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/></svg>`,
  paid: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>`,
  processing: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/></svg>`,
  shipped: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>`,
  delivered: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>`,
  cancelled: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/></svg>`,
  refunded: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/></svg>`,
};

function statusBadge(status) {
  const icon = STATUS_ICONS[status] || "";
  return `<span class="badge badge-${status}">${icon ? `<span class="badge-icon">${icon}</span>` : ""}${status.replace(/_/g, " ")}</span>`;
}

// D1's datetime('now') stores UTC as "YYYY-MM-DD HH:MM:SS" with no timezone marker.
function formatDateTime(sqlDate, opts) {
  if (!sqlDate) return "—";
  const d = new Date(sqlDate.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return sqlDate;
  return d.toLocaleString("en-IN", opts);
}

async function renderDashboard() {
  try {
    const [{ orders }, { customers }] = await Promise.all([
      window.adminApi.orders.list(),
      window.adminApi.customers.list(),
    ]);

    // The vendor can turn off Admin Console product access from the Vendor
    // Portal — when they have, this 403s. That's expected, not a dashboard
    // error, so it just drops the Products stat card instead of failing
    // the whole page.
    let productsCount = null;
    try {
      const { products } = await window.adminApi.products.list();
      productsCount = products.length;
    } catch {
      productsCount = null;
    }

    const revenueCents = orders
      .filter((o) => !["cancelled", "refunded", "pending_payment"].includes(o.status))
      .reduce((sum, o) => sum + o.total_cents, 0);
    const awaitingAction = orders.filter((o) => ["payment_submitted", "paid", "processing"].includes(o.status)).length;

    document.getElementById("last-updated").textContent = `Last updated: ${new Date().toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`;

    document.getElementById("stat-grid").innerHTML = `
      <div class="stat-card">
        <div class="stat-card__head"><span class="stat-icon stat-icon--orange">${STAT_ICONS.mail}</span><span class="label">Total Orders</span></div>
        <div class="value">${orders.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__head"><span class="stat-icon stat-icon--red">${STAT_ICONS.alert}</span><span class="label">Needs Attention</span></div>
        <div class="value">${awaitingAction}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__head"><span class="stat-icon stat-icon--green">${STAT_ICONS.check}</span><span class="label">Revenue (Paid+)</span></div>
        <div class="value">${window.formatMoney(revenueCents)}</div>
      </div>
      ${productsCount === null ? "" : `
      <div class="stat-card">
        <div class="stat-card__head"><span class="stat-icon stat-icon--blue">${STAT_ICONS.bag}</span><span class="label">Products</span></div>
        <div class="value">${productsCount}</div>
      </div>`}
      <div class="stat-card">
        <div class="stat-card__head"><span class="stat-icon stat-icon--purple">${STAT_ICONS.people}</span><span class="label">Customers</span></div>
        <div class="value">${customers.length}</div>
      </div>
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
          <td>${statusBadge(o.status)}</td>
          <td>${window.formatMoney(o.total_cents)}</td>
          <td>${formatDateTime(o.created_at, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
          <td><a class="icon-btn" href="/admin/html/order-detail.html?id=${o.id}" title="Open order">${STAT_ICONS.edit}</a></td>
        </tr>`
          )
          .join("")
      : '<tr><td colspan="6">No orders yet.</td></tr>';
  } catch (e) {
    document.getElementById("stat-grid").innerHTML = `<p class="error-text">Couldn't load dashboard: ${e.message}</p>`;
  }
}

document.addEventListener("admin:ready", renderDashboard);
