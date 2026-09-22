const FIELDS = [
  "site_name",
  "logo_url",
  "brand_color",
  "support_email",
  "from_email",
  "payment_qr_image_url",
  "payment_upi_id",
  "payment_instructions",
];

function setProductsTabToggle(enabled) {
  const btn = document.getElementById("admin-products-tab-toggle");
  btn.classList.toggle("is-active", enabled);
  btn.querySelector(".status-label").textContent = enabled ? "Visible" : "Hidden";
  btn.dataset.value = enabled ? "1" : "0";
}

function updateLogoPreview() {
  const url = document.getElementById("logo_url").value.trim();
  const img = document.getElementById("logo-preview-img");
  const placeholder = document.querySelector("#logo-preview svg");
  if (url) {
    img.src = url;
    img.hidden = false;
    placeholder.style.display = "none";
  } else {
    img.hidden = true;
    img.removeAttribute("src");
    placeholder.style.display = "block";
  }
}

async function loadSettings() {
  try {
    const { settings } = await window.vendorApi.settings.get();
    FIELDS.forEach((key) => {
      const el = document.getElementById(key);
      if (el) el.value = settings[key] || "";
    });
    updateLogoPreview();
    setProductsTabToggle(settings.admin_products_tab_enabled !== "0");
  } catch (e) {
    document.getElementById("settings-error").textContent = e.message;
    document.getElementById("settings-error").style.display = "block";
  }
}

async function saveSettings() {
  const errorEl = document.getElementById("settings-error");
  const successEl = document.getElementById("settings-success");
  errorEl.style.display = "none";
  successEl.style.display = "none";

  const payload = {};
  FIELDS.forEach((key) => {
    payload[key] = document.getElementById(key).value;
  });
  payload.admin_products_tab_enabled = document.getElementById("admin-products-tab-toggle").dataset.value;

  try {
    await window.vendorApi.settings.update(payload);
    successEl.style.display = "block";
    setTimeout(() => (successEl.style.display = "none"), 2500);
  } catch (e) {
    errorEl.textContent = e.message;
    errorEl.style.display = "block";
  }
}

document.addEventListener("vendor:ready", loadSettings);
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("save-settings").addEventListener("click", saveSettings);
  document.getElementById("logo_url").addEventListener("input", updateLogoPreview);
  document.getElementById("admin-products-tab-toggle").addEventListener("click", (e) => {
    setProductsTabToggle(e.currentTarget.dataset.value !== "1");
  });
});
