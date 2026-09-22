const ICONS = {
  check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/></svg>`,
  truck: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="7" width="14" height="10"/><path d="M15 10h4l3 3v4h-7z"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></svg>`,
};

async function renderProduct() {
  const container = document.getElementById("product-detail");
  const slug = new URLSearchParams(location.search).get("slug");
  if (!slug) {
    container.innerHTML = '<p class="empty-state">Product not specified.</p>';
    return;
  }
  try {
    const { product } = await window.api.products.get(slug);
    document.title = `${product.name} — Jewelry Shop`;
    const inStock = product.stock_qty > 0;
    const lowStock = inStock && product.stock_qty <= 5;
    const stockClass = !inStock ? "out" : lowStock ? "low" : "in";
    const stockLabel = !inStock ? "Currently out of stock" : lowStock ? `Only ${product.stock_qty} left` : `${product.stock_qty} in stock`;

    container.innerHTML = `
      <div class="product-detail">
        <div class="product-detail__image">
          <img src="${product.image_url || "/images/placeholder-product.svg"}" alt="${product.name}" />
        </div>
        <div class="product-detail__info">
          <p class="product-detail__breadcrumb">
            <a href="/html/shop.html">Shop All</a>
            ${product.category_name ? `<span>/</span><a href="/html/shop.html?category=${product.category_slug}">${product.category_name}</a>` : ""}
          </p>
          <h1>${product.name}</h1>
          <p class="product-detail__price">${window.formatMoney(product.price_cents, product.currency)}</p>
          ${product.description ? `<p class="product-detail__desc">${product.description}</p>` : ""}
          <span class="product-detail__stock product-detail__stock--${stockClass}"><span class="dot"></span>${stockLabel}</span>
          <div class="product-detail__actions">
            <div class="qty-stepper">
              <button type="button" id="qty-decrement" ${inStock ? "" : "disabled"} aria-label="Decrease quantity">&minus;</button>
              <input type="number" id="qty" min="1" value="1" ${inStock ? "" : "disabled"} />
              <button type="button" id="qty-increment" ${inStock ? "" : "disabled"} aria-label="Increase quantity">&plus;</button>
            </div>
            <button class="btn btn-primary" id="add-to-cart" ${inStock ? "" : "disabled"}>
              ${inStock ? "Add to cart" : "Out of stock"}
            </button>
          </div>
          <p class="product-detail__confirm" id="add-confirm">${ICONS.check} Added to cart</p>
          <div class="product-detail__shipping">
            ${ICONS.truck}
            <span>Free shipping on orders over &#8377;2,000 &middot; Pay securely via UPI at checkout</span>
          </div>
        </div>
      </div>
    `;

    function currentQty() {
      return Math.max(1, parseInt(document.getElementById("qty").value, 10) || 1);
    }
    document.getElementById("qty-decrement")?.addEventListener("click", () => {
      document.getElementById("qty").value = Math.max(1, currentQty() - 1);
    });
    document.getElementById("qty-increment")?.addEventListener("click", () => {
      document.getElementById("qty").value = currentQty() + 1;
    });

    document.getElementById("add-to-cart")?.addEventListener("click", () => {
      window.cartStore.add(product, currentQty());
      const confirm = document.getElementById("add-confirm");
      confirm.style.display = "inline-flex";
      setTimeout(() => (confirm.style.display = "none"), 2000);
    });
  } catch (e) {
    container.innerHTML = `<p class="empty-state">Couldn't load this product: ${e.message}</p>`;
  }
}

document.addEventListener("DOMContentLoaded", renderProduct);
