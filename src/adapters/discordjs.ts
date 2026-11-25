import type { APIGuildMember, APIRole, APIUser, ChannelType } from 'discord-api-types/v10';
import type { TranscriptChannel, TranscriptGuild } from '../model';
import type { TranscriptAdapter, TranscriptCache } from './types';
import { cleanQuery, rememberMisses } from './types';

/**
 * The parts of a discord.js `Client` the adapter uses. Typed structurally so this module never
 * imports discord.js, and any client exposing `rest.get` works.
 */
export interface DiscordJSClientLike {
  rest: {
    get(route: `/${string}`, options?: { query?: URLSearchParams }): Promise<unknown>;
  };
  /** The client's managers (`client.channels`, `client.guilds`, `client.users`): their caches and `fetch()`. */
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
   * Look channels, guilds, roles, members and users up through the client's managers: their cache
   * first, then `fetch()`, which stores what it gets for the next transcript. `false` asks the API
   * directly every time.
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
  readonly size?: number;
}
/** A discord.js manager: its cache, and `fetch()` (cache first, then the API, stored in the cache). */
interface Manager<V, F extends unknown[] = [id: string]> {
  cache: Cache<V>;
  fetch?(...args: F): Promise<V>;
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
type ListManager<V> = { cache: Cache<V>; fetch?(): Promise<Cache<V>> };
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
  roles: ListManager<DJSRole>;
  channels: ListManager<DJSChannel | null>;
  members: Manager<DJSMember>;
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

/** Everything in a list manager: its cache when it has anything, otherwise `fetch()`. */
async function listOf<V>(manager: ListManager<V>): Promise<V[]> {
  if (manager.cache.size !== 0 || !manager.fetch) return [...manager.cache.values()];
  return [...(await manager.fetch()).values()];
}

/**
 * Lookups through the client's managers. `fetch()` returns the cached structure when there is one,
 * and otherwise requests it and caches it, the way the bot itself would.
 */
function discordjsLookups(client: {
  channels?: Manager<DJSChannel | null>;
  guilds?: Manager<DJSGuild>;
  users?: Manager<DJSUser>;
}): TranscriptCache {
  const fetchOne = async <V>(manager: Manager<V> | undefined, id: string): Promise<V | undefined> =>
    manager ? ((manager.cache.get(id) ?? (await manager.fetch?.(id))) as V | undefined) : undefined;

  const guild = (id: string) => fetchOne(client.guilds, id);

  return {
    channel: async (id) => {
      const found = await fetchOne(client.channels, id);
      return found ? channel(found) : undefined;
    },
    channels: async (guildId) => {
      const found = await guild(guildId);
      if (!found) return undefined;
      return (await listOf(found.channels)).filter((item): item is DJSChannel => item !== null).map(channel);
    },
    guild: async (id) => {
      const found = await guild(id);
      return found ? ({ id: found.id, name: found.name, icon: found.icon } satisfies TranscriptGuild) : undefined;
    },
    roles: async (guildId) => {
      const found = await guild(guildId);
      return found ? (await listOf(found.roles)).map(role) : undefined;
    },
    member: async (guildId, userId) => {
      const found = await guild(guildId);
      const member = found ? await fetchOne(found.members, userId) : undefined;
      if (!member) return undefined;
      return {
        nick: member.nickname,
        avatar: member.avatar,
        roles: [...member.roles.cache.values()].map((r) => r.id).filter((id) => id !== guildId),
        joined_at: member.joinedAt?.toISOString() ?? null,
        user: user(member.user),
      } as APIGuildMember;
    },
    user: async (id) => {
      const found = await fetchOne(client.users, id);
      return found ? user(found) : undefined;
    },
  };
}

/**
 * Adapter for discord.js. Channels, guilds, roles, members and users go through the client's
 * managers: from their cache when they have them, otherwise through `fetch()`, which stores them so
 * the next transcript does not ask the API again. Messages always come from `client.rest` as raw
 * API objects.
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
    cache:
      options.cache === false
        ? undefined
        : rememberMisses(discordjsLookups(client as Parameters<typeof discordjsLookups>[0])),
    file: (data, name) => ({ attachment: data, name }),
  };
}

/** 0.x names, kept for `sweety-html-transcripts/adapters/*` imports. */
export { DiscordJSTranscript, DiscordJSTranscriptAdapter, ExportReturnType } from '../legacy';
