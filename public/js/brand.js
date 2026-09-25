// Pulls site_name / support_email / brand_color / logo_url from the
// vendor-editable settings table so every page reflects what's configured
// in the Vendor Portal without needing a rebuild.

// Vendors naturally paste the link Google Drive's "Share" button gives them
// (a /file/d/<id>/view page, or an /open?id=<id> link) — neither of those
// URLs serves image bytes, so an <img src> pointed at one renders nothing.
// Rewrite either shape to the /d/<id> form Drive actually serves images
// from, and leave any other host's URL untouched.
function toDirectImageUrl(url) {
  const m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([\w-]+)/);
  return m ? `https://lh3.googleusercontent.com/d/${m[1]}` : url;
}
window.toDirectImageUrl = toDirectImageUrl;

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const { settings } = await window.api.settings.get();
    document.querySelectorAll("[data-site-name]").forEach((el) => (el.textContent = settings.site_name || "Jewelry Shop"));
    document.querySelectorAll("[data-support-email]").forEach((el) => {
      el.textContent = settings.support_email || "";
      el.setAttribute("href", `mailto:${settings.support_email || ""}`);
    });
    if (settings.logo_url) {
      document.querySelectorAll("[data-logo]").forEach((img) => {
        img.alt = settings.site_name || "Logo";
        // The logo sits next to the site name, not instead of it — only
        // reveal the image once it's actually loaded, so a bad URL (typo,
        // deleted file, an un-embeddable host) just leaves the text name
        // showing alone instead of an invisible broken-image box next to it.
        img.onload = () => (img.style.display = "block");
        img.onerror = () => (img.style.display = "none");
        img.src = toDirectImageUrl(settings.logo_url);
      });
    }
    if (settings.brand_color) {
      document.documentElement.style.setProperty("--color-brand", settings.brand_color);
    }
    if (settings.site_name) document.title = document.title.replace("Jewelry Shop", settings.site_name);

    // Contact details are all optional — each footer line only appears once
    // the vendor has actually filled it in from the Vendor Portal.
    const phone = (settings.business_phone || "").trim();
    if (phone) {
      const digits = phone.replace(/[^\d]/g, "");
      document.querySelectorAll("[data-phone-row]").forEach((li) => (li.hidden = false));
      document.querySelectorAll("[data-phone-link]").forEach((a) => {
        a.textContent = phone;
        a.href = `tel:${phone.replace(/[^\d+]/g, "")}`;
      });
      if (digits) {
        document.querySelectorAll("[data-whatsapp-row]").forEach((li) => (li.hidden = false));
        document.querySelectorAll("[data-whatsapp-link]").forEach((a) => (a.href = `https://wa.me/${digits}`));
      }
    }

    const address = (settings.business_address || "").trim();
    if (address) {
      document.querySelectorAll("[data-address-row]").forEach((li) => (li.hidden = false));
      document.querySelectorAll("[data-business-address]").forEach((el) => (el.textContent = address));
    }

    const instagram = (settings.instagram_url || "").trim();
    if (instagram) {
      document.querySelectorAll("[data-instagram-row]").forEach((li) => (li.hidden = false));
      document.querySelectorAll("[data-instagram-link]").forEach((a) => (a.href = instagram));
    }
  } catch {
    /* settings unavailable (e.g. DB not migrated yet) — page still renders with defaults */
  }
});
