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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function resetPasswordEmail(name: string, url: string): Mail {
  const safeName = escapeHtml(name || "there");
  const safeUrl = escapeHtml(url);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your Manabi password</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f172a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#1e293b;border:1px solid #334155;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 20px;border-bottom:1px solid #334155;background:linear-gradient(135deg,rgba(37,78,219,0.18),rgba(220,38,38,0.12));">
              <p style="margin:0;font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#f8fafc;">Manabi</p>
              <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">Language Learning Platform · Spanish · French · Japanese</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#f8fafc;">Reset your password</h1>
              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#cbd5e1;">
                Hi ${safeName},
              </p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#cbd5e1;">
                We received a request to reset the password for your Manabi account. Click the button below within the next hour to choose a new password:
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
                <tr>
                  <td align="center" style="border-radius:10px;background-color:#254edb;">
                    <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:#94a3b8;">
                If the button doesn&rsquo;t work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 24px;font-size:12px;line-height:1.5;word-break:break-all;color:#60a5fa;">
                <a href="${safeUrl}" style="color:#60a5fa;text-decoration:underline;">${safeUrl}</a>
              </p>
              <p style="margin:0;padding-top:16px;border-top:1px solid #334155;font-size:12px;line-height:1.5;color:#94a3b8;">
                If you didn&rsquo;t request this, you can safely ignore this email &mdash; your password won&rsquo;t change.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    to: "",
    subject: "Reset your Manabi password",
    text: [
      `Hi ${name || "there"},`,
      "",
      "We received a request to reset the password on your Manabi account.",
      "Open this link within the hour to choose a new one:",
      "",
      url,
      "",
      "If that wasn't you, ignore this — your password stays as it is.",
      "",
      "— Manabi",
    ].join("\n"),
    html,
  };
}
