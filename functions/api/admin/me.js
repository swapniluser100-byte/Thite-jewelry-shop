import { ok, error } from "../../lib/response.js";
import { requireAdmin } from "../../lib/auth.js";

// GET /api/admin/me -> current admin session, or 401
export async function onRequestGet({ request, env }) {
  const admin = await requireAdmin(request, env.DB);
  if (!admin) return error("Not authenticated", 401);
  return ok({ admin });
}
