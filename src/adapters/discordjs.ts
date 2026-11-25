import type { APIGuildMember, APIRole, APIUser } from 'discord-api-types/v10';
import type { Channel, Client, Collection, Guild, GuildBasedChannel, GuildMember, Role, User } from 'discord.js';
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

/**
 * The parts of a discord.js client read here, with discord.js's own types. Partial, so a client-like
 * object without some managers still works.
 *
 * Only used inside this module, so the published declarations never import discord.js.
 */
type DiscordJSParts = Partial<Pick<Client, 'channels' | 'guilds' | 'users'>>;

// discord.js caches structures rather than API objects, so the few the transcript needs are mapped
// back here. Messages always come from REST as raw objects, so this is the only mapping there is.
// Fields added in later 14.x releases (`primaryGuild`, `colors`) are read defensively.

const user = (u: User): APIUser => ({
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

const role = (r: Role): APIRole =>
  ({
    id: r.id,
    name: r.name,
    color: r.color,
    colors: (r.colors as Role['colors'] | undefined)
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

const channel = (c: Channel): TranscriptChannel => ({
  id: c.id,
  type: c.type as number as TranscriptChannel['type'],
  name: 'name' in c ? (c.name ?? null) : null,
  topic: 'topic' in c ? (c.topic ?? null) : null,
  guild_id: 'guildId' in c ? (c.guildId ?? undefined) : undefined,
  parent_id: 'parentId' in c ? (c.parentId ?? null) : null,
  owner_id: 'ownerId' in c ? (c.ownerId ?? undefined) : undefined,
});

/** A guild's roles or channels: the cache when it has any, otherwise `fetch()`, which caches them. */
async function listOf<V>(manager: {
  cache: Collection<string, V>;
  fetch?(): Promise<Collection<string, V>>;
}): Promise<V[]> {
  if (manager.cache.size !== 0 || !manager.fetch) return [...manager.cache.values()];
  return [...(await manager.fetch()).values()];
}

/**
 * Lookups through the client's managers: the cached structure when there is one, otherwise
 * `fetch()`, which requests it and caches it, the way the bot itself would.
 */
function discordjsLookups(client: DiscordJSParts): TranscriptCache {
  const guild = async (id: string): Promise<Guild | undefined> =>
    client.guilds?.cache.get(id) ?? (await client.guilds?.fetch?.(id));

  return {
    channel: async (id) => {
      const found = client.channels?.cache.get(id) ?? (await client.channels?.fetch?.(id));
      return found ? channel(found) : undefined;
    },
    channels: async (guildId) => {
      const found = await guild(guildId);
      if (!found) return undefined;
      const all: (GuildBasedChannel | null)[] = await listOf(found.channels);
      return all.filter((item): item is GuildBasedChannel => item !== null).map(channel);
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
      const member: GuildMember | undefined = found
        ? (found.members.cache.get(userId) ?? (await found.members.fetch?.(userId)))
        : undefined;
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
      const found = client.users?.cache.get(id) ?? (await client.users?.fetch?.(id));
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
    cache: options.cache === false ? undefined : rememberMisses(discordjsLookups(client as DiscordJSParts)),
    file: (data, name) => ({ attachment: data, name }),
  };
}

/** 0.x names, kept for `sweety-html-transcripts/adapters/*` imports. */
export { DiscordJSTranscript, DiscordJSTranscriptAdapter, ExportReturnType } from '../legacy';
