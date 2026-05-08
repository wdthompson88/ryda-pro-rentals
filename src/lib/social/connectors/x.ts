// X (Twitter) v2 API connector.
//
// Auth: OAuth 2.0 user-context bearer token. The token must have
// the `tweet.write` + `users.read` scopes. Generate via the
// developer portal at https://developer.x.com.
//
// Required env:
//   X_BEARER_TOKEN — OAuth 2.0 user-context token (NOT the app-only
//                    bearer; that token can't post on behalf of a user).
//
// Image attachment: X requires a 2-step flow — upload media via
// the v1.1 media endpoint (yes, the old endpoint is the only way
// to upload images for v2 tweets), then attach the returned
// media_id to the v2 tweet payload. We currently support text-
// only posting. Image attachment is a follow-up.

import "server-only";
import type { ContentQueueRow, PublishResult, SocialConnector } from "../types";

const POST_URL = "https://api.x.com/2/tweets";

function isConfigured(): boolean {
  return Boolean(process.env.X_BEARER_TOKEN);
}

async function publish(row: ContentQueueRow): Promise<PublishResult> {
  if (!isConfigured()) {
    return { kind: "not_configured", missingEnv: ["X_BEARER_TOKEN"] };
  }
  const token = process.env.X_BEARER_TOKEN!;

  // X tweets are capped at 280 chars (Premium accounts up to 25K
  // but the API enforces the basic limit unless the account is
  // explicitly Premium-enabled).
  if (row.body.length > 280) {
    return {
      kind: "permanent_error",
      error: `Tweet exceeds 280 chars (got ${row.body.length}). Split into a thread.`,
    };
  }

  // Threading: when metadata.thread_count > 1, the cron is expected
  // to publish each part sequentially with in_reply_to set on
  // parts 2+. v1 keeps it simple — one row, one tweet.
  const payload: Record<string, unknown> = { text: row.body };
  const inReplyTo =
    typeof row.metadata?.in_reply_to === "string"
      ? row.metadata.in_reply_to
      : null;
  if (inReplyTo) {
    payload.reply = { in_reply_to_tweet_id: inReplyTo };
  }

  try {
    const resp = await fetch(POST_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const text = await resp.text();
      // 401/403 = bad token (permanent until rotated). 4xx other
      // = bad payload (permanent for this row). 5xx + 429 = transient.
      const status = resp.status;
      const transient = status === 429 || (status >= 500 && status < 600);
      return {
        kind: transient ? "transient_error" : "permanent_error",
        error: `X API ${status}: ${text.slice(0, 200)}`,
      };
    }
    const data = (await resp.json()) as { data?: { id?: string } };
    const tweetId = data.data?.id ?? null;
    return {
      kind: "published",
      url: tweetId ? `https://x.com/i/web/status/${tweetId}` : null,
    };
  } catch (err) {
    return {
      kind: "transient_error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export const xConnector: SocialConnector = {
  channel: "x",
  isConfigured,
  publish,
};
