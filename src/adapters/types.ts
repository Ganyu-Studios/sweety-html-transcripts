export type Awaitable<T> = Promise<T> | T;

/** Query parameters for a REST request. Undefined values are left out. */
export type Query = Record<string, string | number | boolean | undefined>;

/**
 * Everything the package needs from a Discord library: a way to GET raw API objects, and
 * optionally a way to wrap the finished HTML as that library's file type.
 *
 * Because it works on raw REST responses, nothing is ever converted from library structures, so it
 * cannot drift when a library changes its classes. Rate limits stay with the library's own REST
 * manager. Write your own for any library (or none) by implementing `get`.
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
