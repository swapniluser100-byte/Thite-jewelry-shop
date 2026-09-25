// Renewal Gate — checks this app's customer record via SitePragati's public
// customer-info API and shows a lock screen if payment is overdue. Fails
// open: any network error, missing/unparseable due date, or a due date that
// hasn't passed yet leaves the page untouched.
//
// Goes through our own /api/renewal-status (functions/api/renewal-status.js)
// rather than https://sitepragati.in/api/public/customer-info directly —
// that upstream API doesn't send CORS headers, so a browser can't call it
// cross-origin. The proxy fetches it server-side and relays the JSON as-is.
(() => {
  const CUSTOMER_INFO_API = "/api/renewal-status";
  // Vendor-configurable (Vendor Portal → Settings → Business Details →
  // "SitePragati Customer ID"); this is only the fallback used until that
  // setting loads (or if it's ever unreachable), so the gate still runs.
  let CUSTOMER_ID = "asmcDHaHEEktePc";
  const APP_NAME = "Thite Jewelry Shop";
  const SUPPORT_EMAIL = "sitepragati@gmail.com";

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  // The customer-info API only returns raw payment fields (no computed
  // "active" flag), so overdue-ness is worked out here: paid through the
  // end of the due date, locked from the next day on. A missing/unparseable
  // date fails open rather than locking on bad data.
  function isOverdue(info) {
    const raw = info && info.next_payment_due_date;
    if (!raw) return false;
    const due = new Date(`${raw}T23:59:59`);
    if (Number.isNaN(due.getTime())) return false;
    return Date.now() > due.getTime();
  }

  // The API doesn't generate a QR image itself (unlike the old renewal
  // service), so this builds the standard UPI deep link from the customer's
  // own upi_id/amount and renders it via a public QR-image endpoint — still
  // just a plain <img src>, no client-side QR library needed.
  function buildUpiQrUrl(info) {
    if (!info || !info.upi_id) return "";
    const payee = (info.business_name || APP_NAME).trim();
    const amount = info.next_payment_due_amount;
    let upiLink = `upi://pay?pa=${encodeURIComponent(info.upi_id)}&pn=${encodeURIComponent(payee)}`;
    if (typeof amount === "number") upiLink += `&am=${encodeURIComponent(amount)}`;
    upiLink += "&cu=INR";
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}`;
  }

  function renderLock(info) {
    if (document.getElementById("renewal-gate-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "renewal-gate-overlay";
    overlay.style.cssText = [
      "position:fixed", "inset:0", "z-index:2147483647",
      "background:#faf6f2", "display:flex", "align-items:center", "justify-content:center",
      "padding:24px", "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
      "color:#2b2320",
    ].join(";");

    const amount = typeof info?.next_payment_due_amount === "number" ? `₹${info.next_payment_due_amount}` : "";
    const dueDate = formatDate(info?.next_payment_due_date);
    const name = (info?.business_name || "").trim() || APP_NAME;
    const qrSrc = buildUpiQrUrl(info);

    overlay.innerHTML = `
      <div style="max-width:420px;width:100%;background:#fff;border:1px solid #e8ddd3;border-radius:14px;box-shadow:0 8px 24px rgba(43,35,32,0.08);padding:32px 28px;text-align:center;">
        <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:1.4rem;margin:0 0 8px;">${name}</h1>
        <p style="margin:0 0 20px;color:#6b5d54;font-size:0.95rem;">
          Access is paused pending site renewal${dueDate ? ` (due ${dueDate})` : ""}.
        </p>
        ${amount ? `<p style="margin:0 0 16px;font-size:1.1rem;font-weight:600;">${amount} due</p>` : ""}
        ${qrSrc ? `
        <img
          src="${qrSrc}"
          alt="Scan to pay via UPI"
          style="display:block;margin:0 auto 16px;width:200px;height:200px;border:1px solid #e8ddd3;border-radius:8px;"
        />` : ""}
        <p style="margin:0 0 20px;color:#6b5d54;font-size:0.85rem;">
          After paying, email a screenshot to
          <a href="mailto:${SUPPORT_EMAIL}" style="color:#a9744f;text-decoration:underline;">${SUPPORT_EMAIL}</a>.
        </p>
        <button id="renewal-gate-recheck" style="display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 22px;border-radius:999px;border:1px solid transparent;font-size:0.95rem;background:#a9744f;color:#fff;cursor:pointer;width:100%;">
          I've Paid — Recheck Access
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById("renewal-gate-recheck").addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = "Checking…";
      try {
        const fresh = await fetchCustomerInfo();
        if (fresh && !isOverdue(fresh)) {
          overlay.remove();
        } else {
          btn.disabled = false;
          btn.textContent = "I've Paid — Recheck Access";
        }
      } catch {
        btn.disabled = false;
        btn.textContent = "I've Paid — Recheck Access";
      }
    });
  }

  async function fetchCustomerInfo() {
    const res = await fetch(`${CUSTOMER_INFO_API}?customerId=${encodeURIComponent(CUSTOMER_ID)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.ok ? data.info : null;
  }

  async function run() {
    try {
      const settingsRes = await fetch("/api/settings").then((r) => r.json()).catch(() => null);
      if (settingsRes?.settings?.customer_id) CUSTOMER_ID = settingsRes.settings.customer_id;

      const info = await fetchCustomerInfo();
      if (info && isOverdue(info)) renderLock(info);
    } catch {
      /* fail open — never block the storefront on a network error */
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
