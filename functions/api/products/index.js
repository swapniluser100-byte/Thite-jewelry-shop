import { all, run } from "../../lib/db.js";
import { ok, error } from "../../lib/response.js";
import { requireProductAccess } from "../../lib/auth.js";

// GET /api/products            -> public: active products only (storefront)
//   ?admin=1                   -> requires vendor or shop-admin session, and the
//                                  vendor must not have turned off Admin Console
//                                  product access from the Vendor Portal
// POST /api/products           -> same access rule as above: create a product
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const wantsAdmin = url.searchParams.get("admin") === "1";

  if (wantsAdmin) {
    const { user: admin, reason } = await requireProductAccess(request, env.DB);
    if (!admin) {
      return reason === "disabled"
        ? error("Product management has been turned off for Admin Console users. Ask the vendor to re-enable it in the Vendor Portal.", 403)
        : error("Not authenticated", 401);
    }
    const rows = await all(
      env.DB,
      `SELECT p.*, c.name AS category_name FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ORDER BY p.created_at DESC`
    );
    return ok({ products: rows });
  }

  const category = url.searchParams.get("category");
  const search = url.searchParams.get("q");
  let sql = `SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p
             LEFT JOIN categories c ON c.id = p.category_id
             WHERE p.is_active = 1`;
  const params = [];
  if (category) {
    sql += " AND c.slug = ?";
    params.push(category);
  }
  if (search) {
    sql += " AND (p.name LIKE ? OR p.description LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += " ORDER BY p.created_at DESC";
  const rows = await all(env.DB, sql, ...params);
  return ok({ products: rows });
}

export async function onRequestPost({ request, env }) {
  const { user: admin, reason } = await requireProductAccess(request, env.DB);
  if (!admin) {
    return reason === "disabled"
      ? error("Product management has been turned off for Admin Console users. Ask the vendor to re-enable it in the Vendor Portal.", 403)
      : error("Not authenticated", 401);
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.name || body.price_cents == null) {
    return error("name and price_cents are required");
  }

  const slug = (body.slug || body.name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const result = await run(
    env.DB,
    `INSERT INTO products (name, slug, description, price_cents, currency, category_id, image_url, stock_qty, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    body.name,
    slug,
    body.description || "",
    body.price_cents,
    body.currency || "INR",
    body.category_id || null,
    body.image_url || "",
    body.stock_qty ?? 0,
    body.is_active ?? 1
  );

  return ok({ id: result.meta.last_row_id });
}
