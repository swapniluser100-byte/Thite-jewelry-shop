let currentOrder = null;

function renderSummary() {
  const items = window.cartStore.getItems();
  const subtotal = window.cartStore.subtotalCents();
  const summary = document.getElementById("checkout-summary");
  summary.innerHTML = `
    ${items.map((i) => `<div class="checkout-summary__item"><span>${i.name} &times;${i.quantity}</span><span>${window.formatMoney(i.price_cents * i.quantity)}</span></div>`).join("")}
    <div class="checkout-summary__item"><span>Subtotal</span><span>${window.formatMoney(subtotal)}</span></div>
    <div class="checkout-summary__total"><span>Estimated total</span><span>${window.formatMoney(subtotal >= 200000 ? subtotal : subtotal + 4900)}</span></div>
  `;
}

async function placeOrder(e) {
  e.preventDefault();
  const errorEl = document.getElementById("checkout-error");
  errorEl.style.display = "none";

  const items = window.cartStore.getItems();
  if (!items.length) {
    errorEl.textContent = "Your cart is empty.";
    errorEl.style.display = "block";
    return;
  }

  const form = document.getElementById("checkout-form");
  const btn = document.getElementById("place-order-btn");
  btn.disabled = true;
  btn.textContent = "Placing order…";

  try {
    const payload = {
      customer: {
        name: form.name.value,
        email: form.email.value,
        phone: form.phone.value,
      },
      shipping: {
        address: form.address.value,
        city: form.city.value,
        state: form.state.value,
        postal_code: form.postal_code.value,
        country: "India",
      },
      notes: form.notes.value,
      items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
    };
    const { order } = await window.api.orders.create(payload);
    currentOrder = order;
    window.cartStore.clear();
    await showPaymentStep(order);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = "block";
    btn.disabled = false;
    btn.textContent = "Place order — pay by QR code next";
  }
}

async function showPaymentStep(order) {
  document.getElementById("details-step").style.display = "none";
  const paymentStep = document.getElementById("payment-step");
  paymentStep.style.display = "block";

  try {
    const { settings } = await window.api.settings.get();
    document.getElementById("payment-instructions").textContent =
      settings.payment_instructions || "Scan the QR code to pay, then enter your transaction reference below.";
    document.getElementById("qr-image").src = settings.payment_qr_image_url || "/images/placeholder-product.svg";
    document.getElementById("upi-id").textContent = settings.payment_upi_id ? `UPI ID: ${settings.payment_upi_id}` : "";
  } catch {
    /* settings failed to load; QR box still shows with fallback image */
  }
  document.getElementById("qr-amount").textContent = window.formatMoney(order.total_cents);
}

async function submitPaymentReference(e) {
  e.preventDefault();
  const errorEl = document.getElementById("payment-error");
  errorEl.style.display = "none";
  const reference = document.getElementById("payment_reference").value.trim();
  if (!reference || !currentOrder) return;

  try {
    await window.api.orders.submitPayment(currentOrder.order_number, reference);
    location.href = `/html/order-confirmation.html?order=${encodeURIComponent(currentOrder.order_number)}`;
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = "block";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (!window.cartStore.getItems().length) {
    location.href = "/html/cart.html";
    return;
  }
  renderSummary();
  document.getElementById("checkout-form").addEventListener("submit", placeOrder);
  document.getElementById("payment-form").addEventListener("submit", submitPaymentReference);
});
