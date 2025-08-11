import { APIMessage } from 'discord-api-types/v10';
import { Collection } from 'seyfert';
import { TranscriptAdapter } from './adapters/core';
import { TranscriptImageDownloader, type ResolveImageCallback } from './downloader/images';
import DiscordMessages from './generator';
import {
  ExportReturnType,
  type CreateTranscriptOptions,
  type GenerateFromMessagesOptions,
  type ObjectType,
} from './types';
import { APIMessageData, channelUtils } from './utils/channel';
import { name as packageName } from '../package.json';

// re-exports
export { TranscriptImageDownloader } from './downloader/images';
export { default as DiscordMessages } from './generator/transcript';
export * from './types';

/**
 *
 * @param messages The messages to generate a transcript from
 * @param channel  The channel the messages are from (used for header and guild name)
 * @param options  The options to use when generating the transcript
 * @returns        The generated transcript
 */
export async function generateFromMessages<Adapter extends TranscriptAdapter<unknown>, T extends ExportReturnType = ExportReturnType.Attachment>(
  messages: APIMessageData[],
  options: GenerateFromMessagesOptions<T, Adapter>
): Promise<ObjectType<T, Adapter>> {

  const { adapter, channel } = options;

  const guild = "guild_id" in channel && channel.guild_id ? await adapter.resolveGuild(channel.guild_id) : null;

  // turn messages into an array
  const transformedMessages = messages instanceof Collection ? Array.from(messages.values()) : messages;
  const allMessages = transformedMessages.map((message) => {
    if (channelUtils.isDM(channel) || channelUtils.isDirectory(channel)) return message;
    if (typeof message.guild_id === 'undefined' && guild) message.guild_id = guild.id;
    return message;
  });


  // figure out how the user wants images saved
  let resolveImageSrc: ResolveImageCallback = options.callbacks?.resolveImageSrc ?? ((attachment) => attachment.url);
  if (options.saveImages) {
    if (options.callbacks?.resolveImageSrc) {
      console.warn(
        `[${packageName}] You have specified both saveImages and resolveImageSrc, please only specify one. resolveImageSrc will be used.`
      );
    } else {
      resolveImageSrc = new TranscriptImageDownloader().build();
      console.log('Using default downloader');
    }
  }

  // render the messages
  const html = await DiscordMessages({
    adapter,
    messages: allMessages,
    channel,
    saveImages: options.saveImages ?? false,
    guild,
    callbacks: {
      resolveImageSrc,
      resolveChannel: async (id) => adapter.resolveChannel(id),
      resolveUser: async (id) => adapter.resolveUser(id),
      resolveRole: async (id) => guild ? adapter.resolveRole(guild.id, id) : null,

      ...(options.callbacks ?? {}),
    },
    poweredBy: options.poweredBy ?? true,
    footerText: options.footerText ?? 'Exported {number} message{s}.',
    favicon: options.favicon ?? 'guild',
    hydrate: options.hydrate ?? false,
  });

  // return the html in the specified format
  if (options.returnType === ExportReturnType.Buffer) {
    return Buffer.from(html) as unknown as ObjectType<T, Adapter>;
  }

  if (options.returnType === ExportReturnType.String) {
    return html as unknown as ObjectType<T, Adapter>;
  }

  return adapter.createTranscriptAttachment(html, options.filename ?? `transcript-${channel.id}.html`) as ObjectType<T, Adapter>;
}

/**
 *
 * @param channel The channel to create a transcript from
 * @param options The options to use when creating the transcript
 * @returns       The generated transcript
 */
export async function createTranscript<Adapter extends TranscriptAdapter<unknown>, T extends ExportReturnType = ExportReturnType.Attachment>(
  options: CreateTranscriptOptions<T, Adapter>
): Promise<ObjectType<T, Adapter>> {

  const { channel, adapter } = options;

  // validate type
  if (!channelUtils.isGuildTextable(channel)) throw new TypeError(`Provided channel must be text-based, received ${channel.type}`);

  // fetch messages
  let allMessages: APIMessage[] = [];
  let lastMessageId: string | undefined;
  const { limit, filter } = options;
  const resolvedLimit = typeof limit === 'undefined' || limit === -1 ? Infinity : limit;

  // until there are no more messages, keep fetching

  while (true) {
    // create fetch options
    const fetchLimitOptions = { limit: 100, before: lastMessageId };
    if (!lastMessageId) delete fetchLimitOptions.before;

    // fetch messages
    // const messages = await channel.messages.list(fetchLimitOptions);
    const messages = await adapter.listChannelMessages(channel.id, fetchLimitOptions);
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
  return generateFromMessages<Adapter, T>(allMessages.reverse(), options);
}

export default {
  createTranscript,
  generateFromMessages,
};

