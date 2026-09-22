// Include this on every vendor page except login.html. Redirects to the
// vendor login page if there's no valid vendor session, and fills in the
// "signed in as" text.
(async function guard() {
  try {
    const { admin } = await window.vendorApi.me();
    document.querySelectorAll("[data-admin-name]").forEach((el) => (el.textContent = admin.name || admin.email));
    document.dispatchEvent(new CustomEvent("vendor:ready", { detail: admin }));
  } catch {
    location.href = "/vendor/html/login.html";
  }
})();

async function handleLogout() {
  await window.vendorApi.logout().catch(() => {});
  location.href = "/vendor/html/login.html";
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-logout]").forEach((el) => el.addEventListener("click", handleLogout));
});
