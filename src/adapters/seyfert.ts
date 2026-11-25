import type { APIGuildMember, APIRole, APIUser } from 'discord-api-types/v10';
import type { UsingClient } from 'seyfert';
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

/**
 * The parts of a seyfert client read here, with seyfert's own types. Partial: a client may have no
 * cache, a cache resource may be disabled, and a client-like object may have no shorters.
 *
 * Only used inside this module, so the published declarations never import seyfert.
 */
type SeyfertParts = Partial<Pick<UsingClient, 'cache' | 'channels' | 'guilds' | 'roles' | 'members' | 'users'>>;

/**
 * Lookups through seyfert. Each one uses the shorter's `raw` method (cache, then a request that
 * fills the cache), or only reads `client.cache` when the client has no shorters.
 *
 * The client is read on every call, not captured: seyfert can replace `client.cache` after the
 * adapter exists (`setServices`, or when a plugin creates the adapter in the client's constructor).
 */
function seyfertLookups(client: SeyfertClientLike): TranscriptCache {
  const seyfert = client as SeyfertParts;

  const user = async (id: string): Promise<APIUser | undefined> =>
    seyfert.users?.raw ? seyfert.users.raw(id) : seyfert.cache?.users?.raw(id);

  return {
    channel: async (id) =>
      (seyfert.channels?.raw ? await seyfert.channels.raw(id) : await seyfert.cache?.channels?.raw(id)) as
        TranscriptChannel | undefined,
    // seyfert has no raw list for a guild's channels: read the cache, and REST fills in otherwise.
    channels: async (guildId) => (await seyfert.cache?.channels?.valuesRaw(guildId)) as TranscriptChannel[] | undefined,
    guild: async (id): Promise<TranscriptGuild | undefined> =>
      seyfert.guilds?.raw ? seyfert.guilds.raw(id) : seyfert.cache?.guilds?.raw(id),
    roles: async (guildId): Promise<APIRole[] | undefined> =>
      seyfert.roles?.listRaw ? seyfert.roles.listRaw(guildId) : seyfert.cache?.roles?.valuesRaw(guildId),
    member: async (guildId, userId) => {
      const member: APIGuildMember | Omit<APIGuildMember, 'user'> | undefined = seyfert.members?.raw
        ? await seyfert.members.raw(guildId, userId)
        : await seyfert.cache?.members?.raw(userId, guildId);
      if (!member) return undefined;
      // A cached member may be stored without its user; join it back.
      if ('user' in member && member.user) return member;
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
