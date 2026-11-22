import type {
  APIAttachment,
  APIGuildMember,
  APIMessage,
  APIMessageSnapshotFields,
  APIUser,
} from 'discord-api-types/v10';
import { ChannelType, ComponentType, MessageReferenceType } from 'discord-api-types/v10';
import type { TranscriptAdapter } from '../adapters/types';
import type { Transcript, TranscriptChannel, TranscriptMember } from '../model';
import { TRANSCRIPT_VERSION } from '../model';
import { attachmentKind, attachmentLanguage } from '../utils/files';
import { mapLimit } from '../utils/utils';
import type { ResolveImageCallback } from './images';
import { TranscriptImageDownloader } from './images';
import { Lookup } from './lookup';

const TAG = '[sweety-html-transcripts]';

export interface FetchOptions {
  /**
   * How many messages to fetch, newest first. `Infinity` (or `-1`) fetches the whole channel.
   * @default Infinity
   */
  limit?: number;
  /** Only fetch messages before this message id. */
  before?: string;
  /** Only keep messages for which this returns true. Filtered messages do not count towards `limit`. */
  filter?: (message: APIMessage) => boolean;

  /**
   * Download images and inline them as data urls, so the transcript survives Discord's expiring
   * attachment urls. Pass a configured {@link TranscriptImageDownloader} for size limits or compression.
   * @default false
   */
  saveImages?: boolean | TranscriptImageDownloader;
  /** Decide each image source yourself (e.g. upload to your own storage). Wins over `saveImages`. */
  resolveImageSrc?: ResolveImageCallback;

  /**
   * Fetch the latest message of each thread started in the channel, for the thread preview.
   * @default true
   */
  threads?: boolean;
  /**
   * Download small text attachments (code, logs…) to show them inline. `false` disables it.
   * @default { maxSize: 512 * 1024 }
   */
  filePreviews?: boolean | { maxSize?: number };
  /**
   * Maximum parallel requests while resolving members, users and channels.
   * @default 4
   */
  concurrency?: number;
}

/** A message, or anything with an id to refetch it by (e.g. a discord.js or seyfert Message). */
export type MessageInput = APIMessage | { id: string };

const isRawMessage = (message: MessageInput): message is APIMessage =>
  'channel_id' in message && 'author' in message && 'timestamp' in message;

const MENTION_PATTERNS = {
  user: /<@!?(\d{15,25})>/g,
  role: /<@&(\d{15,25})>/g,
  channel: /<#(\d{15,25})>/g,
};

/** Every message shape the transcript renders: the messages, their forwards and their replies. */
function* messageBodies(message: APIMessage): Generator<APIMessage | APIMessageSnapshotFields> {
  yield message;
  if (message.referenced_message) yield message.referenced_message;
  for (const snapshot of message.message_snapshots ?? []) yield snapshot.message;
}

/** Fetch a page of messages, newest first, until `limit` is reached or the channel runs out. */
async function listMessages(lookup: Lookup, channelId: string, options: FetchOptions) {
  const limit = options.limit === undefined || options.limit < 0 ? Infinity : options.limit;
  const kept: APIMessage[] = [];
  let before = options.before;

  while (kept.length < limit) {
    const page = await lookup.get<APIMessage[]>(`/channels/${channelId}/messages`, { limit: 100, before });
    if (page.length === 0) break;

    for (const message of page) {
      if (options.filter && !options.filter(message)) continue;
      kept.push(message);
      if (kept.length >= limit) break;
    }

    // Paginate on the raw page, not the filtered one, or filtered messages would be fetched again.
    before = page[page.length - 1]!.id;
    if (page.length < 100) break;
  }

  return kept.reverse();
}

/**
 * Fetch a channel's messages and everything needed to render them.
 * @param adapter - How to reach the Discord API
 * @param channelId - The channel to export
 */
export async function fetchTranscript(
  adapter: TranscriptAdapter,
  channelId: string,
  options: FetchOptions = {}
): Promise<Transcript> {
  const lookup = new Lookup(adapter);
  const channel = await lookup.channel(channelId);
  const messages = await listMessages(lookup, channelId, options);

  return resolveWith(lookup, channel, messages, options);
}

