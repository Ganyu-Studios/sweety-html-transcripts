import type { SeyfertPlugin } from 'seyfert';
import { name, version } from '../package.json';
import type { SeyfertAdapterOptions, SeyfertClientLike, SeyfertFile } from './adapters/seyfert';
import { seyfert } from './adapters/seyfert';
import type { TranscriptAdapter } from './adapters/types';
import type { FetchOptions, MessageInput } from './fetch';
import type { Transcript } from './model';
import type { AttachmentOptions, HtmlOptions, Transcripts, TranscriptsDefaults } from './transcripts';
import { createTranscripts } from './transcripts';

/** `createTranscripts` bound to a seyfert client, as the plugin installs it on `client.transcripts`. */
export type SeyfertTranscripts = Transcripts<TranscriptAdapter<SeyfertFile>>;

/**
 * The transcript methods for the channel a command, component or modal runs in, as the plugin
 * installs them on `ctx.transcripts`. For any other channel, use `ctx.client.transcripts`.
 */
export interface ChannelTranscripts {
  /** The channel these methods work on: the one the interaction or message came from. */
  readonly channelId: string;
  /** Fetch and render this channel, wrapped as a file ready to send. */
  attachment(options?: AttachmentOptions): Promise<SeyfertFile>;
  /** Fetch and render this channel. */
  html(options?: HtmlOptions): Promise<string>;
  /** Fetch and render this channel to a Buffer. */
  buffer(options?: HtmlOptions): Promise<Buffer>;
  /** Fetch this channel into a JSON-serializable {@link Transcript}. */
  fetch(options?: FetchOptions): Promise<Transcript>;
  /** Build a {@link Transcript} of this channel from messages you already have. */
  fromMessages(messages: Iterable<MessageInput>, options?: FetchOptions): Promise<Transcript>;
}

/**
 * Defaults for every transcript (`fetch` and `render`), and whether to look things up through
 * seyfert's cache before the API (`cache`, on by default).
 */
export interface TranscriptsPluginOptions extends TranscriptsDefaults, SeyfertAdapterOptions {}

/** What the plugin adds to the client. */
export interface TranscriptsPluginExtension {
  transcripts: SeyfertTranscripts;
}

/** What the plugin adds to command, component and modal contexts. */
export interface TranscriptsPluginContext {
  transcripts: ChannelTranscripts;
}

/** Bind the client's transcript methods to one channel. */
function forChannel(transcripts: SeyfertTranscripts, channelId: string | undefined): ChannelTranscripts {
  const channel = (): string => {
    if (!channelId)
      throw new TypeError('[sweety-html-transcripts] This context has no channel; use ctx.client.transcripts.');
    return channelId;
  };

  // async, so a missing channel rejects like any other failure instead of throwing synchronously.
  return {
    channelId: channelId ?? '',
    attachment: async (options) => transcripts.attachment(channel(), options),
    html: async (options) => transcripts.html(channel(), options),
    buffer: async (options) => transcripts.buffer(channel(), options),
    fetch: async (options) => transcripts.fetch(channel(), options),
    fromMessages: async (messages, options) => transcripts.fromMessages(channel(), messages, options),
  };
}

/**
 * A seyfert plugin that adds:
 *
 * - `client.transcripts` (also `ctx.client.transcripts`): the methods of `createTranscripts`, bound
 *   to the client's REST and cache.
 * - `ctx.transcripts` in commands, components and modals: the same methods for the channel the
 *   context runs in, so no channel id is needed.
 *
 * Needs seyfert 5 or later. The package never imports seyfert at runtime; this module only uses
 * its types.
 *
 * @example
 * import { Client, definePlugins } from 'seyfert';
 * import { transcriptsPlugin } from 'sweety-html-transcripts/plugin';
 *
 * const plugins = definePlugins(transcriptsPlugin({ render: { theme: 'dark' } }));
 * const client = new Client({ plugins });
 *
 * declare module 'seyfert' {
 *   interface SeyfertRegistry {
 *     plugins: typeof plugins;
 *   }
 * }
 *
 * // In a command: this channel
 * await ctx.write({ files: [await ctx.transcripts.attachment({ filename: 'ticket.html' })] });
 *
 * // Any channel
 * const html = await ctx.client.transcripts.html(channelId);
 */
export function transcriptsPlugin(
  options: TranscriptsPluginOptions = {}
): SeyfertPlugin<TranscriptsPluginExtension, TranscriptsPluginContext> {
  const { cache, ...defaults } = options;

  return {
    name,
    version,
    client: {
      // seyfert calls this once, while constructing the client. The adapter reads the client's
      // REST, cache and shorters on each request, so services the client sets up later are used.
      transcripts: (client) => createTranscripts(seyfert(client as unknown as SeyfertClientLike, { cache }), defaults),
    },
    ctx: {
      // seyfert calls this for every context it creates, so it only binds, it fetches nothing.
      transcripts: (interaction, client) => {
        const source = interaction as { channelId?: string; channel?: { id?: string } };
        return forChannel(client.transcripts, source.channelId ?? source.channel?.id);
      },
    },
  };
}
