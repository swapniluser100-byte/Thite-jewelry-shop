import { first, run } from "../../lib/db.js";
import { ok, error } from "../../lib/response.js";
import { requireAdmin } from "../../lib/auth.js";

// GET /api/products/:id     -> public (by numeric id or slug)
// PUT /api/products/:id     -> admin only
// DELETE /api/products/:id  -> admin only
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
  const admin = await requireAdmin(request, env.DB);
  if (!admin) return error("Not authenticated", 401);

  const body = await request.json().catch(() => null);
  if (!body) return error("Invalid body");

  const existing = await first(env.DB, "SELECT id FROM products WHERE id = ?", params.id);
  if (!existing) return error("Product not found", 404);

  await run(
    env.DB,
    `UPDATE products SET name=?, description=?, price_cents=?, currency=?, category_id=?,
       image_url=?, stock_qty=?, is_active=?, updated_at=datetime('now') WHERE id=?`,
    body.name,
    body.description || "",
    body.price_cents,
    body.currency || "INR",
    body.category_id || null,
    body.image_url || "",
    body.stock_qty ?? 0,
    body.is_active ?? 1,
    params.id
  );
  return ok();
}

export async function onRequestDelete({ request, params, env }) {
  const admin = await requireAdmin(request, env.DB);
  if (!admin) return error("Not authenticated", 401);
  await run(env.DB, "DELETE FROM products WHERE id = ?", params.id);
  return ok();
}
