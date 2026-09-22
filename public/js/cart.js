const ICONS = {
  bag: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12l1 13H5L6 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>`,
  receipt: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z"/><path d="M9 8h6M9 12h6"/></svg>`,
  trash: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/></svg>`,
  cartOutline: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="18" cy="21" r="1"/><path d="M2.5 3h2l2.4 12.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 8H6"/></svg>`,
};

function renderCart() {
  const container = document.getElementById("cart-contents");
  const items = window.cartStore.getItems();

  if (!items.length) {
    container.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty__icon">${ICONS.cartOutline}</div>
        <p>Your cart is empty.</p>
        <a href="/html/shop.html" class="btn btn-primary">Continue shopping</a>
      </div>`;
    return;
  }

  const subtotal = window.cartStore.subtotalCents();

  container.innerHTML = `
    <div class="cart-layout">
      <div class="cart-items-card">
        <div class="cart-items-card__header">
          <span class="cart-items-card__icon">${ICONS.bag}</span>
          <h2>${items.length} item${items.length === 1 ? "" : "s"} in your cart</h2>
        </div>
        ${items
          .map(
            (item) => `
        <div class="cart-item" data-id="${item.product_id}">
          <img class="cart-item__image" src="${item.image_url || "/images/placeholder-product.svg"}" alt="${item.name}" />
          <div class="cart-item__info">
            <span class="cart-item__name">${item.name}</span>
            <span class="cart-item__price">${window.formatMoney(item.price_cents)} each</span>
          </div>
          <div class="qty-stepper">
            <button type="button" class="qty-decrement" data-id="${item.product_id}" aria-label="Decrease quantity">&minus;</button>
            <input type="number" min="0" value="${item.quantity}" class="cart-row__qty" data-id="${item.product_id}" />
            <button type="button" class="qty-increment" data-id="${item.product_id}" aria-label="Increase quantity">&plus;</button>
          </div>
          <span class="cart-item__total">${window.formatMoney(item.price_cents * item.quantity)}</span>
          <button class="cart-item__remove" data-id="${item.product_id}" aria-label="Remove">${ICONS.trash}</button>
        </div>`
          )
          .join("")}
      </div>

      <aside class="cart-summary">
        <div class="cart-summary__header">
          <span class="cart-summary__icon">${ICONS.receipt}</span>
          <h2>Order Summary</h2>
        </div>
        <div class="cart-summary__body">
          <div class="cart-summary__row"><span>Subtotal</span><span>${window.formatMoney(subtotal)}</span></div>
          <p class="helper-text">Shipping and total are calculated at checkout.</p>
          <a href="/html/checkout.html" class="btn btn-primary btn-block">Proceed to checkout &rarr;</a>
          <a href="/html/shop.html" class="cart-summary__continue">&larr; Continue shopping</a>
        </div>
      </aside>
    </div>
  `;

  function updateQuantity(id, quantity) {
    window.cartStore.updateQuantity(id, Math.max(0, quantity));
    renderCart();
  }

  container.querySelectorAll(".cart-row__qty").forEach((input) => {
    input.addEventListener("change", (e) => {
      updateQuantity(Number(e.target.dataset.id), Number(e.target.value));
    });
  });
  container.querySelectorAll(".qty-decrement").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = Number(e.currentTarget.dataset.id);
      const item = items.find((i) => i.product_id === id);
      updateQuantity(id, item.quantity - 1);
    });
  });
  container.querySelectorAll(".qty-increment").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = Number(e.currentTarget.dataset.id);
      const item = items.find((i) => i.product_id === id);
      updateQuantity(id, item.quantity + 1);
    });
  });
  container.querySelectorAll(".cart-item__remove").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      window.cartStore.remove(Number(e.currentTarget.dataset.id));
      renderCart();
    });
  });
}

document.addEventListener("DOMContentLoaded", renderCart);
