const FIELDS = [
  "business_name",
  "customer_id",
  "site_name",
  "logo_url",
  "brand_color",
  "support_email",
  "from_email",
  "business_phone",
  "business_address",
  "instagram_url",
  "payment_qr_image_url",
  "payment_upi_id",
  "payment_instructions",
  "shipping_fee_maharashtra",
  "shipping_fee_other",
];

// Vendors naturally paste the link Google Drive's "Share" button gives them
// (a /file/d/<id>/view page, or an /open?id=<id> link) — neither of those
// URLs serves image bytes, so an <img src> pointed at one renders nothing.
// Rewrite either shape to the /d/<id> form Drive actually serves images
// from, and leave any other host's URL untouched.
function toDirectImageUrl(url) {
  const m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([\w-]+)/);
  return m ? `https://lh3.googleusercontent.com/d/${m[1]}` : url;
}

// Sub-tabs so the Settings page doesn't turn into one long scroll of cards.
// The selected tab is kept in the URL hash, so a reload (or a link to
// e.g. #payment) lands back on the same section.
function activateSettingsTab(name) {
  const tabs = document.querySelectorAll(".settings-tab");
  const panels = document.querySelectorAll(".settings-panel");
  const target = [...tabs].find((t) => t.dataset.tab === name) ? name : tabs[0]?.dataset.tab;
  tabs.forEach((tab) => {
    const active = tab.dataset.tab === target;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  panels.forEach((panel) => panel.classList.toggle("is-active", panel.dataset.panel === target));
}

function setProductsTabToggle(enabled) {
  const btn = document.getElementById("admin-products-tab-toggle");
  btn.classList.toggle("is-active", enabled);
  btn.querySelector(".status-label").textContent = enabled ? "Visible" : "Hidden";
  btn.dataset.value = enabled ? "1" : "0";
}

// Shared by the logo field and the QR code field: both are "paste a URL,
// see it load (or don't)" inputs with the same Google-Drive-share-link
// gotcha, so this one function drives both previews.
function updateImagePreview({ inputId, imgId, previewBoxId, errorId }) {
  const url = document.getElementById(inputId).value.trim();
  const img = document.getElementById(imgId);
  const placeholder = document.querySelector(`#${previewBoxId} svg`);
  const errorEl = document.getElementById(errorId);
  if (url) {
    errorEl.style.display = "none";
    img.onload = () => {
      img.hidden = false;
      placeholder.style.display = "none";
    };
    img.onerror = () => {
      img.hidden = true;
      placeholder.style.display = "block";
      errorEl.textContent = "Couldn't load an image from that URL — check the link is a direct image (not a share/view page) and is publicly viewable.";
      errorEl.style.display = "block";
    };
    img.src = toDirectImageUrl(url);
  } else {
    errorEl.style.display = "none";
    img.hidden = true;
    img.removeAttribute("src");
    placeholder.style.display = "block";
  }
}

function updateLogoPreview() {
  updateImagePreview({ inputId: "logo_url", imgId: "logo-preview-img", previewBoxId: "logo-preview", errorId: "logo-preview-error" });
}

function updateQrPreview() {
  updateImagePreview({ inputId: "payment_qr_image_url", imgId: "qr-preview-img", previewBoxId: "qr-preview", errorId: "qr-preview-error" });
}

async function loadSettings() {
  try {
    const { settings } = await window.vendorApi.settings.get();
    FIELDS.forEach((key) => {
      const el = document.getElementById(key);
      if (el) el.value = settings[key] || "";
    });
    updateLogoPreview();
    updateQrPreview();
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

  const logoInput = document.getElementById("logo_url");
  logoInput.value = toDirectImageUrl(logoInput.value.trim());
  const qrInput = document.getElementById("payment_qr_image_url");
  qrInput.value = toDirectImageUrl(qrInput.value.trim());

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
  document.getElementById("payment_qr_image_url").addEventListener("input", updateQrPreview);
  document.getElementById("admin-products-tab-toggle").addEventListener("click", (e) => {
    setProductsTabToggle(e.currentTarget.dataset.value !== "1");
  });

  document.querySelectorAll(".settings-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      activateSettingsTab(tab.dataset.tab);
      history.replaceState(null, "", `#${tab.dataset.tab}`);
    });
  });
  activateSettingsTab(location.hash.slice(1));
});
