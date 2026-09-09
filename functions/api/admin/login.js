import { first } from "../../lib/db.js";
import { ok, error } from "../../lib/response.js";
import { verifyPassword, createSession, sessionCookieHeader } from "../../lib/auth.js";

// POST /api/admin/login  { email, password }
export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body || !body.email || !body.password) return error("email and password are required");

  const admin = await first(env.DB, "SELECT * FROM admin_users WHERE email = ?", body.email.toLowerCase());
  if (!admin) return error("Invalid email or password", 401);

  const valid = await verifyPassword(body.password, admin.password_hash);
  if (!valid) return error("Invalid email or password", 401);

  const session = await createSession(env.DB, admin.id);
  const response = ok({ admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } });
  response.headers.append("Set-Cookie", sessionCookieHeader(session.id, session.expires));
  return response;
}
