import type { Emoji } from 'seyfert';
import type { APIMessageComponentEmoji } from 'seyfert/lib/types';
import twemoji from 'twemoji';

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

export function parseDiscordEmoji(emoji: Emoji | APIMessageComponentEmoji) {
  if (emoji.id) {
    return `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}`;
  }

  const codepoints = twemoji.convert
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
export function streamToString(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];

  return new Promise<string>((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

/**
 *
 * Convert a number color to HEX
 * @param color - The color number
 * @returns
 */
export const convertToHEX = (color?: number) => (color ? `#${color.toString(16).padStart(6, '0')}` : '#FFFFFF');
