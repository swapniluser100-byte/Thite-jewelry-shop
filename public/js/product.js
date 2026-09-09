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

    container.innerHTML = `
      <div class="product-detail">
        <div class="product-detail__image">
          <img src="${product.image_url || "/images/placeholder-product.svg"}" alt="${product.name}" />
        </div>
        <div class="product-detail__info">
          ${product.category_name ? `<span class="product-card__category">${product.category_name}</span>` : ""}
          <h1>${product.name}</h1>
          <p class="product-detail__price">${window.formatMoney(product.price_cents, product.currency)}</p>
          <p class="product-detail__desc">${product.description || ""}</p>
          <p class="helper-text">${inStock ? `${product.stock_qty} in stock` : "Currently out of stock"}</p>
          <div class="product-detail__actions">
            <input type="number" id="qty" min="1" value="1" ${inStock ? "" : "disabled"} />
            <button class="btn btn-primary" id="add-to-cart" ${inStock ? "" : "disabled"}>
              ${inStock ? "Add to cart" : "Out of stock"}
            </button>
          </div>
          <p class="helper-text" id="add-confirm" style="display:none;color:var(--color-success);">Added to cart.</p>
        </div>
      </div>
    `;

    document.getElementById("add-to-cart")?.addEventListener("click", () => {
      const qty = Math.max(1, parseInt(document.getElementById("qty").value, 10) || 1);
      window.cartStore.add(product, qty);
      const confirm = document.getElementById("add-confirm");
      confirm.style.display = "block";
      setTimeout(() => (confirm.style.display = "none"), 2000);
    });
  } catch (e) {
    container.innerHTML = `<p class="empty-state">Couldn't load this product: ${e.message}</p>`;
  }
}

document.addEventListener("DOMContentLoaded", renderProduct);
