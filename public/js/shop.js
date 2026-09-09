const params = new URLSearchParams(location.search);

async function loadCategories() {
  const list = document.getElementById("category-list");
  try {
    const { categories } = await window.api.categories.list();
    const active = params.get("category");
    list.innerHTML =
      `<li><a href="/html/shop.html" class="${!active ? "active" : ""}">All</a></li>` +
      categories
        .map(
          (c) =>
            `<li><a href="/html/shop.html?category=${c.slug}" class="${active === c.slug ? "active" : ""}">${c.name}</a></li>`
        )
        .join("");
  } catch {
    /* categories are a nice-to-have filter; ignore failures */
  }
}

async function loadProducts() {
  const grid = document.getElementById("product-grid");
  const title = document.getElementById("shop-title");
  const category = params.get("category");
  const q = params.get("q") || document.getElementById("search-input").value;
  if (category) title.textContent = category.replace(/-/g, " ");

  try {
    const query = {};
    if (category) query.category = category;
    if (q) query.q = q;
    const { products } = await window.api.products.list(query);
    if (!products.length) {
      grid.innerHTML = '<p class="empty-state">No products found.</p>';
      return;
    }
    grid.innerHTML = products
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

document.addEventListener("DOMContentLoaded", () => {
  loadCategories();
  loadProducts();
  let debounce;
  document.getElementById("search-input").addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(loadProducts, 300);
  });
});
