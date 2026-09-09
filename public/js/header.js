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

function formatMoney(cents, currency = "INR") {
  const value = (cents || 0) / 100;
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

window.formatMoney = formatMoney;
