// Keeps the cart-count bubble in the header in sync across all pages.
function renderCartCount() {
  const el = document.querySelector("[data-cart-count]");
  if (!el) return;
  const count = window.cartStore.count();
  el.textContent = count;
  el.style.display = count > 0 ? "inline-flex" : "none";
}

document.addEventListener("DOMContentLoaded", renderCartCount);
document.addEventListener("cart:updated", renderCartCount);

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-footer-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
});

// Highlights the nav link matching the current page, in both the desktop
// nav and the mobile dropdown. Cloudflare Pages serves clean URLs (no
// ".html"), so both sides are normalized before comparing.
document.addEventListener("DOMContentLoaded", () => {
  const normalize = (path) => path.replace(/\.html$/, "").replace(/\/$/, "") || "/";
  const current = normalize(window.location.pathname);
  document.querySelectorAll("[data-nav-link]").forEach((link) => {
    const linkPath = normalize(new URL(link.href, window.location.origin).pathname);
    if (linkPath === current) link.classList.add("is-active");
  });
});

// Adds a subtle shadow to the sticky header once the page scrolls under it.
(() => {
  const header = document.querySelector("[data-site-header]");
  if (!header) return;
  const syncShadow = () => header.classList.toggle("is-scrolled", window.scrollY > 4);
  syncShadow();
  window.addEventListener("scroll", syncShadow, { passive: true });
})();

// Mobile hamburger menu: toggles the dropdown nav and closes it on link tap.
(() => {
  const toggle = document.querySelector("[data-nav-toggle]");
  const panel = document.querySelector("[data-mobile-nav]");
  if (!toggle || !panel) return;
  const setOpen = (open) => {
    panel.classList.toggle("is-open", open);
    toggle.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  };
  toggle.addEventListener("click", () => setOpen(!panel.classList.contains("is-open")));
  panel.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
})();

function formatMoney(cents, currency = "INR") {
  const value = (cents || 0) / 100;
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

window.formatMoney = formatMoney;
