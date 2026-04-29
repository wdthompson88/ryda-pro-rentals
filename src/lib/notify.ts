import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

// Sender + recipient are configured via env vars so production uses a verified
// ryda.com domain sender and a team alias (e.g. team@ryda.com). In dev or
// when env vars are unset, calls fall back to a no-op so we never accidentally
// route real form submissions to a personal inbox.
const FROM = process.env.RYDA_NOTIFY_FROM ?? "";
const TEAM_EMAIL = process.env.RYDA_NOTIFY_TO ?? "";

export type NotifyArgs = {
  subject: string;
  html: string;
  replyTo?: string;
};

// Best-effort email notification. Returns true on success, false otherwise.
// Never throws — calling routes treat email as a side effect of the primary
// DB write, not a failure mode.
export async function notifyTeam({ subject, html, replyTo }: NotifyArgs): Promise<boolean> {
  if (!resend || !FROM || !TEAM_EMAIL) {
    console.log("[notify · skipped — missing resend config]", { subject });
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: TEAM_EMAIL,
      subject,
      html,
      replyTo: replyTo || undefined,
    });
    if (error) {
      console.error("[notify · resend]", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[notify · throw]", e);
    return false;
  }
}

// Helpers for building HTML email bodies — kept here so route code stays clean.
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function emailLayout(title: string, innerHtml: string): string {
  return `<!doctype html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f1ec;margin:0;padding:24px;color:#1c1c1c;">
  <table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e1d8;border-radius:12px;overflow:hidden;">
    <tr>
      <td style="background:#0e0e10;color:#f4f1ec;padding:18px 24px;">
        <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#c03030;">RYDA</div>
        <div style="font-size:18px;margin-top:4px;font-weight:500;">${escapeHtml(title)}</div>
      </td>
    </tr>
    <tr><td style="padding:24px;font-size:14px;line-height:1.55;">${innerHtml}</td></tr>
    <tr><td style="background:#faf7f2;padding:14px 24px;color:#7a7770;font-size:11px;border-top:1px solid #e5e1d8;">Sent by RYDA system. Reply to this email to respond directly to the member.</td></tr>
  </table>
</body>
</html>`;
}
