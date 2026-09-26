const ICONS = {
  check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/></svg>`,
  truck: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="7" width="14" height="10"/><path d="M15 10h4l3 3v4h-7z"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></svg>`,
};

// Best-effort label -> swatch color, covering common jewelry metal/gem
// names. Anything unrecognized still shows as a labeled swatch, just with a
// neutral fill instead of a guessed one — the text label is always shown
// too, so the swatch is a visual aid, never the only way to tell colors apart.
const COLOR_SWATCHES = {
  gold: "#d4af37", "rose gold": "#b76e79", silver: "#c0c0c0", platinum: "#c9c9c9",
  black: "#2b2320", white: "#f5f0e8", ivory: "#f5f0e8",
  red: "#b3453f", maroon: "#7a2f2a", pink: "#e0a0b0", blush: "#e6bcc4",
  blue: "#3d5f8a", navy: "#28405e", turquoise: "#2f8f8f", teal: "#2f6f7d",
  green: "#4b7a52", emerald: "#2f6f4f", olive: "#6b6b2f",
  purple: "#7a4f8a", lavender: "#b7a3c9", violet: "#6f4f9a",
  yellow: "#d8b23c", orange: "#dd7f22", amber: "#c1791f",
  brown: "#6b4a34", tan: "#c9a876", beige: "#dcc9a8", copper: "#a9744f",
  grey: "#9a9a9a", gray: "#9a9a9a", multicolor: "conic-gradient(from 0deg, #b3453f, #d8b23c, #4b7a52, #3d5f8a, #7a4f8a, #b3453f)",
};

function swatchBackground(colorName) {
  const key = (colorName || "").trim().toLowerCase();
  return COLOR_SWATCHES[key] || "#c9c1b8";
}

async function renderColorOptions(product) {
  if (!product.variant_group) return "";
  let siblings = [];
  try {
    const { products } = await window.api.products.list({ variant_group: product.variant_group });
    siblings = products;
  } catch {
    return ""; // color options are a nice-to-have — never block the page over this
  }
  if (siblings.length < 2) return ""; // no real variants, nothing to show

  const swatches = siblings
    .map((sib) => {
      const isActive = sib.id === product.id;
      const label = sib.color || sib.name;
      return `
        <a class="color-swatch ${isActive ? "is-active" : ""}" href="/html/product.html?slug=${sib.slug}" title="${label}">
          <span class="color-swatch__dot" style="background:${swatchBackground(sib.color)}"></span>
          <span class="color-swatch__label">${label}</span>
        </a>`;
    })
    .join("");

  return `
    <div class="product-detail__colors">
      <span class="product-detail__colors-label">Color: <strong>${product.color || product.name}</strong></span>
      <div class="color-swatch-row">${swatches}</div>
    </div>
  `;
}

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
    const colorOptionsHtml = await renderColorOptions(product);

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
          ${colorOptionsHtml}
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
            <span>Shipping calculated at checkout based on your delivery state &middot; Pay securely via UPI</span>
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
