import { all, run } from "../../lib/db.js";
import { ok, error } from "../../lib/response.js";
import { requireRole } from "../../lib/auth.js";

// GET /api/categories  -> public
// POST /api/categories -> vendor or shop-admin
export async function onRequestGet({ env }) {
  const rows = await all(env.DB, "SELECT * FROM categories ORDER BY name ASC");
  return ok({ categories: rows });
}

export async function onRequestPost({ request, env }) {
  const admin = await requireRole(request, env.DB, ["vendor", "admin"]);
  if (!admin) return error("Not authenticated", 401);

  const body = await request.json().catch(() => null);
  if (!body || !body.name) return error("name is required");

  const slug = (body.slug || body.name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const result = await run(
    env.DB,
    "INSERT INTO categories (name, slug) VALUES (?, ?)",
    body.name,
    slug
  );
  return ok({ id: result.meta.last_row_id });
}
