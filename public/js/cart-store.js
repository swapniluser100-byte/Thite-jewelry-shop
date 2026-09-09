// Cart persisted in localStorage so it survives page navigation/refresh on
// the customer's own browser. Shape: [{ product_id, name, price_cents, image_url, quantity }]

const CART_KEY = "jewelry_shop_cart";

function readCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCart(items) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {
    /* private browsing / storage disabled: cart just won't persist */
  }
  document.dispatchEvent(new CustomEvent("cart:updated", { detail: items }));
}

const cartStore = {
  getItems: readCart,
  count() {
    return readCart().reduce((sum, i) => sum + i.quantity, 0);
  },
  subtotalCents() {
    return readCart().reduce((sum, i) => sum + i.price_cents * i.quantity, 0);
  },
  add(product, quantity = 1) {
    const items = readCart();
    const existing = items.find((i) => i.product_id === product.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      items.push({
        product_id: product.id,
        name: product.name,
        price_cents: product.price_cents,
        image_url: product.image_url,
        quantity,
      });
    }
    writeCart(items);
  },
  updateQuantity(productId, quantity) {
    let items = readCart();
    if (quantity <= 0) {
      items = items.filter((i) => i.product_id !== productId);
    } else {
      const item = items.find((i) => i.product_id === productId);
      if (item) item.quantity = quantity;
    }
    writeCart(items);
  },
  remove(productId) {
    writeCart(readCart().filter((i) => i.product_id !== productId));
  },
  clear() {
    writeCart([]);
  },
};

window.cartStore = cartStore;
