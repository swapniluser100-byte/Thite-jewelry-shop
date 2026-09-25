# Renewal Gate (vanilla JS + Cloudflare Pages Functions)

A portable "paywall" that locks a site behind a SitePragati renewal/payment
check — no framework required. This is the vanilla-JS counterpart to the
React `renewal-gate` component in the
[`sitepragati-arch/Reusable-Components`](https://github.com/sitepragati-arch/Reusable-Components)
repo, for projects (like this one) that don't use React — a static/server-
rendered site, or anything served from Cloudflare Pages.

Drop it into any project with two files and one `<script>` tag. No build
step, no npm dependency, no client-side QR library.

## What it does

On every page load:

1. Fetches this app's customer record from SitePragati by `customerId`.
2. Works out whether the account is overdue (today is past
   `next_payment_due_date`).
3. If overdue, swaps the whole page for a full-screen lock overlay: business
   name, amount due, due date, a UPI QR code to pay, a support-email link,
   and an "I've Paid — Recheck Access" button.
4. If not overdue, or if anything above fails, **the page renders normally**
   — this fails open by design. A network hiccup, a SitePragati outage, or a
   bad response should never take a paying customer's site down. Only a
   confirmed, parseable, past-due date locks the page.

## Architecture

```
 browser (any page)
     │  <script src="/js/renewal-gate.js">
     ▼
 renewal-gate.js  ──fetch──▶  /api/renewal-status?customerId=...   (same origin)
                                        │
                                        │  server-side fetch (no CORS here)
                                        ▼
                    https://sitepragati.in/api/public/customer-info?customerId=...
```

Two files, two jobs:

| File | Runs where | Job |
|---|---|---|
| `functions/api/renewal-status.js` | Server (Cloudflare Pages Function) | Same-origin proxy in front of SitePragati's public API |
| `public/js/renewal-gate.js` | Browser | Fetches the proxy, decides overdue-or-not, renders the lock screen |

### Why the proxy exists — read this before skipping it

`https://sitepragati.in/api/public/customer-info` does **not** send an
`Access-Control-Allow-Origin` header on its actual JSON response. (A `curl
-I` HEAD request to it *does* come back with a permissive CORS header, but
that's a different, SPA-catch-all response — don't be misled by it the way
we initially were. Check headers on a real `GET`, not `HEAD`.) A browser
calling that URL directly with `fetch()` gets blocked by CORS, full stop —
you'll see this in the console:

```
Access to fetch at 'https://sitepragati.in/api/public/customer-info?...'
from origin 'https://your-site.com' has been blocked by CORS policy: No
'Access-Control-Allow-Origin' header is present on the requested resource.
```

The fix is a same-origin proxy: any server-side code (a Cloudflare Pages
Function, a Worker, a Node/Express route, whatever the target project has)
fetches the SitePragati API server-to-server — CORS is a browser-only
concept, so it doesn't apply there — and hands the JSON back to the browser
from the project's own origin. If SitePragati's API ever adds CORS headers,
this proxy step becomes optional (the browser could call it directly) — but
until then, skipping it means the gate silently never locks anything (every
check fails, and "fails open" means the site just always renders normally).

## SitePragati's public API contract

```
GET https://sitepragati.in/api/public/customer-info?customerId=<id>
```

Response (`Content-Type: application/json`, no CORS header):

```json
{
  "business_name": "Thite Jewelers ",
  "frequency": "Monthly",
  "next_payment_due_date": "2026-08-02",
  "next_payment_due_amount": 200,
  "upi_id": "swapnil.barad@axisbank"
}
```

Notes on the fields as observed:

- `business_name` sometimes has trailing whitespace — trim it before display.
- There is **no `active`/`status` field** — overdue-ness isn't computed by
  the API, it's on the caller to compare `next_payment_due_date` to today.
- There is **no QR-image endpoint** on this API (the old `cf-relay-svc`
  renewal-service had one) — build the UPI QR code yourself from `upi_id` +
  `next_payment_due_amount` (see below).
- `customerId` is whatever id SitePragati's side has assigned this
  project/client — same id used everywhere else the project references
  SitePragati (e.g. a "Raise a support request" link).

## The files, in full

### `functions/api/renewal-status.js`

```js
import { ok, error } from "../lib/response.js";

// GET /api/renewal-status?customerId=...  -> public, no auth
//
// Thin same-origin proxy in front of SitePragati's public customer-info API.
// The renewal gate (public/js/renewal-gate.js) runs entirely in the browser,
// and that upstream API doesn't send an Access-Control-Allow-Origin header,
// so a direct client-side fetch to it is blocked by CORS. Cloudflare Pages
// Functions run server-side, where CORS doesn't apply, so this just relays
// the upstream response back under our own origin.
export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const customerId = url.searchParams.get("customerId");
  if (!customerId) return error("customerId is required");

  try {
    const upstream = await fetch(
      `https://sitepragati.in/api/public/customer-info?customerId=${encodeURIComponent(customerId)}`
    );
    if (!upstream.ok) return error("Upstream renewal check failed", 502);
    const info = await upstream.json();
    return ok({ info });
  } catch {
    return error("Upstream renewal check unreachable", 502);
  }
}
```

If the target project doesn't already have this project's `ok`/`error`
response helpers (`functions/lib/response.js`), the whole handler is just as
easily a plain `Response`:

```js
export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const customerId = url.searchParams.get("customerId");
  if (!customerId) {
    return new Response(JSON.stringify({ ok: false, error: "customerId is required" }), { status: 400 });
  }
  try {
    const upstream = await fetch(
      `https://sitepragati.in/api/public/customer-info?customerId=${encodeURIComponent(customerId)}`
    );
    if (!upstream.ok) {
      return new Response(JSON.stringify({ ok: false, error: "Upstream renewal check failed" }), { status: 502 });
    }
    const info = await upstream.json();
    return new Response(JSON.stringify({ ok: true, info }), {
      headers: { "content-type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Upstream renewal check unreachable" }), { status: 502 });
  }
}
```

On a non-Cloudflare-Pages stack, port the same three lines of logic (read
`customerId` → server-side `fetch` the upstream URL → relay the JSON) into
whatever that stack's route/handler convention is (an Express route, a
Next.js API route, a Netlify Function, etc.) — none of it is Cloudflare-
specific except the file-based routing location.

### `public/js/renewal-gate.js`

```js
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
  const CUSTOMER_ID = "YOUR_CUSTOMER_ID_HERE"; // <-- change per project
  const APP_NAME = "Your App Name";              // <-- shown if business_name is empty
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

  // The API doesn't generate a QR image itself, so this builds the standard
  // UPI deep link from the customer's own upi_id/amount and renders it via a
  // public QR-image endpoint — still just a plain <img src>, no client-side
  // QR library needed.
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
      const info = await fetchCustomerInfo();
      if (info && isOverdue(info)) renderLock(info);
    } catch {
      /* fail open — never block the site on a network error */
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
```

> The version of this file actually running in the jewelry-shop project
> additionally reads `CUSTOMER_ID` from that project's own vendor-editable
> settings table (falling back to the hardcoded value above) — that's a
> project-specific enhancement, not part of the minimal pattern. See
> **Optional: vendor-configurable customer ID** below if you want that too.

## Step-by-step: adding this to a new project

1. **Copy both files** into the new project:
   - `functions/api/renewal-status.js` (or the equivalent path/convention for
     that project's backend — see the plain-`Response` version above if it
     doesn't have Cloudflare Pages Functions at all)
   - `public/js/renewal-gate.js` (or wherever that project serves static JS
     from)
2. **Set `CUSTOMER_ID`** in `renewal-gate.js` to a fresh id for this new
   project/client. Ask whoever administers the SitePragati side
   (`sitepragati.in`) to create that customer record first — this doc only
   covers the *public, read* side of that API; provisioning a new customer
   is a manual step on SitePragati's side, not something this script does.
3. **Load the script on every page that should be gated**, as early as
   reasonably possible in `<body>` (this project puts it as the very first
   `<script>` tag, before anything else, on every page — storefront, admin,
   and vendor portal alike):
   ```html
   <script src="/js/renewal-gate.js"></script>
   ```
   If the new project has multiple "areas" (e.g. a public site plus an
   admin panel), add the tag to all of them — the gate has no idea what
   kind of page it's running on, it just locks whatever `<body>` it's
   dropped into.
4. **Test both branches before shipping** (see Testing below) — don't just
   trust that "it didn't show a lock screen" means it's wired up correctly;
   an unreachable proxy also doesn't show a lock screen, because of the
   fail-open design.
5. Deploy. **Know before you deploy**: if the new customer's
   `next_payment_due_date` is already in the past at setup time, the lock
   screen will show immediately on a live site. Confirm the due date is
   current before going live, exactly as we had to check for this project.

## Testing

The fail-open design makes it easy to convince yourself something works when
it actually doesn't (no lock screen can mean "not overdue" *or* "the check
silently failed"). Verify both states explicitly:

**Overdue path** (should lock):
1. Confirm the real customer record is overdue: `curl
   "https://sitepragati.in/api/public/customer-info?customerId=<id>"` and
   check `next_payment_due_date` against today, or temporarily point
   `CUSTOMER_ID` at a test id known to be overdue.
2. Load any gated page. Confirm: business name, due date, amount, and a
   scannable QR code all render.
3. Decode the QR (or just read the `<img src>` — it's a URL-encoded
   `upi://pay?...` string) and confirm `pa`, `pn`, `am` match the API's
   `upi_id`, `business_name`, `next_payment_due_amount`.
4. Click **"I've Paid — Recheck Access"** — with the same overdue record,
   confirm the overlay stays and the button re-enables (doesn't get stuck on
   "Checking…").

**Not-overdue / fail-open path** (should NOT lock):
1. Test the proxy directly: `curl
   "https://your-site.com/api/renewal-status?customerId=<id>"` should return
   `{"ok":true,"info":{...}}`. If it 404s or errors, the gate will (silently,
   by design) never lock anything — fix the proxy before testing further.
2. Confirm a page with a *future* `next_payment_due_date` renders completely
   normally, no overlay, no console errors.
3. Confirm a broken `customerId` (or the proxy temporarily down) also just
   renders normally — this is correct fail-open behavior, not a bug.

## Design decisions worth knowing before you touch this

- **Fails open, deliberately.** A network error, a missing field, an
  unparseable date, or an unreachable proxy all mean "render normally," not
  "lock the site." This trades strictness for reliability — a paying
  customer's site should never go down because of a transient issue on
  either SitePragati's side or the proxy's. If you need it to fail *closed*
  instead (lock by default on any doubt), that's a one-line change in `run()`
  — but think hard before making that change, since a truly broken proxy
  would then lock every gated project at once.
- **Overdue = strictly after end-of-day on the due date**, not on it. Someone
  is not locked out on the day their payment is due, only from the day after.
- **Date parsing uses the browser's local timezone** (`new Date("...T23:59:59")`
  with no explicit offset), which is a deliberate simplification appropriate
  for single-country small-business sites — a visitor in a very different
  timezone could see the boundary shift by up to a day. Not worth
  over-engineering for this use case; revisit if a project ever needs
  timezone-exact enforcement.