/**
 * Build a transcript from messages you already have. Raw API messages are used as they are;
 * anything else with an `id` (a library Message object) is refetched as raw.
 */
export async function transcriptFromMessages(
  adapter: TranscriptAdapter,
  channelId: string,
  input: Iterable<MessageInput>,
  options: FetchOptions = {}
): Promise<Transcript> {
  const lookup = new Lookup(adapter);
  const channel = await lookup.channel(channelId);
  const items = [...input];

  const messages = (
    await mapLimit(items, options.concurrency ?? 4, (message) =>
      isRawMessage(message)
        ? Promise.resolve(message)
        : lookup.get<APIMessage>(`/channels/${channelId}/messages/${message.id}`).catch(() => null)
    )
  ).filter((message): message is APIMessage => message !== null && (!options.filter || options.filter(message)));

  messages.sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1));

  return resolveWith(lookup, channel, messages, options);
}

/**
 * Resolve every lookup the renderer needs, each one requested once, from the adapter's cache
 * when it has the data and from REST otherwise.
 */
export function resolveTranscript(
  adapter: TranscriptAdapter,
  channel: TranscriptChannel,
  messages: APIMessage[],
  options: FetchOptions = {}
): Promise<Transcript> {
  return resolveWith(new Lookup(adapter), channel, messages, options);
}

async function resolveWith(
  lookup: Lookup,
  channel: TranscriptChannel,
  messages: APIMessage[],
  options: FetchOptions
): Promise<Transcript> {
  const concurrency = options.concurrency ?? 4;
  const transcript: Transcript = {
    version: TRANSCRIPT_VERSION,
    exportedAt: new Date().toISOString(),
    channel,
    guild: null,
    messages,
    users: {},
    members: {},
    roles: {},
    channels: { [channel.id]: channel },
    guilds: {},
    threads: {},
    files: {},
    assets: {},
  };

  const addUser = (user: APIUser | undefined): void => {
    if (user && !transcript.users[user.id]) transcript.users[user.id] = user;
  };

  // Ids that are only known by mention syntax, collected from every string in the messages.
  const mentioned = { user: new Set<string>(), role: new Set<string>(), channel: new Set<string>() };
  let needsGuildChannels = channel.type === ChannelType.PublicThread || channel.type === ChannelType.PrivateThread;

  for (const recipient of channel.recipients ?? []) addUser(recipient);

  for (const message of messages) {
    for (const body of messageBodies(message)) {
      if ('author' in body) addUser(body.author);
      for (const user of body.mentions ?? []) addUser(user);
    }
    addUser(message.interaction_metadata?.user);

    const text = JSON.stringify([message.content, message.embeds, message.components, message.message_snapshots]);
    for (const [kind, pattern] of Object.entries(MENTION_PATTERNS) as [keyof typeof mentioned, RegExp][]) {
      for (const match of text.matchAll(pattern)) mentioned[kind].add(match[1]!);
    }

    if (JSON.stringify(message.components ?? []).includes(`"type":${ComponentType.ChannelSelect}`)) {
      needsGuildChannels = true;
    }
  }

  const guildId = channel.guild_id;

  // Guild and its roles.
  if (guildId) {
    const found = await lookup.guild(guildId).catch((error: unknown) => {
      console.warn(`${TAG} Could not fetch guild ${guildId}:`, error);
      return null;
    });

    if (found) {
      transcript.guild = found.guild;
      for (const role of found.roles) transcript.roles[role.id] = role;
    }
  }

  // Thread previews. Their authors need profiles too, so this runs before members are resolved.
  if (options.threads !== false) {
    const threads = messages
      .map((message) => message.thread as { id: string; last_message_id?: string | null } | undefined)
      .filter((thread): thread is { id: string; last_message_id: string } => Boolean(thread?.last_message_id));

    await mapLimit(threads, concurrency, async (thread) => {
      const last = await lookup
        .get<APIMessage>(`/channels/${thread.id}/messages/${thread.last_message_id}`)
        .catch(() => null);
      if (!last) return;

      transcript.threads[thread.id] = last;
      addUser(last.author);
    });
  }

  // Users mentioned only by syntax (e.g. inside an embed) are not in `mentions`.
  const unknownUsers = [...mentioned.user].filter((id) => !transcript.users[id]);
  await mapLimit(unknownUsers, concurrency, async (id) => {
    addUser(await lookup.user(id).catch(() => undefined));
  });

  // Members, for nicknames, guild avatars and role colors. Users that left the guild 404.
  if (guildId) {
    await mapLimit(Object.keys(transcript.users), concurrency, async (id) => {
      const member = await lookup.member(guildId, id).catch(() => null);
      if (!member) return;

      const { user, ...rest } = member as APIGuildMember;
      if (user) transcript.users[id] = { ...transcript.users[id], ...user };
      transcript.members[id] = rest as TranscriptMember;
    });
  }

  // Channels: one request for the whole guild when anything needs it, then the stragglers
  // (threads and channels of other guilds are not in that list).
  if (guildId && (needsGuildChannels || mentioned.channel.size > 0)) {
    const channels = await lookup.guildChannels(guildId).catch(() => []);
    for (const item of channels) transcript.channels[item.id] ??= item;
  }

  const forwards = messages.filter(
    (message) => message.message_reference?.type === MessageReferenceType.Forward && message.message_reference.guild_id
  );

  const missingChannels = new Set(
    [
      ...mentioned.channel,
      ...forwards.map((message) => message.message_reference!.channel_id),
      channel.parent_id ?? undefined,
    ].filter((id): id is string => id !== undefined && !transcript.channels[id])
  );

  await mapLimit([...missingChannels], concurrency, async (id) => {
    const item = await lookup.channel(id).catch(() => null);
    if (item) transcript.channels[id] = item;
  });

  // Guilds forwarded messages came from. The bot is often not in them, which is fine.
  const otherGuilds = new Set(
    forwards.map((message) => message.message_reference!.guild_id!).filter((id) => id !== guildId)
  );
  await mapLimit([...otherGuilds], concurrency, async (id) => {
    const guild = await lookup.guildInfo(id).catch(() => null);
    if (guild) transcript.guilds[id] = guild;
  });

  await resolveFiles(transcript, options, concurrency);

  return transcript;
}

