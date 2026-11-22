import type { APIGuildMember, APIRole, APIUser } from 'discord-api-types/v10';
import type { TranscriptChannel, TranscriptGuild } from '../model';

export type Awaitable<T> = Promise<T> | T;

/** Query parameters for a REST request. Undefined values are left out. */
export type Query = Record<string, string | number | boolean | undefined>;

/**
 * Read-only lookups into a library's cache, tried before the REST request for the same data so a
 * transcript does not hit the API for what the bot already knows.
 *
 * Every method is optional and may return `undefined` (not cached, cache disabled): the REST
 * request is made instead. A method that throws is treated the same way. Shapes are the raw API
 * ones; only the fields listed on the model types are read.
 */
export interface TranscriptCache {
  channel?(id: string): Awaitable<TranscriptChannel | undefined>;
  /** Every channel of a guild. An empty list counts as "not cached". */
  channels?(guildId: string): Awaitable<TranscriptChannel[] | undefined>;
  /** The guild without its roles, which come from {@link roles}. */
  guild?(id: string): Awaitable<TranscriptGuild | undefined>;
  /** Every role of a guild. An empty list counts as "not cached". */
  roles?(guildId: string): Awaitable<APIRole[] | undefined>;
  /** A guild member, with its user when the cache has it. */
  member?(guildId: string, userId: string): Awaitable<APIGuildMember | Omit<APIGuildMember, 'user'> | undefined>;
  user?(id: string): Awaitable<APIUser | undefined>;
}

/**
 * Everything the package needs from a Discord library: a way to GET raw API objects, optionally a
 * cache to read first, and optionally a way to wrap the finished HTML as that library's file type.
 *
 * Messages always come from REST as raw API objects, so nothing in them is converted from library
 * structures. Rate limits stay with the library's own REST manager. Write your own for any library
 * (or none) by implementing `get`.
 *
 * @typeParam File - What {@link file} returns, so `attachment()` is typed for your library
 */
export interface TranscriptAdapter<File = unknown> {
  /**
   * GET a Discord API route and resolve with the raw JSON body.
   * Must reject when the request fails (for example a 403 or 404).
   * @param route - The route, starting with a slash, e.g. `/channels/123/messages`
   * @param query - Query parameters
   */
  get<T>(route: `/${string}`, query?: Query): Promise<T>;

  /** Lookups into the library's cache, tried before REST. */
  cache?: TranscriptCache;

  /**
   * Wrap file data as something the library can send.
   * @param data - The file contents
   * @param name - The file name
   */
  file?(data: Buffer, name: string): File;
}

/** The file type an adapter produces. */
export type AdapterFile<A> = A extends TranscriptAdapter<infer File> ? File : never;

/** Drop undefined values so they are not sent as the string "undefined". */
export function cleanQuery(query: Query | undefined): Record<string, string> | undefined {
  if (!query) return undefined;

  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) if (value !== undefined) out[key] = String(value);

  return out;
}
