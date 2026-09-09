function renderCart() {
  const container = document.getElementById("cart-contents");
  const items = window.cartStore.getItems();

  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Your cart is empty.</p>
        <a href="/html/shop.html" class="btn btn-outline">Continue shopping</a>
      </div>`;
    return;
  }

  const subtotal = window.cartStore.subtotalCents();

  container.innerHTML = `
    <div class="cart-list">
      ${items
        .map(
          (item) => `
        <div class="cart-row" data-id="${item.product_id}">
          <img src="${item.image_url || "/images/placeholder-product.svg"}" alt="${item.name}" />
          <div class="cart-row__info">
            <span class="cart-row__name">${item.name}</span>
            <span class="helper-text">${window.formatMoney(item.price_cents)} each</span>
          </div>
          <input type="number" min="0" value="${item.quantity}" class="cart-row__qty" data-id="${item.product_id}" />
          <span class="cart-row__total">${window.formatMoney(item.price_cents * item.quantity)}</span>
          <button class="cart-row__remove" data-id="${item.product_id}" aria-label="Remove">&times;</button>
        </div>`
        )
        .join("")}
    </div>
    <div class="cart-summary">
      <div class="cart-summary__row"><span>Subtotal</span><span>${window.formatMoney(subtotal)}</span></div>
      <p class="helper-text">Shipping and total are calculated at checkout.</p>
      <a href="/html/checkout.html" class="btn btn-primary btn-block">Proceed to checkout</a>
    </div>
  `;

  container.querySelectorAll(".cart-row__qty").forEach((input) => {
    input.addEventListener("change", (e) => {
      window.cartStore.updateQuantity(Number(e.target.dataset.id), Number(e.target.value));
      renderCart();
    });
  });
  container.querySelectorAll(".cart-row__remove").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      window.cartStore.remove(Number(e.target.dataset.id));
      renderCart();
    });
  });
}

document.addEventListener("DOMContentLoaded", renderCart);
