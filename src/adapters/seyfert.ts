import type { TranscriptAdapter } from './types';
import { cleanQuery } from './types';

/**
 * The parts of a seyfert `Client` the adapter uses. Typed structurally so this module never
 * imports seyfert.
 */
export interface SeyfertClientLike {
  rest: {
    request<T>(method: 'GET', url: `/${string}`, options?: { query?: Record<string, string> }): Promise<T>;
  };
}

/** seyfert's `RawFile`, accepted in `files`. */
export interface SeyfertFile {
  data: Buffer;
  filename: string;
}

/**
 * Adapter for seyfert. Requests go through `client.rest`, which returns raw API objects and handles
 * rate limits.
 *
 * @example
 * const transcripts = createTranscripts(seyfert(client));
 */
export function seyfert(client: SeyfertClientLike): TranscriptAdapter<SeyfertFile> {
  return {
    get: <T>(route: `/${string}`, query?: Record<string, string | number | boolean | undefined>) => {
      const params = cleanQuery(query);
      return client.rest.request<T>('GET', route, params ? { query: params } : undefined);
    },
    file: (data, name) => ({ data, filename: name }),
  };
}

/** 0.x names, kept for `sweety-html-transcripts/adapters/*` imports. */
export { SeyfertTranscript, SeyfertTranscriptAdapter, ExportReturnType } from '../legacy';
