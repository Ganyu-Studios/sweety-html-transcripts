import type { APIGuildMember, APIRole, APIUser, ChannelType } from 'discord-api-types/v10';
import type { TranscriptChannel, TranscriptGuild } from '../model';
import type { TranscriptAdapter, TranscriptCache } from './types';
import { cleanQuery } from './types';

/**
 * The parts of a discord.js `Client` the adapter uses. Typed structurally so this module never
 * imports discord.js, and any client exposing `rest.get` works.
 */
export interface DiscordJSClientLike {
  rest: {
    get(route: `/${string}`, options?: { query?: URLSearchParams }): Promise<unknown>;
  };
  /** The client's caches (`client.channels`, `client.guilds`, `client.users`). */
  channels?: unknown;
  guilds?: unknown;
  users?: unknown;
}

/** discord.js accepts this plain object in `files`. */
export interface DiscordJSFile {
  attachment: Buffer;
  name: string;
}

export interface DiscordJSAdapterOptions {
  /**
   * Read channels, guilds, roles, members and users from the client's caches before asking the API.
   * @default true
   */
  cache?: boolean;
}

// The discord.js structures read from the cache, reduced to the fields the transcript model uses.
// discord.js caches structures rather than API objects, so these are mapped back below; messages
// always come from REST as raw objects, so this is the only mapping there is.
interface Cache<V> {
  get(key: string): V | undefined;
  values(): Iterable<V>;
}
interface DJSUser {
  id: string;
  username: string;
  discriminator: string;
  globalName: string | null;
  avatar: string | null;
  bot: boolean;
  flags?: { bitfield: number } | null;
  primaryGuild?: { identityGuildId: string | null; tag: string | null; badge: string | null } | null;
}
interface DJSRole {
  id: string;
  name: string;
  color: number;
  colors?: { primaryColor: number; secondaryColor: number | null; tertiaryColor: number | null };
  position: number;
  icon: string | null;
  unicodeEmoji?: string | null;
}
interface DJSMember {
  nickname: string | null;
  avatar: string | null;
  joinedAt?: Date | null;
  roles: { cache: Cache<DJSRole> };
  user: DJSUser;
}
interface DJSChannel {
  id: string;
  type: ChannelType;
  name?: string | null;
  topic?: string | null;
  guildId?: string | null;
  parentId?: string | null;
  ownerId?: string | null;
}
interface DJSGuild {
  id: string;
  name: string;
  icon: string | null;
  roles: { cache: Cache<DJSRole> };
  channels: { cache: Cache<DJSChannel> };
  members: { cache: Cache<DJSMember> };
}

const user = (u: DJSUser): APIUser => ({
  id: u.id,
  username: u.username,
  discriminator: u.discriminator,
  global_name: u.globalName,
  avatar: u.avatar,
  bot: u.bot || undefined,
  public_flags: u.flags?.bitfield,
  primary_guild: u.primaryGuild
    ? {
        identity_guild_id: u.primaryGuild.identityGuildId,
        identity_enabled: null,
        tag: u.primaryGuild.tag,
        badge: u.primaryGuild.badge,
      }
    : undefined,
});

const role = (r: DJSRole): APIRole =>
  ({
    id: r.id,
    name: r.name,
    color: r.color,
    colors: r.colors
      ? {
          primary_color: r.colors.primaryColor,
          secondary_color: r.colors.secondaryColor,
          tertiary_color: r.colors.tertiaryColor,
        }
      : undefined,
    position: r.position,
    icon: r.icon,
    unicode_emoji: r.unicodeEmoji ?? null,
  }) as APIRole;

const channel = (c: DJSChannel): TranscriptChannel => ({
  id: c.id,
  type: c.type,
  name: c.name ?? null,
  topic: c.topic ?? null,
  guild_id: c.guildId ?? undefined,
  parent_id: c.parentId ?? null,
  owner_id: c.ownerId ?? undefined,
});

function discordjsCache(client: {
  channels?: { cache: Cache<DJSChannel> };
  guilds?: { cache: Cache<DJSGuild> };
  users?: { cache: Cache<DJSUser> };
}): TranscriptCache {
  const guild = (id: string): DJSGuild | undefined => client.guilds?.cache.get(id);

  return {
    channel: (id) => {
      const found = client.channels?.cache.get(id);
      return found ? channel(found) : undefined;
    },
    channels: (guildId) => {
      const found = guild(guildId);
      return found ? [...found.channels.cache.values()].map(channel) : undefined;
    },
    guild: (id) => {
      const found = guild(id);
      return found ? ({ id: found.id, name: found.name, icon: found.icon } satisfies TranscriptGuild) : undefined;
    },
    roles: (guildId) => {
      const found = guild(guildId);
      return found ? [...found.roles.cache.values()].map(role) : undefined;
    },
    member: (guildId, userId) => {
      const found = guild(guildId)?.members.cache.get(userId);
      if (!found) return undefined;
      return {
        nick: found.nickname,
        avatar: found.avatar,
        roles: [...found.roles.cache.values()].map((r) => r.id).filter((id) => id !== guildId),
        joined_at: found.joinedAt?.toISOString() ?? null,
        user: user(found.user),
      } as APIGuildMember;
    },
    user: (id) => {
      const found = client.users?.cache.get(id);
      return found ? user(found) : undefined;
    },
  };
}

/**
 * Adapter for discord.js. Channels, guilds, roles, members and users come from the client's caches
 * when they have them, and from `client.rest` (which returns raw API objects and handles rate
 * limits) otherwise. Messages always come from `client.rest`.
 *
 * @example
 * const transcripts = createTranscripts(discordjs(client));
 */
export function discordjs(
  client: DiscordJSClientLike,
  options: DiscordJSAdapterOptions = {}
): TranscriptAdapter<DiscordJSFile> {
  return {
    get: <T>(route: `/${string}`, query?: Record<string, string | number | boolean | undefined>) => {
      const params = cleanQuery(query);
      return client.rest.get(route, params ? { query: new URLSearchParams(params) } : undefined) as Promise<T>;
    },
    cache: options.cache === false ? undefined : discordjsCache(client as Parameters<typeof discordjsCache>[0]),
    file: (data, name) => ({ attachment: data, name }),
  };
}

/** 0.x names, kept for `sweety-html-transcripts/adapters/*` imports. */
export { DiscordJSTranscript, DiscordJSTranscriptAdapter, ExportReturnType } from '../legacy';
