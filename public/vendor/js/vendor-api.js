// Same idea as the admin console's admin-api.js, but scoped to the vendor
// portal's own session endpoints plus the catalog/settings routes the
// vendor owns. Kept separate so the vendor bundle never needs order/customer
// code the vendor role can't call anyway.

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

const vendorApi = {
  login: (email, password) => request("/vendor/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => request("/vendor/logout", { method: "POST" }),
  me: () => request("/vendor/me"),

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
  settings: {
    get: () => request("/settings"),
    update: (payload) => request("/settings", { method: "PUT", body: JSON.stringify(payload) }),
  },
};

window.vendorApi = vendorApi;

function formatMoney(cents, currency = "INR") {
  const value = (cents || 0) / 100;
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}
window.formatMoney = formatMoney;
