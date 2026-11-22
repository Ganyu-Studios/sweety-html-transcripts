import type { TranscriptAdapter } from './types';
import { cleanQuery } from './types';

/**
 * The parts of a discord.js `Client` the adapter uses. Typed structurally so this module never
 * imports discord.js, and any client exposing `rest.get` works.
 */
export interface DiscordJSClientLike {
  rest: {
    get(route: `/${string}`, options?: { query?: URLSearchParams }): Promise<unknown>;
  };
}

/** discord.js accepts this plain object in `files`. */
export interface DiscordJSFile {
  attachment: Buffer;
  name: string;
}

/**
 * Adapter for discord.js. Requests go through `client.rest`, which already returns raw API objects
 * and handles rate limits.
 *
 * @example
 * const transcripts = createTranscripts(discordjs(client));
 */
export function discordjs(client: DiscordJSClientLike): TranscriptAdapter<DiscordJSFile> {
  return {
    get: <T>(route: `/${string}`, query?: Record<string, string | number | boolean | undefined>) => {
      const params = cleanQuery(query);
      return client.rest.get(route, params ? { query: new URLSearchParams(params) } : undefined) as Promise<T>;
    },
    file: (data, name) => ({ attachment: data, name }),
  };
}

/** 0.x names, kept for `sweety-html-transcripts/adapters/*` imports. */
export { DiscordJSTranscript, DiscordJSTranscriptAdapter, ExportReturnType } from '../legacy';
