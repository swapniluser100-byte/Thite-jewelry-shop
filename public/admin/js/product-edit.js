const productId = new URLSearchParams(location.search).get("id");

async function loadCategories(selectedId) {
  const select = document.getElementById("category_id");
  try {
    const { categories } = await window.adminApi.categories.list();
    categories.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      if (String(c.id) === String(selectedId)) opt.selected = true;
      select.appendChild(opt);
    });
  } catch {
    /* categories are optional */
  }
}

async function loadProduct() {
  if (!productId) return;
  document.getElementById("page-title").textContent = "Edit product";
  document.getElementById("delete-btn").style.display = "inline-flex";
  const { product } = await window.adminApi.products.get(productId);
  document.getElementById("name").value = product.name;
  document.getElementById("description").value = product.description || "";
  document.getElementById("price").value = (product.price_cents / 100).toFixed(2);
  document.getElementById("stock_qty").value = product.stock_qty;
  document.getElementById("image_url").value = product.image_url || "";
  document.getElementById("is_active").checked = !!product.is_active;
  await loadCategories(product.category_id);
}

async function ensureCategory() {
  const newCategoryName = document.getElementById("new_category").value.trim();
  if (!newCategoryName) return document.getElementById("category_id").value || null;
  const { id } = await window.adminApi.categories.create({ name: newCategoryName });
  return id;
}

async function handleSubmit(e) {
  e.preventDefault();
  const errorEl = document.getElementById("product-error");
  errorEl.style.display = "none";
  const saveBtn = document.getElementById("save-btn");
  saveBtn.disabled = true;

  try {
    const categoryId = await ensureCategory();
    const payload = {
      name: document.getElementById("name").value,
      description: document.getElementById("description").value,
      price_cents: Math.round(parseFloat(document.getElementById("price").value) * 100),
      stock_qty: parseInt(document.getElementById("stock_qty").value, 10),
      category_id: categoryId || null,
      image_url: document.getElementById("image_url").value,
      is_active: document.getElementById("is_active").checked ? 1 : 0,
    };

    if (productId) {
      await window.adminApi.products.update(productId, payload);
    } else {
      await window.adminApi.products.create(payload);
    }
    location.href = "/admin/html/products.html";
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = "block";
    saveBtn.disabled = false;
  }
}

async function handleDelete() {
  if (!confirm("Delete this product? This cannot be undone.")) return;
  await window.adminApi.products.remove(productId);
  location.href = "/admin/html/products.html";
}

document.addEventListener("admin:ready", () => {
  if (productId) {
    loadProduct();
  } else {
    loadCategories();
  }
  document.getElementById("product-form").addEventListener("submit", handleSubmit);
  document.getElementById("delete-btn").addEventListener("click", handleDelete);
});
