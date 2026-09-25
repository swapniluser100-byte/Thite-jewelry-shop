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
