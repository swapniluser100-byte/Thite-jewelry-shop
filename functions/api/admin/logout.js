import { ok } from "../../lib/response.js";
import { parseCookies, clearSessionCookieHeader, SESSION_COOKIE } from "../../lib/auth.js";

// POST /api/admin/logout
export async function onRequestPost({ request, env }) {
  const cookies = parseCookies(request);
  const sessionId = cookies[SESSION_COOKIE];
  if (sessionId) {
    await env.DB.prepare("DELETE FROM admin_sessions WHERE id = ?").bind(sessionId).run();
  }
  const response = ok();
  response.headers.append("Set-Cookie", clearSessionCookieHeader());
  return response;
}
