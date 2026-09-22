import { ok, error } from "../../lib/response.js";
import { requireRole } from "../../lib/auth.js";

// GET /api/vendor/me -> current vendor session, or 401
export async function onRequestGet({ request, env }) {
  const vendor = await requireRole(request, env.DB, ["vendor"]);
  if (!vendor) return error("Not authenticated", 401);
  return ok({ admin: vendor });
}
