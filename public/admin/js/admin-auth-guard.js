// Include this on every admin page except login.html. Redirects to the login
// page if there's no valid session, and fills in the "signed in as" text.
(async function guard() {
  try {
    const { admin } = await window.adminApi.me();
    document.querySelectorAll("[data-admin-name]").forEach((el) => (el.textContent = admin.name || admin.email));
    document.dispatchEvent(new CustomEvent("admin:ready", { detail: admin }));
  } catch {
    location.href = "/admin/html/login.html";
    return;
  }

  // The Products tab's visibility is controlled by the vendor, from the
  // Vendor Portal (Settings → Admin Console Access) — not by anything in the
  // Admin Console itself. Hide the nav link when it's off, and bounce off any
  // gated page someone lands on directly (bookmark, back button, etc.).
  try {
    const { settings } = await window.adminApi.settings.get();
    const productsTabEnabled = settings.admin_products_tab_enabled !== "0";
    if (!productsTabEnabled) {
      document.querySelectorAll("[data-nav-products]").forEach((el) => el.remove());
      if (document.body.dataset.gatedSetting === "admin_products_tab_enabled") {
        location.href = "/admin/html/dashboard.html";
      }
    }
  } catch {
    /* settings unreachable — fail open, nav stays as-is */
  }
})();

async function handleLogout() {
  await window.adminApi.logout().catch(() => {});
  location.href = "/admin/html/login.html";
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-logout]").forEach((el) => el.addEventListener("click", handleLogout));
});
