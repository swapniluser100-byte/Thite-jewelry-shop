// Minimal admin session auth: opaque random session id stored in D1 (admin_sessions),
// handed to the browser as an HttpOnly cookie. Good enough for a small shop with a
// handful of staff logins; swap for something heavier if the team grows a lot.

const SESSION_COOKIE = "admin_session";
const SESSION_TTL_HOURS = 12;

export async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createPasswordHash(password) {
  const salt = crypto.randomUUID();
  const hash = await hashPassword(password, salt);
  return `${salt}$${hash}`;
}

export async function verifyPassword(password, stored) {
  const [salt, hash] = (stored || "").split("$");
  if (!salt || !hash) return false;
  const check = await hashPassword(password, salt);
  return timingSafeEqual(check, hash);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

export function parseCookies(request) {
  const header = request.headers.get("cookie") || "";
  const out = {};
  header.split(";").forEach((part) => {
    const [k, ...v] = part.trim().split("=");
    if (k) out[k] = decodeURIComponent(v.join("="));
  });
  return out;
}

export async function createSession(db, adminId) {
  const id = crypto.randomUUID();
  const expires = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1000).toISOString();
  await db.prepare("INSERT INTO admin_sessions (id, admin_id, expires_at) VALUES (?, ?, ?)")
    .bind(id, adminId, expires)
    .run();
  return { id, expires };
}

export function sessionCookieHeader(sessionId, expires) {
  const exp = new Date(expires).toUTCString();
  return `${SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${exp}`;
}

export function clearSessionCookieHeader() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

// Returns the admin_users row for the current request, or null if not authenticated.
export async function requireAdmin(request, db) {
  const cookies = parseCookies(request);
  const sessionId = cookies[SESSION_COOKIE];
  if (!sessionId) return null;

  const session = await db
    .prepare("SELECT * FROM admin_sessions WHERE id = ?")
    .bind(sessionId)
    .first();
  if (!session) return null;
  if (new Date(session.expires_at) < new Date()) {
    await db.prepare("DELETE FROM admin_sessions WHERE id = ?").bind(sessionId).run();
    return null;
  }

  const admin = await db
    .prepare("SELECT id, email, name, role FROM admin_users WHERE id = ?")
    .bind(session.admin_id)
    .first();
  return admin || null;
}

export { SESSION_COOKIE };
