// LinkedIn REST API connector.
//
// Auth: OAuth 2.0 access token with `w_member_social` scope. Member
// auth flow: https://learn.microsoft.com/en-us/linkedin/marketing/getting-access
// Once you have the token + the URN of the person/org posting,
// stash both in Vercel env.
//
// Required env:
//   LINKEDIN_ACCESS_TOKEN — OAuth 2.0 token (w_member_social scope)
//   LINKEDIN_AUTHOR_URN   — "urn:li:person:<id>" or "urn:li:organization:<id>"
//
// Image attachment: LinkedIn uses a 3-step upload flow (register
// upload → PUT image → reference asset URN in the post). Currently
// supports text-only; image attachment is a follow-up.

import "server-only";
import type { ContentQueueRow, PublishResult, SocialConnector } from "../types";

const POST_URL = "https://api.linkedin.com/v2/ugcPosts";

function isConfigured(): boolean {
  return Boolean(
    process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_AUTHOR_URN,
  );
}

async function publish(row: ContentQueueRow): Promise<PublishResult> {
  if (!isConfigured()) {
    return {
      kind: "not_configured",
      missingEnv: ["LINKEDIN_ACCESS_TOKEN", "LINKEDIN_AUTHOR_URN"].filter(
        (k) => !process.env[k],
      ),
    };
  }
  const token = process.env.LINKEDIN_ACCESS_TOKEN!;
  const authorUrn = process.env.LINKEDIN_AUTHOR_URN!;

  // LinkedIn UGC payload. specificContent picks the post format.
  // shareMediaCategory=NONE for text-only; IMAGE/ARTICLE for the
  // attachment cases (not implemented in v1).
  const payload = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: {
          text:
            row.body +
            (row.hashtags.length
              ? "\n\n" + row.hashtags.map((h) => `#${h}`).join(" ")
              : ""),
        },
        shareMediaCategory: "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility":
        (row.metadata?.visibility as string) ?? "PUBLIC",
    },
  };

  try {
    const resp = await fetch(POST_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const text = await resp.text();
      const status = resp.status;
      const transient = status === 429 || (status >= 500 && status < 600);
      return {
        kind: transient ? "transient_error" : "permanent_error",
        error: `LinkedIn API ${status}: ${text.slice(0, 200)}`,
      };
    }
    // LinkedIn returns the post URN in x-restli-id; the canonical
    // URL needs to be assembled from that.
    const urn = resp.headers.get("x-restli-id") ?? "";
    const url = urn ? `https://www.linkedin.com/feed/update/${urn}/` : null;
    return { kind: "published", url };
  } catch (err) {
    return {
      kind: "transient_error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export const linkedinConnector: SocialConnector = {
  channel: "linkedin",
  isConfigured,
  publish,
};
