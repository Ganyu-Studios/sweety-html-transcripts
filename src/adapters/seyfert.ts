import type { APIGuildMember, APIRole, APIUser } from 'discord-api-types/v10';
import type { TranscriptChannel, TranscriptGuild } from '../model';
import type { TranscriptAdapter, TranscriptCache } from './types';
import { cleanQuery } from './types';

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
}

/** seyfert's `RawFile`, accepted in `files`. */
export interface SeyfertFile {
  data: Buffer;
  filename: string;
}

export interface SeyfertAdapterOptions {
  /**
   * Read channels, guilds, roles, members and users from `client.cache` before asking the API.
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

function seyfertCache(cache: SeyfertCache): TranscriptCache {
  return {
    channel: async (id) => (await cache.channels?.raw(id)) as TranscriptChannel | undefined,
    channels: async (guildId) => (await cache.channels?.valuesRaw(guildId)) as TranscriptChannel[] | undefined,
    guild: async (id) => (await cache.guilds?.raw(id)) as TranscriptGuild | undefined,
    roles: async (guildId) => (await cache.roles?.valuesRaw(guildId)) as APIRole[] | undefined,
    member: async (guildId, userId) => {
      const member = (await cache.members?.raw(userId, guildId)) as APIGuildMember | undefined;
      if (!member) return undefined;
      // The member resource may store the user apart; join it back when the users cache has it.
      if (member.user) return member;
      const user = (await cache.users?.raw(userId)) as APIUser | undefined;
      return user ? { ...member, user } : member;
    },
    user: async (id) => (await cache.users?.raw(id)) as APIUser | undefined,
  };
}

/**
 * Adapter for seyfert. Channels, guilds, roles, members and users come from `client.cache` when it
 * has them (it stores raw API objects, so nothing is converted), and from `client.rest` otherwise.
 * Messages always come from `client.rest`.
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
    cache: options.cache === false || !client.cache ? undefined : seyfertCache(client.cache as SeyfertCache),
    file: (data, name) => ({ data, filename: name }),
  };
}

/** 0.x names, kept for `sweety-html-transcripts/adapters/*` imports. */
export { SeyfertTranscript, SeyfertTranscriptAdapter, ExportReturnType } from '../legacy';
