import twemoji from 'twemoji';

export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

/** Whether every bit of `flag` is set in `bitfield`. */
export const hasFlag = (bitfield: number | undefined | null, flag: number): boolean =>
  ((bitfield ?? 0) & flag) === flag;

/** A Discord color integer as `#rrggbb`. Zero means "no color" to Discord, so it maps to undefined. */
export const toHex = (color?: number | null): string | undefined =>
  color ? `#${color.toString(16).padStart(6, '0')}` : undefined;

const ZERO_WIDTH_JOINER = String.fromCharCode(0x200d);
const VARIATION_SELECTOR = String.fromCharCode(0xfe0f);

export function parseDiscordEmoji(emoji: { id?: string | null; name?: string | null; animated?: boolean }): string {
  if (emoji.id) return `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}`;

  // Twemoji drops the variation selector from file names unless the emoji is a ZWJ sequence.
  const name = emoji.name ?? '';
  const codepoints = twemoji.convert
    .toCodePoint(name.includes(ZERO_WIDTH_JOINER) ? name : name.replaceAll(VARIATION_SELECTOR, ''))
    .toLowerCase();

  return `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${codepoints}.svg`;
}

// Built from char codes: a raw U+2028 would end a regular expression literal.
const SCRIPT_UNSAFE = new RegExp(`[<>&${String.fromCharCode(0x2028, 0x2029)}]`, 'g');

/**
 *
 * Serialize a value as JSON that is safe to inline into a `<script>` element.
 * The HTML parser reads a script element as raw text, so the first `</script>` inside any string
 * closes the element early and everything after it is parsed as markup. `<!--<script` reaches the
 * same end by another route, through the script data double escaped state. Every exit from the
 * script data state starts with a `<`, so escaping that one character is what closes both.
 * `>` and `&` are escaped as well. Neither is special in raw text, so neither is needed for the
 * tokenizer, but escaping them keeps the output safe if it is ever moved inside a comment or served
 * as XHTML, where the script body is parsed as XML. This is the set Next.js escapes.
 * U+2028 and U+2029 are escaped because they are legal in JSON but were line terminators in
 * JavaScript before ES2019, and this output is read as a JavaScript expression.
 * The parameter is a record or an array rather than `object`, which also admits functions and
 * classes. JSON.stringify returns undefined for those, and the replace would throw on it.
 * @param value - The value to serialize
 * @returns The JSON representation of the value, safe to inline
 */
export const stringifyForScript = (value: Record<string, unknown> | readonly unknown[]): string =>
  JSON.stringify(value).replace(SCRIPT_UNSAFE, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);

/**
 * Map over items with at most `limit` promises in flight.
 * @param items - The inputs
 * @param limit - Maximum concurrency
 * @param fn - The async mapper
 */
export async function mapLimit<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]!);
    }
  };

  await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), items.length) }, worker));
  return results;
}