- **The QR code is generated by a third-party public image API**
  (`api.qrserver.com`), not a bundled QR library — keeps this dependency-free
  or Cloudflare Function to distribute, but it means QR generation depends on
  that service's uptime. Swap the URL builder in `buildUpiQrUrl()` for a
  different provider (or a bundled QR library) if that's ever a concern.
- **The proxy is intentionally dumb** — it doesn't cache, doesn't transform
  the shape, doesn't add auth. It exists purely to solve the CORS problem.
  Keep it that way unless there's a specific reason not to (e.g. rate-
  limiting many gated projects hitting SitePragati at once — not a problem
  we've hit yet).

## Optional: vendor-configurable customer ID

This project ([Rahul-Thite](../)) additionally lets whoever manages the site
change `CUSTOMER_ID` from a settings screen instead of it being hardcoded —
useful if the same codebase template gets reused for a different client
under a different SitePragati account, since that becomes a one-field
change instead of a code edit and redeploy. If the new project has an
equivalent "site settings" concept already, the same idea ports over:

```js
async function run() {
  try {
    // fetch this project's own settings however it normally does that
    const settingsRes = await fetch("/api/settings").then((r) => r.json()).catch(() => null);
    if (settingsRes?.settings?.customer_id) CUSTOMER_ID = settingsRes.settings.customer_id;

    const info = await fetchCustomerInfo();
    if (info && isOverdue(info)) renderLock(info);
  } catch {
    /* fail open */
  }
}
```

`CUSTOMER_ID` becomes `let` instead of `const` so this can reassign it before
`fetchCustomerInfo()` reads it. This is entirely optional — a hardcoded
`CUSTOMER_ID` (the minimal version above) is a perfectly fine starting
point for a new project, and this can be added later without changing
anything else.
