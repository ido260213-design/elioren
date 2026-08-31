import "server-only";

// Minimal email sender. HireUp's build spec only lists Supabase/Anthropic/Stripe/Mapbox
// env vars — no email provider — so this reads an optional RESEND_API_KEY. Without it
// (e.g. in local dev), it logs the email instead of sending, so the guardian-confirmation
// flow is still fully exercisable end-to-end without a real provider configured.
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(`[email:dev-fallback] to=${to} subject="${subject}"\n${html}`);
    return { delivered: false as const };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "HireUp <noreply@hireup.app>",
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    console.error("Failed to send email", await res.text());
    return { delivered: false as const };
  }

  return { delivered: true as const };
}

export function guardianConfirmationEmail({
  teenName,
  confirmUrl,
}: {
  teenName: string;
  confirmUrl: string;
}) {
  return {
    subject: `Confirm you're ${teenName}'s parent/guardian on HireUp`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>HireUp guardian confirmation</h2>
        <p>${teenName} has created an account on HireUp, a marketplace connecting teens with
        part-time and one-time work, and listed you as their parent/guardian.</p>
        <p>If you're okay with this, confirm below:</p>
        <p><a href="${confirmUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Confirm guardian consent</a></p>
        <p>If you don't recognize this request, you can safely ignore this email.</p>
      </div>
    `,
  };
}
