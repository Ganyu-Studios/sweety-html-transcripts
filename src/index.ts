import DiscordMessages from './generator';
import {
  ExportReturnType,
  type CreateTranscriptOptions,
  type GenerateFromMessagesOptions,
  type ObjectType,
} from './types';
import { TranscriptImageDownloader, type ResolveImageCallback } from './downloader/images';
import type { AllChannels, AllGuildChannels, Message } from 'seyfert';
import { AttachmentBuilder, Collection } from 'seyfert';
import { writeFile } from 'fs/promises';

// re-exports
export { default as DiscordMessages } from './generator/transcript';
export { TranscriptImageDownloader } from './downloader/images';
/**
 *
 * @param messages The messages to generate a transcript from
 * @param channel  The channel the messages are from (used for header and guild name)
 * @param options  The options to use when generating the transcript
 * @returns        The generated transcript
 */
export async function generateFromMessages<T extends ExportReturnType = ExportReturnType.Attachment>(
  messages: Message[] | Collection<string, Message>,
  channel: AllGuildChannels,
  options: GenerateFromMessagesOptions<T> = {}
): Promise<ObjectType<T>> {
  // turn messages into an array
  const transformedMessages = messages instanceof Collection ? Array.from(messages.values()) : messages;
  const allMessages = transformedMessages.map((message) => {
    if (channel.isDM() || channel.isDirectory()) return message;
    if (typeof message.guildId === 'undefined') message.guildId = channel.guildId;
    return message;
  });

  // figure out how the user wants images saved
  let resolveImageSrc: ResolveImageCallback = options.callbacks?.resolveImageSrc ?? ((attachment) => attachment.url);
  if (options.saveImages) {
    if (options.callbacks?.resolveImageSrc) {
      console.warn(
        `[seyfert-html-transcripts] You have specified both saveImages and resolveImageSrc, please only specify one. resolveImageSrc will be used.`
      );
    } else {
      resolveImageSrc = new TranscriptImageDownloader().build();
      console.log('Using default downloader');
    }
  }

  // render the messages
  const html = await DiscordMessages({
    messages: allMessages,
    channel,
    saveImages: options.saveImages ?? false,
    callbacks: {
      resolveImageSrc,
      resolveChannel: async (id) => channel.client.channels.fetch(id).catch(() => null),
      resolveUser: async (id) => channel.client.users.fetch(id).catch(() => null),
      resolveRole:
        channel.isDM() || channel.isDirectory()
          ? () => null
          : async (id) => channel.client.roles.fetch(channel.guildId, id).catch(() => null),

      ...(options.callbacks ?? {}),
    },
    poweredBy: options.poweredBy ?? true,
    footerText: options.footerText ?? 'Exported {number} message{s}.',
    favicon: options.favicon ?? 'guild',
    hydrate: options.hydrate ?? false,
  });

  await writeFile('index.html', html);

  // return the html in the specified format
  if (options.returnType === ExportReturnType.Buffer) {
    return Buffer.from(html) as unknown as ObjectType<T>;
  }

  if (options.returnType === ExportReturnType.String) {
    return html as unknown as ObjectType<T>;
  }

  return new AttachmentBuilder()
    .setFile('buffer', Buffer.from(html))
    .setName(options.filename ?? `transcript-${channel.id}.html`) as unknown as ObjectType<T>;
}

/**
 *
 * @param channel The channel to create a transcript from
 * @param options The options to use when creating the transcript
 * @returns       The generated transcript
 */
export async function createTranscript<T extends ExportReturnType = ExportReturnType.Attachment>(
  channel: AllChannels,
  options: CreateTranscriptOptions<T> = {}
): Promise<ObjectType<T>> {
  // validate type
  if (!channel.isGuildTextable()) throw new TypeError(`Provided channel must be text-based, received ${channel.type}`);

  // fetch messages
  let allMessages: Message[] = [];
  let lastMessageId: string | undefined;
  const { limit, filter } = options;
  const resolvedLimit = typeof limit === 'undefined' || limit === -1 ? Infinity : limit;

  // until there are no more messages, keep fetching

  while (true) {
    // create fetch options
    const fetchLimitOptions = { limit: 100, before: lastMessageId };
    if (!lastMessageId) delete fetchLimitOptions.before;

    // fetch messages
    const messages = await channel.messages.list(fetchLimitOptions);
    const filteredMessages = typeof filter === 'function' ? messages.filter(filter) : messages;

    // add the messages to the array
    allMessages.push(...filteredMessages);
    // Get the last key of 'messages', not 'filteredMessages' because you will be refetching the same messages
    lastMessageId = messages.at(-1)?.id;

    // if there are no more messages, break
    if (messages.length < 100) break;

    // if the limit has been reached, break
    if (allMessages.length >= resolvedLimit) break;
  }

  if (resolvedLimit < allMessages.length) allMessages = allMessages.slice(0, limit);

  // generate the transcript
  return generateFromMessages<T>(allMessages.reverse(), channel, options);
}

export default {
  createTranscript,
  generateFromMessages,
};
export * from './types';
