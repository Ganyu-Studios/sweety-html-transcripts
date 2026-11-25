import type { APIGuildMember, APIRole, APIUser } from 'discord-api-types/v10';
import type { TranscriptChannel, TranscriptGuild } from '../model';
import type { TranscriptAdapter, TranscriptCache } from './types';
import { cleanQuery, rememberMisses } from './types';

/**
 * The parts of a seyfert `Client` the adapter uses. Typed structurally so this module never
 * imports seyfert, and any client exposing `rest.request` works.
 */
export interface SeyfertClientLike {
  rest: {
    request<T>(method: 'GET', url: `/${string}`, options?: { query?: Record<string, string> }): Promise<T>;
  };
  /** seyfert's cache. Its resources already store raw API objects. */
  cache?: unknown;
  /** seyfert's shorters (`client.members`, `client.channels`…), used for their `raw` methods. */
  channels?: unknown;
  guilds?: unknown;
  roles?: unknown;
  members?: unknown;
  users?: unknown;
}

/** seyfert's `RawFile`, accepted in `files`. */
export interface SeyfertFile {
  data: Buffer;
  filename: string;
}

export interface SeyfertAdapterOptions {
  /**
   * Look channels, guilds, roles, members and users up through seyfert: its cache first, then its
   * own request, which it stores in the cache for the next transcript. `false` asks the API
   * directly every time.
   * @default true
   */
  cache?: boolean;
}

/** The seyfert cache resources read here, each optional since any of them can be disabled. */
interface SeyfertCache {
  channels?: { raw(id: string): unknown; valuesRaw(guild: string): unknown };
  guilds?: { raw(id: string): unknown };
  roles?: { valuesRaw(guild: string): unknown };
  members?: { raw(id: string, guild: string): unknown };
  users?: { raw(id: string): unknown };
}

/**
 * The seyfert shorters used here. Their `raw` methods return the cached raw object, or request it
 * and store it in the cache.
 */
interface SeyfertShorters {
  channels?: { raw?(id: string): Promise<unknown> };
  guilds?: { raw?(id: string): Promise<unknown> };
  roles?: { listRaw?(guildId: string): Promise<unknown> };
  members?: { raw?(guildId: string, memberId: string): Promise<unknown> };
  users?: { raw?(id: string): Promise<unknown> };
}

/**
 * Lookups through seyfert. Each one uses the shorter's `raw` method (cache, then a request that
 * fills the cache), or only reads `client.cache` when the client has no shorters.
 *
 * The client is read on every call, not captured: seyfert can replace `client.cache` after the
 * adapter exists (`setServices`, or when a plugin creates the adapter in the client's constructor).
 */
function seyfertLookups(client: SeyfertClientLike): TranscriptCache {
  const cache = () => client.cache as SeyfertCache | undefined;
  const shorters = client as SeyfertShorters;

  const user = async (id: string) =>
    (shorters.users?.raw ? await shorters.users.raw(id) : await cache()?.users?.raw(id)) as APIUser | undefined;

  return {
    channel: async (id) =>
      (shorters.channels?.raw ? await shorters.channels.raw(id) : await cache()?.channels?.raw(id)) as
        TranscriptChannel | undefined,
    // seyfert has no raw list for a guild's channels: read the cache, and REST fills in otherwise.
    channels: async (guildId) => (await cache()?.channels?.valuesRaw(guildId)) as TranscriptChannel[] | undefined,
    guild: async (id) =>
      (shorters.guilds?.raw ? await shorters.guilds.raw(id) : await cache()?.guilds?.raw(id)) as
        TranscriptGuild | undefined,
    roles: async (guildId) =>
      (shorters.roles?.listRaw ? await shorters.roles.listRaw(guildId) : await cache()?.roles?.valuesRaw(guildId)) as
        APIRole[] | undefined,
    member: async (guildId, userId) => {
      const member = (
        shorters.members?.raw
          ? await shorters.members.raw(guildId, userId)
          : await cache()?.members?.raw(userId, guildId)
      ) as APIGuildMember | undefined;
      if (!member) return undefined;
      // A cached member may be stored without its user; join it back.
      if (member.user) return member;
      const found = await user(userId).catch(() => undefined);
      return found ? { ...member, user: found } : member;
    },
    user,
  };
}

/**
 * Adapter for seyfert. Channels, guilds, roles, members and users go through seyfert's shorters:
 * from `client.cache` when it has them (raw API objects, so nothing is converted), otherwise
 * requested and stored in the cache, so the next transcript does not ask the API again. Messages
 * always come from `client.rest`.
 *
 * @example
 * const transcripts = createTranscripts(seyfert(client));
 */
export function seyfert(
  client: SeyfertClientLike,
  options: SeyfertAdapterOptions = {}
): TranscriptAdapter<SeyfertFile> {
  return {
    get: <T>(route: `/${string}`, query?: Record<string, string | number | boolean | undefined>) => {
      const params = cleanQuery(query);
      return client.rest.request<T>('GET', route, params ? { query: params } : undefined);
    },
    cache: options.cache === false ? undefined : rememberMisses(seyfertLookups(client)),
    file: (data, name) => ({ data, filename: name }),
  };
}

/** 0.x names, kept for `sweety-html-transcripts/adapters/*` imports. */
export { SeyfertTranscript, SeyfertTranscriptAdapter, ExportReturnType } from '../legacy';
