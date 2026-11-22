import type { AdapterFile, TranscriptAdapter } from './adapters/types';
import type { FetchOptions, MessageInput } from './fetch';
import { fetchTranscript, transcriptFromMessages } from './fetch';
import type { Transcript } from './model';
import type { RenderOptions } from './render';
import { render } from './render';

/** A channel id, or any channel object with an `id` (raw, discord.js or seyfert). */
export type ChannelInput = string | { id: string };

export type HtmlOptions = FetchOptions & RenderOptions;

export interface AttachmentOptions extends HtmlOptions {
  /** @default 'transcript-{channelId}.html' */
  filename?: string;
}

export interface TranscriptsDefaults {
  fetch?: FetchOptions;
  render?: RenderOptions;
}

const channelIdOf = (channel: ChannelInput): string => (typeof channel === 'string' ? channel : channel.id);

const RENDER_KEYS = [
  'theme',
  'title',
  'locale',
  'mode',
  'favicon',
  'footer',
  'poweredBy',
  'selectMenus',
  'cdn',
] as const satisfies readonly (keyof RenderOptions)[];

function split(options: HtmlOptions): { fetch: FetchOptions; render: RenderOptions } {
  const fetch: Record<string, unknown> = {};
  const renderOptions: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(options)) {
    if ((RENDER_KEYS as readonly string[]).includes(key)) renderOptions[key] = value;
    else fetch[key] = value;
  }

  return { fetch: fetch as FetchOptions, render: renderOptions as RenderOptions };
}

/**
 * Transcript methods bound to one adapter.
 *
 * @example
 * const transcripts = createTranscripts(seyfert(client));
 *
 * // A file ready to send
 * const file = await transcripts.attachment(channelId, { filename: 'ticket-42.html' });
 * await client.messages.write(logChannelId, { content: 'Transcript:', files: [file] });
 *
 * // Just the HTML (store it, serve it…)
 * const html = await transcripts.html(channelId, { theme: 'light', title: 'Ticket #42' });
 *
 * // The data model (save it, render it later or somewhere else)
 * const transcript = await transcripts.fetch(channelId);
 * const again = transcripts.render(transcript, { locale: 'en' });
 */
export function createTranscripts<A extends TranscriptAdapter<unknown>>(
  adapter: A,
  defaults: TranscriptsDefaults = {}
) {
  const fetchDefaults = defaults.fetch ?? {};
  const renderDefaults = defaults.render ?? {};

  const toHtml = async (transcript: Transcript, options: RenderOptions): Promise<string> =>
    render(transcript, { ...renderDefaults, ...options });

  const api = {
    adapter,

    /** Fetch a channel into a JSON-serializable {@link Transcript}. */
    fetch(channel: ChannelInput, options: FetchOptions = {}): Promise<Transcript> {
      return fetchTranscript(adapter, channelIdOf(channel), { ...fetchDefaults, ...options });
    },

    /** Build a {@link Transcript} from messages you already have (raw, or library objects to refetch). */
    fromMessages(channel: ChannelInput, messages: Iterable<MessageInput>, options: FetchOptions = {}) {
      return transcriptFromMessages(adapter, channelIdOf(channel), messages, { ...fetchDefaults, ...options });
    },

    /** Render a transcript to HTML. Synchronous unless `mode: 'server'`. */
    render: ((transcript: Transcript, options: RenderOptions = {}) =>
      render(transcript, { ...renderDefaults, ...options })) as typeof render,

    /** Fetch and render a channel. */
    async html(channel: ChannelInput, options: HtmlOptions = {}): Promise<string> {
      const parts = split(options);
      return toHtml(await api.fetch(channel, parts.fetch), parts.render);
    },

    /** Fetch and render a channel to a Buffer. */
    async buffer(channel: ChannelInput, options: HtmlOptions = {}): Promise<Buffer> {
      return Buffer.from(await api.html(channel, options));
    },

    /** Fetch and render a channel, wrapped as the adapter's file type, ready to send. */
    async attachment(channel: ChannelInput, options: AttachmentOptions = {}): Promise<AdapterFile<A>> {
      if (!adapter.file) throw new TypeError('[sweety-html-transcripts] This adapter does not implement file().');

      const { filename, ...rest } = options;
      const data = await api.buffer(channel, rest);
      return adapter.file(data, filename ?? `transcript-${channelIdOf(channel)}.html`) as AdapterFile<A>;
    },
  };

  return api;
}

export type Transcripts<A extends TranscriptAdapter<unknown> = TranscriptAdapter<unknown>> = ReturnType<
  typeof createTranscripts<A>
>;
