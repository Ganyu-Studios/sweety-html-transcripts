// The main API
export { createTranscripts } from './transcripts';
export type { AttachmentOptions, ChannelInput, HtmlOptions, Transcripts, TranscriptsDefaults } from './transcripts';

// Adapters
export { discordjs } from './adapters/discordjs';
export type { DiscordJSAdapterOptions, DiscordJSClientLike, DiscordJSFile } from './adapters/discordjs';
export { seyfert } from './adapters/seyfert';
export type { SeyfertAdapterOptions, SeyfertClientLike, SeyfertFile } from './adapters/seyfert';
export { DiscordAPIError, rest } from './adapters/rest';
export type { RestAdapterOptions, RestFile } from './adapters/rest';
export type { AdapterFile, Awaitable, Query, TranscriptAdapter, TranscriptCache } from './adapters/types';

// The two phases, for use without an instance
export { fetchTranscript, resolveTranscript, transcriptFromMessages } from './fetch';
export type { FetchOptions, MessageInput } from './fetch';
export { TranscriptImageDownloader } from './fetch/images';
export type { MediaSource, ResolveImageCallback } from './fetch/images';
export { render } from './render';
export type { Profile, RenderOptions } from './render';
export { locales } from './render/locales';
export type { DeepPartial, Locale, LocaleName } from './render/locales';

// The data model
export { TRANSCRIPT_VERSION } from './model';
export type { Transcript, TranscriptChannel, TranscriptGuild, TranscriptMember } from './model';

// 0.x compatibility (deprecated)
export {
  createTranscript,
  DiscordJSTranscript,
  DiscordJSTranscriptAdapter,
  ExportReturnType,
  generateFromMessages,
  SeyfertTranscript,
  SeyfertTranscriptAdapter,
} from './legacy';
export type { LegacyOptions, LegacyResult } from './legacy';
