// Renewal Gate — checks this app's row in the shared cf-relay-svc renewal
// sheet and shows a lock screen if the account has lapsed. Fails open: any
// network error, non-OK response, or "active" status leaves the page
// untouched. See https://github.com/sitepragati-arch/Reusable-Components
(() => {
  const API_BASE = "https://cf-relay-svc.swapniluser100.workers.dev";
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

  function renderLock(status) {
    if (document.getElementById("renewal-gate-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "renewal-gate-overlay";
    overlay.style.cssText = [
      "position:fixed", "inset:0", "z-index:2147483647",
      "background:#faf6f2", "display:flex", "align-items:center", "justify-content:center",
      "padding:24px", "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
      "color:#2b2320",
    ].join(";");

    const amount = status && typeof status.amount === "number" ? `₹${status.amount}` : "";
    const dueDate = formatDate(status && status.renewal_date);
    const name = (status && status.name) || APP_NAME;

    overlay.innerHTML = `
      <div style="max-width:420px;width:100%;background:#fff;border:1px solid #e8ddd3;border-radius:14px;box-shadow:0 8px 24px rgba(43,35,32,0.08);padding:32px 28px;text-align:center;">
        <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:1.4rem;margin:0 0 8px;">${name}</h1>
        <p style="margin:0 0 20px;color:#6b5d54;font-size:0.95rem;">
          Access is paused pending site renewal${dueDate ? ` (due ${dueDate})` : ""}.
        </p>
        ${amount ? `<p style="margin:0 0 16px;font-size:1.1rem;font-weight:600;">${amount} due</p>` : ""}
        <img
          src="${API_BASE}/qr?customerId=${encodeURIComponent(CUSTOMER_ID)}"
          alt="Scan to pay via UPI"
          style="display:block;margin:0 auto 16px;width:200px;height:200px;border:1px solid #e8ddd3;border-radius:8px;"
        />
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
        const fresh = await checkStatus();
        if (fresh && fresh.active !== false) {
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

  async function checkStatus() {
    const res = await fetch(`${API_BASE}/status?customerId=${encodeURIComponent(CUSTOMER_ID)}`);
    if (!res.ok) return null;
    return res.json();
  }

  async function run() {
    try {
      const settingsRes = await fetch("/api/settings").then((r) => r.json()).catch(() => null);
      if (settingsRes?.settings?.customer_id) CUSTOMER_ID = settingsRes.settings.customer_id;

      const status = await checkStatus();
      if (status && status.active === false) renderLock(status);
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
