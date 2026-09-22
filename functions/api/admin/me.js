import { ok, error } from "../../lib/response.js";
import { requireRole } from "../../lib/auth.js";

// GET /api/admin/me -> current shop-admin session, or 401
export async function onRequestGet({ request, env }) {
  const admin = await requireRole(request, env.DB, ["admin"]);
  if (!admin) return error("Not authenticated", 401);
  return ok({ admin });
}
