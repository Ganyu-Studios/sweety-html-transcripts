import type { APIMessageComponentEmoji } from 'discord-api-types/v10';
import twemoji from 'twemoji';

interface FlagsOptions {
  bitfield?: number;
  flag: number;
}

export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return { size: 0, unit: 'Bytes' };

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return { size: parseFloat((bytes / Math.pow(k, i)).toFixed(dm)), unit: sizes[i] };
}

export function parseDiscordEmoji(emoji: APIMessageComponentEmoji): string {
  if (emoji.id) {
    return `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}`;
  }

  const codepoints: string = twemoji.convert
    .toCodePoint(
      emoji.name!.indexOf(String.fromCharCode(0x200d)) < 0 ? emoji.name!.replace(/\uFE0F/g, '') : emoji.name!
    )
    .toLowerCase();

  return `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${codepoints}.svg`;
}

/**
 * Converts a stream to a string
 * @param stream - The stream to convert
 */
export function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];

  return new Promise<string>((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

/**
 *
 * Check if a flag is present in a bitfield
 * @param {FlagsOptions} options - The options to check.
 * @returns boolean
 */
export const hasFlag = (options: FlagsOptions): boolean => (options.bitfield ?? 0 & options.flag) === options.flag;

/**
 *
 * Convert a number color to HEX
 * @param color - The color number
 * @returns
 */
export const convertToHEX = (color?: number): string => (color ? `#${color.toString(16).padStart(6, '0')}` : '#FFFFFF');

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
  JSON.stringify(value).replace(
    /[<>&\u2028\u2029]/g,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`
  );
