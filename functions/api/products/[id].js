import { first, run, isUniqueConstraintError } from "../../lib/db.js";
import { ok, error } from "../../lib/response.js";
import { requireProductAccess } from "../../lib/auth.js";

// GET /api/products/:id     -> public (by numeric id or slug)
// PUT /api/products/:id     -> vendor, or shop-admin while the vendor has the
//                              Admin Console Products tab turned on
// DELETE /api/products/:id  -> same access rule as PUT
export async function onRequestGet({ params, env }) {
  const idOrSlug = params.id;
  const isNumeric = /^\d+$/.test(idOrSlug);
  const row = await first(
    env.DB,
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.${isNumeric ? "id" : "slug"} = ?`,
    idOrSlug
  );
  if (!row) return error("Product not found", 404);
  return ok({ product: row });
}

export async function onRequestPut({ request, params, env }) {
  const { user: admin, reason } = await requireProductAccess(request, env.DB);
  if (!admin) {
    return reason === "disabled"
      ? error("Product management has been turned off for Admin Console users. Ask the vendor to re-enable it in the Vendor Portal.", 403)
      : error("Not authenticated", 401);
  }

  const body = await request.json().catch(() => null);
  if (!body) return error("Invalid body");

  const existing = await first(env.DB, "SELECT id, product_code FROM products WHERE id = ?", params.id);
  if (!existing) return error("Product not found", 404);

  // Falls back to the current code rather than clearing it if the field
  // somehow arrives blank -- a product having no Product ID at all isn't a
  // valid state once one's been assigned.
  const productCode = (body.product_code || "").trim() || existing.product_code;

  try {
    await run(
      env.DB,
      `UPDATE products SET name=?, description=?, price_cents=?, currency=?, category_id=?,
         image_url=?, stock_qty=?, is_active=?, product_code=?, updated_at=datetime('now') WHERE id=?`,
      body.name,
      body.description || "",
      body.price_cents,
      body.currency || "INR",
      body.category_id || null,
      body.image_url || "",
      body.stock_qty ?? 0,
      body.is_active ?? 1,
      productCode,
      params.id
    );
    return ok();
  } catch (e) {
    if (isUniqueConstraintError(e)) return error("That Product ID is already in use by another product.", 409);
    throw e;
  }
}

export async function onRequestDelete({ request, params, env }) {
  const { user: admin, reason } = await requireProductAccess(request, env.DB);
  if (!admin) {
    return reason === "disabled"
      ? error("Product management has been turned off for Admin Console users. Ask the vendor to re-enable it in the Vendor Portal.", 403)
      : error("Not authenticated", 401);
  }
  await run(env.DB, "DELETE FROM products WHERE id = ?", params.id);
  return ok();
}
