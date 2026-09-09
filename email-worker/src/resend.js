// Minimal Resend API client (https://resend.com/docs/api-reference/emails/send-email).
// Swap this file out if you'd rather use SendGrid/Postmark/SES — everything
// else in this worker only calls sendEmail(), so it's the one place to change.
export async function sendEmail(env, { to, from, subject, html }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend API error (${response.status}): ${body}`);
  }
  return response.json();
}
