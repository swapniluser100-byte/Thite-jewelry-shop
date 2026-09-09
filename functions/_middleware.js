import { corsHeaders } from "./lib/response.js";

// Runs before every /functions route. Handles CORS preflight and makes sure
// every response (including errors thrown deeper in) carries CORS headers.
export async function onRequest({ request, next }) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  const response = await next();
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(corsHeaders())) headers.set(k, v);
  return new Response(response.body, { status: response.status, headers });
}
