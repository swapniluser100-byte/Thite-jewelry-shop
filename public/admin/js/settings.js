const FIELDS = [
  "site_name",
  "brand_color",
  "support_email",
  "from_email",
  "payment_qr_image_url",
  "payment_upi_id",
  "payment_instructions",
];

async function loadSettings() {
  try {
    const { settings } = await window.adminApi.settings.get();
    FIELDS.forEach((key) => {
      const el = document.getElementById(key);
      if (el) el.value = settings[key] || "";
    });
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

  try {
    await window.adminApi.settings.update(payload);
    successEl.style.display = "block";
    setTimeout(() => (successEl.style.display = "none"), 2500);
  } catch (e) {
    errorEl.textContent = e.message;
    errorEl.style.display = "block";
  }
}

document.addEventListener("admin:ready", loadSettings);
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("save-settings").addEventListener("click", saveSettings);
});
