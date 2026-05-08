// Instagram via Meta Graph API (Business / Creator accounts only).
//
// Auth: long-lived Page access token tied to a Facebook Page that
// is connected to the Instagram Business / Creator account. Setup:
// https://developers.facebook.com/docs/instagram-api/getting-started
//
// Required env:
//   META_PAGE_ACCESS_TOKEN — long-lived Page token (60-day,
//                            refresh via the standard flow)
//   META_INSTAGRAM_ACCOUNT_ID — Instagram business account ID
//                                (NOT the @handle — the numeric ID)
//
// Image attachment: Instagram REQUIRES an image (or video). A
// caption-only post isn't a thing on IG. The image must be on a
// publicly-accessible HTTPS URL — Meta downloads it from there.
// In v1 we expect image_path to point to a CDN-hosted image
// (e.g., uploaded to a public Vercel /public/ asset or a separate
// asset CDN). The cron resolves the local path to a public URL via
// PUBLIC_ASSET_BASE_URL env.

import "server-only";
import type { ContentQueueRow, PublishResult, SocialConnector } from "../types";

const GRAPH_BASE = "https://graph.facebook.com/v22.0";

function isConfigured(): boolean {
  return Boolean(
    process.env.META_PAGE_ACCESS_TOKEN &&
      process.env.META_INSTAGRAM_ACCOUNT_ID,
  );
}

function resolveImageUrl(localPath: string): string | null {
  // Map ryda-marketing/images/generated/<file> → public URL.
  // Pre-deploy: drop the asset into ryda-web/public/marketing/
  // and PUBLIC_ASSET_BASE_URL=https://ryda.pro
  const base = process.env.PUBLIC_ASSET_BASE_URL?.replace(/\/+$/, "");
  if (!base) return null;
  const filename = localPath.split("/").pop();
  if (!filename) return null;
  return `${base}/marketing/${filename}`;
}

async function publish(row: ContentQueueRow): Promise<PublishResult> {
  if (!isConfigured()) {
    return {
      kind: "not_configured",
      missingEnv: [
        "META_PAGE_ACCESS_TOKEN",
        "META_INSTAGRAM_ACCOUNT_ID",
      ].filter((k) => !process.env[k]),
    };
  }
  const token = process.env.META_PAGE_ACCESS_TOKEN!;
  const igAccount = process.env.META_INSTAGRAM_ACCOUNT_ID!;

  if (!row.image_path) {
    return {
      kind: "permanent_error",
      error:
        "Instagram requires an image_path (caption-only posts are not supported by IG).",
    };
  }
  const imageUrl = resolveImageUrl(row.image_path);
  if (!imageUrl) {
    return {
      kind: "permanent_error",
      error:
        "Could not resolve image URL — set PUBLIC_ASSET_BASE_URL env or upload the image to a public CDN.",
    };
  }

  const caption =
    row.body +
    (row.hashtags.length
      ? "\n\n" + row.hashtags.map((h) => `#${h}`).join(" ")
      : "");

  // Meta IG flow: (1) create container, (2) publish container.
  try {
    // Step 1: create the media container.
    const containerResp = await fetch(`${GRAPH_BASE}/${igAccount}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        image_url: imageUrl,
        caption,
        access_token: token,
      }).toString(),
    });
    if (!containerResp.ok) {
      const text = await containerResp.text();
      return {
        kind: containerResp.status >= 500 ? "transient_error" : "permanent_error",
        error: `IG container ${containerResp.status}: ${text.slice(0, 200)}`,
      };
    }
    const { id: containerId } = (await containerResp.json()) as {
      id?: string;
    };
    if (!containerId) {
      return { kind: "permanent_error", error: "IG returned no container id" };
    }

    // Step 2: publish the container. Meta requires the image to
    // be FETCHED + processed before publish; in practice it's
    // ready within a second for static images, but we briefly
    // wait + retry on the "media not ready" error class.
    const publishResp = await fetch(
      `${GRAPH_BASE}/${igAccount}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          creation_id: containerId,
          access_token: token,
        }).toString(),
      },
    );
    if (!publishResp.ok) {
      const text = await publishResp.text();
      // 9007 = media not ready yet (transient); other errors permanent.
      const transient =
        text.includes("media_id_not_available") ||
        publishResp.status >= 500 ||
        publishResp.status === 429;
      return {
        kind: transient ? "transient_error" : "permanent_error",
        error: `IG publish ${publishResp.status}: ${text.slice(0, 200)}`,
      };
    }
    const { id: postId } = (await publishResp.json()) as { id?: string };
    return {
      kind: "published",
      url: postId ? `https://www.instagram.com/p/${postId}/` : null,
    };
  } catch (err) {
    return {
      kind: "transient_error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export const instagramConnector: SocialConnector = {
  channel: "instagram",
  isConfigured,
  publish,
};
