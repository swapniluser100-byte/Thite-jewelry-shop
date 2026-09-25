let currentOrder = null;

const RECEIPT_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z"/><path d="M9 8h6M9 12h6"/></svg>`;

function renderSummary() {
  const items = window.cartStore.getItems();
  const subtotal = window.cartStore.subtotalCents();
  const estimatedTotal = subtotal >= 200000 ? subtotal : subtotal + 4900;
  const summary = document.getElementById("checkout-summary");
  summary.innerHTML = `
    <div class="checkout-summary__header">
      <span class="checkout-summary__icon">${RECEIPT_ICON}</span>
      <h2>Order Summary</h2>
    </div>
    <div class="checkout-summary__items">
      ${items.map((i) => `<div class="checkout-summary__item"><span>${i.name} &times;${i.quantity}</span><span>${window.formatMoney(i.price_cents * i.quantity)}</span></div>`).join("")}
    </div>
    <div class="checkout-summary__totals">
      <div class="checkout-summary__row"><span>Subtotal</span><span>${window.formatMoney(subtotal)}</span></div>
      <div class="checkout-summary__row checkout-summary__row--total"><span>Estimated total</span><span>${window.formatMoney(estimatedTotal)}</span></div>
    </div>
  `;
}

function renderPaymentSummary(order, items) {
  const subtotalCents = items.reduce((sum, i) => sum + i.price_cents * i.quantity, 0);
  const shippingCents = order.total_cents - subtotalCents;
  const summary = document.getElementById("checkout-summary");
  summary.classList.add("checkout-summary--payment");

  summary.innerHTML = `
    <div class="order-summary-card__header-band">
      <span class="order-summary-card__icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12l1 13H5L6 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>
      </span>
      <h2>Order Summary</h2>
    </div>
    <div class="order-summary-card__items">
      ${items
        .map(
          (i) => `
        <div class="order-item">
          <img src="${i.image_url || "/images/placeholder-product.svg"}" alt="" />
          <div class="order-item__info">
            <div class="name">${i.name}</div>
            <div class="qty">&times; ${i.quantity}</div>
          </div>
          <div class="order-item__price">${window.formatMoney(i.price_cents * i.quantity)}</div>
        </div>`
        )
        .join("")}
    </div>
    <div class="order-summary-card__totals">
      <div class="order-summary-card__row"><span>Subtotal</span><span>${window.formatMoney(subtotalCents)}</span></div>
      ${shippingCents > 0 ? `<div class="order-summary-card__row"><span>Shipping</span><span>${window.formatMoney(shippingCents)}</span></div>` : ""}
      <div class="order-summary-card__row order-summary-card__row--total"><span>Total</span><span>${window.formatMoney(order.total_cents)}</span></div>
    </div>
    <div class="payment-reference-box">
      <form id="payment-form">
        <label for="payment_reference">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 15 15 9"/><path d="M11 5 13 3a4 4 0 0 1 6 6l-2 2"/><path d="M13 19l-2 2a4 4 0 0 1-6-6l2-2"/></svg>
          Enter UTR:
        </label>
        <div class="payment-reference-row">
          <input id="payment_reference" name="payment_reference" placeholder="e.g. 402816558211" required />
          <button type="submit" class="btn btn-primary">Confirm Payment &rarr;</button>
        </div>
        <p class="error-text" id="payment-error" style="display:none;"></p>
      </form>
    </div>
  `;

  document.getElementById("payment-form").addEventListener("submit", submitPaymentReference);
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
    await showPaymentStep(order, items);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = "block";
    btn.disabled = false;
    btn.textContent = "Place order — pay by QR code next";
  }
}

async function showPaymentStep(order, items) {
  document.getElementById("details-step").style.display = "none";
  document.getElementById("payment-step").style.display = "flex";
  document.getElementById("secure-note-wrap").style.display = "block";
  document.querySelector(".checkout-layout").classList.add("checkout-layout--payment");
  renderPaymentSummary(order, items);

  try {
    const { settings } = await window.api.settings.get();
    document.getElementById("payment-instructions").textContent =
      settings.payment_instructions || "Scan the QR code to pay, then enter your transaction reference below.";

    const qrImg = document.getElementById("qr-image");
    const placeholder = "/images/qr-placeholder.svg";
    if (settings.payment_qr_image_url) {
      // Same Google-Drive-share-link gotcha as the logo: a "Share" link is a
      // web page, not image bytes, so it fails to load as an <img src> — fall
      // back to the placeholder instead of leaving a broken image at checkout.
      qrImg.onerror = () => (qrImg.src = placeholder);
      qrImg.src = window.toDirectImageUrl ? window.toDirectImageUrl(settings.payment_qr_image_url) : settings.payment_qr_image_url;
    } else {
      qrImg.src = placeholder;
    }

    const upiIdEl = document.getElementById("upi-id");
    upiIdEl.innerHTML = settings.payment_upi_id
      ? `<span class="upi-pill__badge">UPI</span><span class="upi-pill__value">${settings.payment_upi_id}</span>`
      : "";
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
});
