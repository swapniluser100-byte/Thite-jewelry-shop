// Shared branded HTML wrapper. Every transactional email renders its body
// through this so the shop's name/color/support-email (configurable from the
// Admin Console -> Settings) show up consistently everywhere.
export function renderLayout({ brand, title, preheader = "", bodyHtml }) {
  const brandColor = brand.brand_color || "#a9744f";
  const siteName = brand.site_name || "Jewelry Shop";
  const supportEmail = brand.support_email || "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#faf6f2;font-family:Georgia,'Times New Roman',serif;color:#2b2320;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf6f2;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px rgba(43,35,32,0.08);">
          <tr>
            <td style="background:${brandColor};padding:28px 32px;">
              <span style="font-size:22px;color:#ffffff;letter-spacing:0.02em;">${escapeHtml(siteName)}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#2b2320;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e8ddd3;font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:12px;color:#6b5d54;">
              ${escapeHtml(siteName)}${supportEmail ? ` &middot; Questions? <a href="mailto:${escapeHtml(supportEmail)}" style="color:${brandColor};">${escapeHtml(supportEmail)}</a>` : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function statusBadge(status, brandColor) {
  const labels = {
    pending_payment: "Awaiting payment",
    payment_submitted: "Payment submitted",
    paid: "Payment confirmed",
    processing: "Being handmade / packed",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
    refunded: "Refunded",
  };
  return `<span style="display:inline-block;padding:6px 14px;border-radius:999px;background:${brandColor}1a;color:${brandColor};font-weight:bold;font-size:13px;">${labels[status] || status}</span>`;
}

export function formatMoney(cents, currency = "INR") {
  const value = (cents || 0) / 100;
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
