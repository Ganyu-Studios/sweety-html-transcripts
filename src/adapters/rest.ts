import type { TranscriptAdapter } from './types';
import { cleanQuery } from './types';

export interface RestAdapterOptions {
  /** @default 'https://discord.com/api/v10' */
  api?: string;
  /** How many times to retry a rate limited request. @default 3 */
  retries?: number;
  /** The fetch implementation. @default globalThis.fetch */
  fetch?: typeof globalThis.fetch;
}

/** The file type of the {@link rest} adapter: just the data and a name. */
export interface RestFile {
  data: Buffer;
  name: string;
}

export class DiscordAPIError extends Error {
  public constructor(
    public readonly status: number,
    public readonly route: string,
    body: string
  ) {
    super(`Discord API ${status} on GET ${route}: ${body}`);
    this.name = 'DiscordAPIError';
  }
}

/**
 * Library-free adapter: talks to the Discord API with `fetch` and a bot token. Handles 429s by
 * waiting `retry_after`, but does no bucket tracking, so prefer your library's adapter when you
 * have one.
 *
 * @example
 * const transcripts = createTranscripts(rest(process.env.TOKEN));
 */
export function rest(token: string, options: RestAdapterOptions = {}): TranscriptAdapter<RestFile> {
  const api = options.api ?? 'https://discord.com/api/v10';
  const retries = options.retries ?? 3;
  const doFetch = options.fetch ?? globalThis.fetch;
  const authorization = token.startsWith('Bot ') || token.startsWith('Bearer ') ? token : `Bot ${token}`;

  return {
    async get<T>(route: `/${string}`, query?: Record<string, string | number | boolean | undefined>): Promise<T> {
      const params = cleanQuery(query);
      const url = `${api}${route}${params ? `?${new URLSearchParams(params)}` : ''}`;

      for (let attempt = 0; ; attempt++) {
        const response = await doFetch(url, { headers: { authorization } });

        if (response.status === 429 && attempt < retries) {
          const body = (await response.json().catch(() => ({}))) as { retry_after?: number };
          await new Promise((resolve) => setTimeout(resolve, Math.ceil((body.retry_after ?? 1) * 1000)));
          continue;
        }

        if (!response.ok) throw new DiscordAPIError(response.status, route, await response.text().catch(() => ''));

        return (await response.json()) as T;
      }
    },
    file: (data, name) => ({ data, name }),
  };
}
