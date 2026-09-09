// Same idea as the storefront's api.js, but for admin-only endpoints. Kept
// separate on purpose so the admin bundle never needs to ship storefront code.

const API_BASE = "/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    const err = new Error(data.error || `Request failed (${response.status})`);
    err.status = response.status;
    throw err;
  }
  return data;
}

const adminApi = {
  login: (email, password) => request("/admin/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => request("/admin/logout", { method: "POST" }),
  me: () => request("/admin/me"),

  products: {
    list: () => request("/products?admin=1"),
    get: (id) => request(`/products/${id}`),
    create: (payload) => request("/products", { method: "POST", body: JSON.stringify(payload) }),
    update: (id, payload) => request(`/products/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
    remove: (id) => request(`/products/${id}`, { method: "DELETE" }),
  },
  categories: {
    list: () => request("/categories"),
    create: (payload) => request("/categories", { method: "POST", body: JSON.stringify(payload) }),
  },
  orders: {
    list: (status) => request(`/orders${status ? `?status=${status}` : ""}`),
    get: (id) => request(`/orders/${id}`),
    updateStatus: (id, payload) => request(`/orders/${id}/status`, { method: "PUT", body: JSON.stringify(payload) }),
  },
  customers: {
    list: () => request("/customers"),
  },
  settings: {
    get: () => request("/settings"),
    update: (payload) => request("/settings", { method: "PUT", body: JSON.stringify(payload) }),
  },
};

window.adminApi = adminApi;

function formatMoney(cents, currency = "INR") {
  const value = (cents || 0) / 100;
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}
window.formatMoney = formatMoney;
