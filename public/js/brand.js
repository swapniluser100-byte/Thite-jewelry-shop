// Pulls site_name / support_email / brand_color from the admin-editable
// settings table so every page reflects what's configured in the Admin
// Console without needing a rebuild.
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const { settings } = await window.api.settings.get();
    document.querySelectorAll("[data-site-name]").forEach((el) => (el.textContent = settings.site_name || "Jewelry Shop"));
    document.querySelectorAll("[data-support-email]").forEach((el) => {
      el.textContent = settings.support_email || "";
      el.setAttribute("href", `mailto:${settings.support_email || ""}`);
    });
    if (settings.brand_color) {
      document.documentElement.style.setProperty("--color-brand", settings.brand_color);
    }
    if (settings.site_name) document.title = document.title.replace("Jewelry Shop", settings.site_name);
  } catch {
    /* settings unavailable (e.g. DB not migrated yet) — page still renders with defaults */
  }
});
