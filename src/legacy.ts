/**
 * The 0.x API, kept as thin wrappers over {@link createTranscripts} so upgrading is not a rewrite.
 * Everything here is deprecated and will be removed in 2.0.
 */
import type { APIMessage } from 'discord-api-types/v10';
import type { DiscordJSClientLike, DiscordJSFile } from './adapters/discordjs';
import { discordjs } from './adapters/discordjs';
import type { SeyfertClientLike, SeyfertFile } from './adapters/seyfert';
import { seyfert } from './adapters/seyfert';
import type { AdapterFile, TranscriptAdapter } from './adapters/types';
import type { ResolveImageCallback } from './fetch/images';
import { render } from './render';
import { createTranscripts } from './transcripts';
import type { FetchOptions, MessageInput } from './fetch';

/** @deprecated Use `transcripts.attachment()`, `transcripts.html()` or `transcripts.buffer()`. */
export enum ExportReturnType {
  Buffer = 'buffer',
  String = 'string',
  Attachment = 'attachment',
}

/** @deprecated */
export interface LegacyOptions<T extends ExportReturnType = ExportReturnType.Attachment> {
  returnType?: T;
  saveImages?: boolean;
  callbacks?: { resolveImageSrc?: ResolveImageCallback };
  filename?: string;
  poweredBy?: boolean;
  footerText?: string;
  favicon?: 'guild' | (string & {});
  limit?: number;
  filter?: (message: APIMessage) => boolean;
}

/** @deprecated */
export type LegacyResult<T extends ExportReturnType, A> = T extends ExportReturnType.Buffer
  ? Buffer
  : T extends ExportReturnType.String
    ? string
    : AdapterFile<A>;

function toFetchOptions(options: LegacyOptions<ExportReturnType>): FetchOptions {
  return {
    limit: options.limit,
    filter: options.filter,
    saveImages: options.saveImages,
    resolveImageSrc: options.callbacks?.resolveImageSrc,
  };
}

async function output<T extends ExportReturnType, A extends TranscriptAdapter<unknown>>(
  adapter: A,
  channelId: string,
  html: string,
  options: LegacyOptions<T>
): Promise<LegacyResult<T, A>> {
  if (options.returnType === ExportReturnType.String) return html as LegacyResult<T, A>;

  const buffer = Buffer.from(html);
  if (options.returnType === ExportReturnType.Buffer || !adapter.file) return buffer as LegacyResult<T, A>;

  return adapter.file(buffer, options.filename ?? `transcript-${channelId}.html`) as LegacyResult<T, A>;
}

const renderLegacy = (transcript: Parameters<typeof render>[0], options: LegacyOptions<ExportReturnType>) =>
  render(transcript, { poweredBy: options.poweredBy, footer: options.footerText, favicon: options.favicon });

/**
 * @deprecated Use `createTranscripts(adapter).attachment(channel)` (or `.html` / `.buffer`).
 */
export async function createTranscript<
  A extends TranscriptAdapter<unknown>,
  T extends ExportReturnType = ExportReturnType.Attachment,
>(options: LegacyOptions<T> & { adapter: A; channel: { id: string } }): Promise<LegacyResult<T, A>> {
  const transcripts = createTranscripts(options.adapter);
  const transcript = await transcripts.fetch(options.channel, toFetchOptions(options));
  return output(options.adapter, options.channel.id, renderLegacy(transcript, options), options);
}

/**
 * @deprecated Use `createTranscripts(adapter).fromMessages(channel, messages)` and `.render()`.
 */
export async function generateFromMessages<
  A extends TranscriptAdapter<unknown>,
  T extends ExportReturnType = ExportReturnType.Attachment,
>(
  messages: Iterable<MessageInput>,
  options: LegacyOptions<T> & { adapter: A; channel: { id: string } }
): Promise<LegacyResult<T, A>> {
  const transcripts = createTranscripts(options.adapter);
  const transcript = await transcripts.fromMessages(options.channel, messages, toFetchOptions(options));
  return output(options.adapter, options.channel.id, renderLegacy(transcript, options), options);
}

/** @deprecated Use `discordjs(client)`. */
export class DiscordJSTranscriptAdapter implements TranscriptAdapter<DiscordJSFile> {
  public readonly get: TranscriptAdapter['get'];
  public readonly file: (data: Buffer, name: string) => DiscordJSFile;

  public constructor(client: DiscordJSClientLike) {
    const adapter = discordjs(client);
    this.get = adapter.get;
    this.file = adapter.file!;
  }
}

/** @deprecated Use `seyfert(client)`. */
export class SeyfertTranscriptAdapter implements TranscriptAdapter<SeyfertFile> {
  public readonly get: TranscriptAdapter['get'];
  public readonly file: (data: Buffer, name: string) => SeyfertFile;

  public constructor(client: SeyfertClientLike) {
    const adapter = seyfert(client);
    this.get = adapter.get;
    this.file = adapter.file!;
  }
}

/** @deprecated Use `createTranscripts(discordjs(client)).attachment(channel)`. */
export const DiscordJSTranscript = {
  create<T extends ExportReturnType = ExportReturnType.Attachment>(
    options: LegacyOptions<T> & { channel: { id: string; client: DiscordJSClientLike } }
  ) {
    return createTranscript({ ...options, adapter: discordjs(options.channel.client) });
  },
};

/** @deprecated Use `createTranscripts(seyfert(client)).attachment(channel)`. */
export const SeyfertTranscript = {
  create<T extends ExportReturnType = ExportReturnType.Attachment>(
    options: LegacyOptions<T> & { channel: { id: string; client: SeyfertClientLike } }
  ) {
    return createTranscript({ ...options, adapter: seyfert(options.channel.client) });
  },
};
