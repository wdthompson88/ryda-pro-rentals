// Shared types for the social-publish subsystem.
// Connectors at lib/social/connectors/<channel>.ts each implement
// the same SocialConnector interface; the cron at
// /api/cron/social-publisher dispatches to the right one based on
// content_queue.channel.

export type Channel =
  | "linkedin"
  | "x"
  | "instagram"
  | "email"
  | "journal";

export type ContentQueueRow = {
  id: string;
  channel: Channel;
  title: string | null;
  body: string;
  image_path: string | null;
  hashtags: string[];
  metadata: Record<string, unknown>;
  status:
    | "draft"
    | "approved"
    | "scheduled"
    | "processing"
    | "published"
    | "failed";
  scheduled_at: string | null;
  published_at: string | null;
  published_url: string | null;
  retry_count: number;
  last_error: string | null;
  source_file: string | null;
};

export type PublishResult =
  | { kind: "published"; url: string | null }
  | { kind: "transient_error"; error: string }
  | { kind: "permanent_error"; error: string }
  | { kind: "not_configured"; missingEnv: string[] };

/** Each channel connector implements this single function. */
export type SocialConnector = {
  channel: Channel;
  /** True iff the env credentials needed for this channel are
   *  present. The cron skips not-configured channels (logs +
   *  returns, no row mutation) so a half-configured rollout
   *  doesn't fail loudly. */
  isConfigured(): boolean;
  publish(row: ContentQueueRow): Promise<PublishResult>;
};
