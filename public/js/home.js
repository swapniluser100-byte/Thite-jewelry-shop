async function renderFeatured() {
  const grid = document.getElementById("featured-grid");
  try {
    const { products } = await window.api.products.list();
    if (!products.length) {
      grid.innerHTML = '<p class="empty-state">No products yet — add some from the Admin Console.</p>';
      return;
    }
    grid.innerHTML = products
      .slice(0, 8)
      .map(
        (p) => `
      <a class="product-card" href="/html/product.html?slug=${encodeURIComponent(p.slug)}">
        <div class="product-card__image">
          <img src="${p.image_url || "/images/placeholder-product.svg"}" alt="${p.name}" loading="lazy" />
        </div>
        <div class="product-card__body">
          ${p.category_name ? `<span class="product-card__category">${p.category_name}</span>` : ""}
          <span class="product-card__name">${p.name}</span>
          <span class="product-card__price">${window.formatMoney(p.price_cents, p.currency)}</span>
        </div>
      </a>`
      )
      .join("");
  } catch (e) {
    grid.innerHTML = `<p class="empty-state">Couldn't load products: ${e.message}</p>`;
  }
}

document.addEventListener("DOMContentLoaded", renderFeatured);
