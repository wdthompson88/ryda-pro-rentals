// Resend email connector for marketing campaigns.
//
// Auth: RESEND_API_KEY (already used elsewhere for transactional
// email). Marketing campaigns are sent via Resend's batch send;
// recipients come from the Resend audience configured in
// metadata.audience_id.
//
// Required env:
//   RESEND_API_KEY     — same key as transactional
//   RYDA_NOTIFY_FROM   — verified sender address (already used)
//
// Required per-row metadata:
//   audience_id        — Resend audience UUID to send to
//   subject            — email subject line (required for marketing)
//   reply_to           — optional reply-to address override
//
// Body format: row.body should be an HTML email body. For
// plain-text fallback, set metadata.plain_text. The subject lives
// on row.title.

import "server-only";
import { Resend } from "resend";
import type { ContentQueueRow, PublishResult, SocialConnector } from "../types";

function isConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY && process.env.RYDA_NOTIFY_FROM,
  );
}

async function publish(row: ContentQueueRow): Promise<PublishResult> {
  if (!isConfigured()) {
    return {
      kind: "not_configured",
      missingEnv: ["RESEND_API_KEY", "RYDA_NOTIFY_FROM"].filter(
        (k) => !process.env[k],
      ),
    };
  }
  const audienceId = row.metadata?.audience_id as string | undefined;
  if (!audienceId) {
    return {
      kind: "permanent_error",
      error: "Email row requires metadata.audience_id (Resend audience UUID).",
    };
  }
  if (!row.title) {
    return {
      kind: "permanent_error",
      error: "Email row requires a title (used as the subject line).",
    };
  }

  const resend = new Resend(process.env.RESEND_API_KEY!);
  const from = process.env.RYDA_NOTIFY_FROM!;
  const replyTo =
    typeof row.metadata?.reply_to === "string"
      ? row.metadata.reply_to
      : undefined;

  try {
    // Resend Broadcasts API for marketing sends to an audience.
    // (Direct .emails.send is for transactional one-off; broadcasts
    // are scheduled to the whole audience.)
    const result = await resend.broadcasts.create({
      audienceId,
      from,
      subject: row.title,
      html: row.body,
      replyTo,
    });
    if (result.error) {
      const transient =
        result.error.name === "rate_limit_exceeded" ||
        result.error.name === "internal_server_error";
      return {
        kind: transient ? "transient_error" : "permanent_error",
        error: `Resend ${result.error.name}: ${result.error.message}`,
      };
    }
    // Send the broadcast immediately. Without this it stays as a draft.
    const broadcastId = result.data?.id;
    if (broadcastId) {
      const sendResult = await resend.broadcasts.send(broadcastId);
      if (sendResult.error) {
        return {
          kind: "transient_error",
          error: `Resend broadcast send failed: ${sendResult.error.message}`,
        };
      }
    }
    return {
      kind: "published",
      url: broadcastId
        ? `https://resend.com/broadcasts/${broadcastId}`
        : null,
    };
  } catch (err) {
    return {
      kind: "transient_error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export const emailConnector: SocialConnector = {
  channel: "email",
  isConfigured,
  publish,
};
