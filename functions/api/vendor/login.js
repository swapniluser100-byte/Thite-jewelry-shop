import { first } from "../../lib/db.js";
import { ok, error } from "../../lib/response.js";
import { verifyPassword, createSession, sessionCookieHeader } from "../../lib/auth.js";

// POST /api/vendor/login  { email, password }
export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body || !body.email || !body.password) return error("email and password are required");

  const vendor = await first(env.DB, "SELECT * FROM admin_users WHERE email = ?", body.email.toLowerCase());
  if (!vendor || vendor.role !== "vendor") return error("Invalid email or password", 401);

  const valid = await verifyPassword(body.password, vendor.password_hash);
  if (!valid) return error("Invalid email or password", 401);

  const session = await createSession(env.DB, vendor.id);
  const response = ok({ admin: { id: vendor.id, email: vendor.email, name: vendor.name, role: vendor.role } });
  response.headers.append("Set-Cookie", sessionCookieHeader(session.id, session.expires));
  return response;
}
