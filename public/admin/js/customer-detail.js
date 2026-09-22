const customerId = new URLSearchParams(location.search).get("id");

const ICONS = {
  home: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>`,
  building: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 21v-4h6v4"/><path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01"/></svg>`,
  pin: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
  check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/></svg>`,
  dot: `<svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="currentColor"/></svg>`,
};

const PAID_STATUSES = ["paid", "processing", "shipped", "delivered"];
const PENDING_STATUSES = ["pending_payment", "payment_submitted"];

function paymentStatusBadge(status) {
  if (PAID_STATUSES.includes(status)) {
    return `<span class="payment-status payment-status--paid">${ICONS.check}Paid</span>`;
  }
  if (PENDING_STATUSES.includes(status)) {
    return `<span class="payment-status payment-status--pending">${ICONS.dot}Pending</span>`;
  }
  return `<span class="payment-status payment-status--neutral">—</span>`;
}

const AVATAR_PALETTE = ["#a9744f", "#2f6690", "#4b7a52", "#8a5c8f", "#b8862f", "#3d5f8a"];

function initials(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts.slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

function avatarColor(seed) {
  let hash = 0;
  for (const ch of String(seed)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

// D1's datetime('now') stores UTC as "YYYY-MM-DD HH:MM:SS" with no timezone marker.
function formatDateTime(sqlDate, opts) {
  if (!sqlDate) return "—";
  const d = new Date(sqlDate.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return sqlDate;
  return d.toLocaleString("en-IN", opts);
}

function renderView(customer, orders, summary) {
  const content = document.getElementById("customer-content");
  const cityLine = [customer.city, customer.state, customer.postal_code].filter(Boolean).join(", ");
  const paidLabel =
    summary.total_spent_cents === 0
      ? "No orders"
      : summary.total_paid_cents >= summary.total_spent_cents
      ? "Full paid"
      : summary.total_paid_cents > 0
      ? "Partially paid"
      : "Unpaid";

  content.innerHTML = `
    <div class="card customer-card">
      <div class="customer-card__header">
        <div class="customer-identity">
          <div class="customer-avatar" style="background:${avatarColor(customer.id)}">${initials(customer.name)}</div>
          <div>
            <h2 class="customer-name">${customer.name}</h2>
            <p class="customer-contact">${customer.email}${customer.phone ? " · " + customer.phone : ""}</p>
          </div>
        </div>
        <button class="btn btn-outline" id="edit-toggle">Edit</button>
      </div>
      <div class="customer-meta">
        <div class="meta-row">${ICONS.home}<span>${customer.address || "—"}</span></div>
        <div class="meta-row">${ICONS.building}<span>${cityLine || "—"}</span></div>
        <div class="meta-row">${ICONS.pin}<span>${customer.country || "—"}</span></div>
      </div>
      <p class="helper-text customer-since">Customer since ${formatDateTime(customer.created_at, { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
    </div>

    <div class="card">
      <h3 style="margin-top:0;">Financial Overview</h3>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="label">Total Orders</div>
          <div class="value">${summary.total_orders}</div>
        </div>
        <div class="stat-card">
          <div class="label">Total Amount Spent</div>
          <div class="value">${window.formatMoney(summary.total_spent_cents)}</div>
        </div>
        <div class="stat-card">
          <div class="label">Total Paid</div>
          <div class="value">${window.formatMoney(summary.total_paid_cents)}</div>
          <div class="sub sub--success">${ICONS.check}${paidLabel}</div>
        </div>
        <div class="stat-card">
          <div class="label">Pending Payments</div>
          <div class="value">${window.formatMoney(summary.pending_cents)}</div>
          <div class="sub ${summary.pending_cents > 0 ? "sub--warn" : ""}">${summary.pending_cents > 0 ? "Awaiting payment" : "None"}</div>
        </div>
        <div class="stat-card">
          <div class="label">Avg. Order Value</div>
          <div class="value">${window.formatMoney(summary.avg_order_cents)}</div>
          <div class="sub">${summary.last_order_at ? "Last order " + formatDateTime(summary.last_order_at, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h3 style="margin-top:0;">Orders</h3>
      <table>
        <thead><tr><th>Order ID</th><th>Status</th><th>Total</th><th>Placed</th><th>Payment Status</th></tr></thead>
        <tbody>
          ${
            orders.length
              ? orders
                  .map(
                    (o) => `
            <tr>
              <td><a class="order-id-link" href="/admin/html/order-detail.html?id=${o.id}">${o.order_number}</a></td>
              <td><span class="badge badge-${o.status}">${o.status.replace(/_/g, " ")}</span></td>
              <td>${window.formatMoney(o.total_cents)}</td>
              <td>${formatDateTime(o.created_at, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
              <td>${paymentStatusBadge(o.status)}</td>
            </tr>`
                  )
                  .join("")
              : '<tr><td colspan="5">No orders yet.</td></tr>'
          }
        </tbody>
      </table>
    </div>
  `;

  document.getElementById("edit-toggle").addEventListener("click", () => renderEditForm(customer));
}

function customerFormFieldsHtml(customer, prefix) {
  return `
    <div class="field-row">
      <div class="field">
        <label for="${prefix}-name">Name</label>
        <input id="${prefix}-name" required value="${customer.name || ""}" />
      </div>
      <div class="field">
        <label for="${prefix}-email">Email</label>
        <input id="${prefix}-email" type="email" required value="${customer.email || ""}" />
      </div>
    </div>
    <div class="field">
      <label for="${prefix}-phone">Phone</label>
      <input id="${prefix}-phone" value="${customer.phone || ""}" />
    </div>
    <div class="field">
      <label for="${prefix}-address">Address</label>
      <input id="${prefix}-address" value="${customer.address || ""}" />
    </div>
    <div class="field-row">
      <div class="field">
        <label for="${prefix}-city">City</label>
        <input id="${prefix}-city" value="${customer.city || ""}" />
      </div>
      <div class="field">
        <label for="${prefix}-state">State</label>
        <input id="${prefix}-state" value="${customer.state || ""}" />
      </div>
      <div class="field">
        <label for="${prefix}-postal">Postal code</label>
        <input id="${prefix}-postal" value="${customer.postal_code || ""}" />
      </div>
    </div>
    <div class="field">
      <label for="${prefix}-country">Country</label>
      <input id="${prefix}-country" value="${customer.country || ""}" />
    </div>
  `;
}

function readCustomerForm(prefix) {
  return {
    name: document.getElementById(`${prefix}-name`).value,
    email: document.getElementById(`${prefix}-email`).value,
    phone: document.getElementById(`${prefix}-phone`).value,
    address: document.getElementById(`${prefix}-address`).value,
    city: document.getElementById(`${prefix}-city`).value,
    state: document.getElementById(`${prefix}-state`).value,
    postal_code: document.getElementById(`${prefix}-postal`).value,
    country: document.getElementById(`${prefix}-country`).value,
  };
}

function renderEditForm(customer) {
  const content = document.getElementById("customer-content");
  const card = content.querySelector(".customer-card");

  card.innerHTML = `
    <h3 style="margin-top:0;">Edit customer</h3>
    <form id="customer-edit-form">
      ${customerFormFieldsHtml(customer, "edit")}
      <p class="error-text" id="customer-edit-error" style="display:none;"></p>
      <div style="display:flex; gap:12px;">
        <button type="submit" class="btn btn-primary">Save</button>
        <button type="button" class="btn btn-outline" id="edit-cancel">Cancel</button>
      </div>
    </form>
  `;

  document.getElementById("edit-cancel").addEventListener("click", loadCustomer);
  document.getElementById("customer-edit-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("customer-edit-error");
    errorEl.style.display = "none";
    try {
      await window.adminApi.customers.update(customerId, readCustomerForm("edit"));
      loadCustomer();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = "block";
    }
  });
}

function renderCreateForm() {
  document.getElementById("customer-title").textContent = "New Customer";
  const content = document.getElementById("customer-content");
  content.innerHTML = `
    <div class="card customer-card" style="max-width:640px;">
      <h3 style="margin-top:0;">New customer</h3>
      <form id="customer-create-form">
        ${customerFormFieldsHtml({}, "create")}
        <p class="error-text" id="customer-create-error" style="display:none;"></p>
        <div style="display:flex; gap:12px;">
          <button type="submit" class="btn btn-primary">Create customer</button>
          <a href="/admin/html/customers.html" class="btn btn-outline">Cancel</a>
        </div>
      </form>
    </div>
  `;

  document.getElementById("customer-create-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("customer-create-error");
    errorEl.style.display = "none";
    try {
      const { id } = await window.adminApi.customers.create(readCustomerForm("create"));
      location.href = `/admin/html/customer-detail.html?id=${id}`;
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = "block";
    }
  });
}

async function loadCustomer() {
  const content = document.getElementById("customer-content");
  try {
    const { customer, orders, summary } = await window.adminApi.customers.get(customerId);
    document.getElementById("customer-title").textContent = customer.name;
    renderView(customer, orders, summary);
  } catch (e) {
    content.innerHTML = `<p class="error-text">${e.message}</p>`;
  }
}

document.addEventListener("admin:ready", () => {
  if (customerId) {
    loadCustomer();
  } else {
    renderCreateForm();
  }
});
