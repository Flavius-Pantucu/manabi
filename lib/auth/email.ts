/**
 * Outbound email.
 *
 * One function with two backends. With `RESEND_API_KEY` set it posts to
 * Resend; without one it writes the message to the server log — including the
 * full reset link, so password reset is testable end to end on a laptop with
 * no mail provider, no API key and no inbox.
 *
 * The dev path deliberately logs the link rather than swallowing it. A reset
 * flow that silently succeeds and delivers nothing is the single most common
 * way this feature ships broken.
 */

interface Mail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

const FROM = process.env.EMAIL_FROM ?? "Manabi <onboarding@resend.dev>";

export async function sendEmail(mail: Mail): Promise<void> {
  const key = process.env.RESEND_API_KEY;

  if (!key) {
    console.info(
      [
        "",
        "──── email (no RESEND_API_KEY — not sent) ────",
        `to:      ${mail.to}`,
        `subject: ${mail.subject}`,
        "",
        mail.text,
        "──────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    }),
  });

  if (!res.ok) {
    // Surfaced, never thrown to the caller: a failed send must not tell an
    // unauthenticated visitor whether the address exists.
    console.error(`email send failed (${res.status}): ${await res.text()}`);
  }
}

export function resetPasswordEmail(name: string, url: string): Mail {
  return {
    to: "",
    subject: "Reset your Manabi password",
    text: [
      `Hi ${name},`,
      "",
      "Someone asked to reset the password on your Manabi account.",
      "Open this link within the hour to choose a new one:",
      "",
      url,
      "",
      "If that wasn't you, ignore this — your password stays as it is.",
      "",
      "頑張って,",
      "Manabi",
    ].join("\n"),
  };
}
