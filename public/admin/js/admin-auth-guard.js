// Include this on every admin page except login.html. Redirects to the login
// page if there's no valid session, and fills in the "signed in as" text.
(async function guard() {
  try {
    const { admin } = await window.adminApi.me();
    document.querySelectorAll("[data-admin-name]").forEach((el) => (el.textContent = admin.name || admin.email));
    document.dispatchEvent(new CustomEvent("admin:ready", { detail: admin }));
  } catch {
    location.href = "/admin/html/login.html";
  }
})();

async function handleLogout() {
  await window.adminApi.logout().catch(() => {});
  location.href = "/admin/html/login.html";
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-logout]").forEach((el) => el.addEventListener("click", handleLogout));
});
