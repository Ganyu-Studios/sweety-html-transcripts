import type { APIChannel, APIGuildMember, APIMessage, APIRole, APIUser, ChannelType } from 'discord-api-types/v10';

/**
 * Bumped whenever the shape below changes in a way an older renderer cannot read.
 */
export const TRANSCRIPT_VERSION = 1;

/** The guild fields a transcript needs. */
export interface TranscriptGuild {
  id: string;
  name: string;
  icon: string | null;
}

/** The channel fields a transcript needs, for the transcript channel and any channel it mentions. */
export interface TranscriptChannel {
  id: string;
  type: ChannelType;
  name?: string | null;
  topic?: string | null;
  guild_id?: string;
  parent_id?: string | null;
  owner_id?: string;
  recipients?: APIUser[];
}

/** A guild member without its user, which lives in {@link Transcript.users}. */
export type TranscriptMember = Omit<APIGuildMember, 'user'>;

/**
 * Everything needed to render a transcript, gathered once by `fetch`.
 *
 * It is plain JSON on purpose: store it, send it elsewhere, and render it later with `render`,
 * without a bot or a network connection. Messages are the raw Discord API objects, untouched.
 */
export interface Transcript {
  version: typeof TRANSCRIPT_VERSION;
  /** ISO timestamp of when the transcript was fetched. */
  exportedAt: string;

  channel: TranscriptChannel;
  guild: TranscriptGuild | null;

  /** Raw API messages, oldest first. */
  messages: APIMessage[];

  /** Every user the transcript references, by id. */
  users: Record<string, APIUser>;
  /** Guild members by user id. Users that are no longer members are absent. */
  members: Record<string, TranscriptMember>;
  /** Guild roles by id. */
  roles: Record<string, APIRole>;
  /** Channels referenced by mentions, threads, select menus or forwards, by id. */
  channels: Record<string, TranscriptChannel>;
  /** Other guilds referenced by forwarded messages, by id. */
  guilds: Record<string, TranscriptGuild>;

  /** The latest message of each thread started in the channel, by thread id. */
  threads: Record<string, APIMessage>;
  /** Contents of small text attachments, shown as inline previews, by attachment id. */
  files: Record<string, string>;
  /**
   * Replacement sources for media, by original url: a data url when images were saved, `null` to
   * drop the attachment from the transcript.
   */
  assets: Record<string, string | null>;
}

export type { APIChannel, APIGuildMember, APIMessage, APIRole, APIUser };
