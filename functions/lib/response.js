// Small helpers for consistent JSON responses + CORS across every API route.

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json;charset=UTF-8",
      ...corsHeaders(),
      ...(init.headers || {}),
    },
  });
}

export function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type,authorization,cookie",
  };
}

export function error(message, status = 400, extra = {}) {
  return json({ ok: false, error: message, ...extra }, { status });
}

export function ok(data = {}) {
  return json({ ok: true, ...data });
}
