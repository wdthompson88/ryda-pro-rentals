// Public entrypoint for the social-publish subsystem.
// Routes the cron at /api/cron/social-publisher hits this; it
// looks up the right connector by channel, calls publish(), and
// dispatches to the channel-specific implementation.

import "server-only";
import type { Channel, ContentQueueRow, PublishResult, SocialConnector } from "./types";
import { xConnector } from "./connectors/x";
import { linkedinConnector } from "./connectors/linkedin";
import { instagramConnector } from "./connectors/instagram";
import { emailConnector } from "./connectors/email";

export type { Channel, ContentQueueRow, PublishResult, SocialConnector };

const REGISTRY: Record<Channel, SocialConnector | null> = {
  linkedin: linkedinConnector,
  x: xConnector,
  instagram: instagramConnector,
  email: emailConnector,
  // Journal posts publish via a different path (Markdown commit to
  // src/lib/journal-content.ts + deploy). Not autonomous yet —
  // founder/ops manually moves drafts into the file. Future work:
  // a "journal" connector that auto-PRs the markdown to the repo.
  journal: null,
};

export function getConnector(channel: Channel): SocialConnector | null {
  return REGISTRY[channel] ?? null;
}

/** Publish a queued content row through the appropriate connector.
 *  Used by /api/cron/social-publisher. */
export async function publishRow(row: ContentQueueRow): Promise<PublishResult> {
  const connector = getConnector(row.channel);
  if (!connector) {
    return {
      kind: "permanent_error",
      error: `No connector registered for channel '${row.channel}'.`,
    };
  }
  return connector.publish(row);
}

/** Status snapshot for the admin queue UI: which channels are
 *  configured (have credentials present in env)? Returned to the
 *  /admin/content-queue page so ops sees at a glance whether
 *  scheduling a LinkedIn post will actually publish. */
export function connectorStatus(): {
  channel: Channel;
  configured: boolean;
}[] {
  return (Object.keys(REGISTRY) as Channel[]).map((channel) => {
    const connector = REGISTRY[channel];
    return {
      channel,
      configured: connector ? connector.isConfigured() : false,
    };
  });
}