function* attachmentsOf(message: APIMessage): Generator<APIAttachment> {
  yield* message.attachments;
  for (const snapshot of message.message_snapshots ?? []) yield* snapshot.message.attachments;
}

/** Text previews and image replacements. */
async function resolveFiles(transcript: Transcript, options: FetchOptions, concurrency: number): Promise<void> {
  const previews = options.filePreviews ?? true;
  const maxSize = (typeof previews === 'object' ? previews.maxSize : undefined) ?? 512 * 1024;

  const resolveImage: ResolveImageCallback | undefined =
    options.resolveImageSrc ??
    (options.saveImages instanceof TranscriptImageDownloader
      ? options.saveImages.build()
      : options.saveImages
        ? new TranscriptImageDownloader().build()
        : undefined);

  if (options.resolveImageSrc && options.saveImages) {
    console.warn(`${TAG} Both saveImages and resolveImageSrc were given; resolveImageSrc is used.`);
  }

  const jobs: (() => Promise<void>)[] = [];
  const seen = new Set<string>();

  for (const message of transcript.messages) {
    for (const attachment of attachmentsOf(message)) {
      const kind = attachmentKind(attachment);

      if (resolveImage && (kind === 'image' || kind === 'video') && !seen.has(attachment.url)) {
        seen.add(attachment.url);
        jobs.push(async () => {
          const source = await Promise.resolve(resolveImage(attachment, message)).catch((error: unknown) => {
            console.error(`${TAG} resolveImageSrc failed, keeping the original url:`, error);
            return undefined;
          });
          if (source !== undefined) transcript.assets[attachment.url] = source;
        });
      }

      if (previews && kind === 'file' && attachment.size <= maxSize && attachmentLanguage(attachment)) {
        jobs.push(async () => {
          const response = await fetch(attachment.url).catch(() => null);
          if (response?.ok) transcript.files[attachment.id] = await response.text();
        });
      }
    }
  }

  await mapLimit(jobs, concurrency, (job) => job());
}
