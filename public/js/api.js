// Tiny fetch wrapper shared by every storefront page. All API routes live
// under /api/* thanks to Cloudflare Pages Functions, so relative URLs work
// both locally (wrangler pages dev) and once deployed.

const API_BASE = "/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

const api = {
  products: {
    list: (params = {}) => request(`/products?${new URLSearchParams(params)}`),
    get: (idOrSlug) => request(`/products/${idOrSlug}`),
  },
  categories: {
    list: () => request("/categories"),
  },
  settings: {
    get: () => request("/settings"),
  },
  orders: {
    create: (payload) => request("/orders", { method: "POST", body: JSON.stringify(payload) }),
    get: (idOrNumber) => request(`/orders/${idOrNumber}`),
    submitPayment: (idOrNumber, payment_reference) =>
      request(`/orders/${idOrNumber}`, { method: "PATCH", body: JSON.stringify({ payment_reference }) }),
  },
};

window.api = api;
