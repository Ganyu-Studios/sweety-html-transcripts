import type { APIGuild, APIRole, APIUser } from 'discord-api-types/v10';
import type { AllChannels, UsingClient } from 'seyfert';
import { AttachmentBuilder } from 'seyfert';
import type { AllAPIChannel, APIMessageData, GuildMemberData } from '../utils/channel';
import { TranscriptAdapter } from './core';
import type { CreateTranscriptOptions, ExportReturnType } from '../types';
import { createTranscript } from '..';

export class SeyfertTranscriptAdapter extends TranscriptAdapter<UsingClient> {
  override resolveChannel(id: string): Promise<AllAPIChannel | null> {
    return this.client.channels.raw(id).catch(() => null) as Promise<AllAPIChannel | null>;
  }

  override resolveUser(id: string): Promise<APIUser | null> {
    return this.client.users.raw(id).catch(() => null);
  }

  override resolveRole(guildId: string, id: string): Promise<APIRole | null> {
    return this.client.roles.raw(guildId, id).catch(() => null);
  }

  override resolveGuild(id: string): Promise<APIGuild | null> {
    return this.client.guilds.raw(id).catch(() => null) as Promise<APIGuild | null>;
  }

  override async resolveMessage(channelId: string, messageId: string): Promise<APIMessageData | null> {
    const message = (await this.client.messages.raw(messageId, channelId).catch(() => null)) as APIMessageData | null;
    if (!message) return null;

    // why seyfert? WHY
    // for some reason, some messages don't have an author but have a user_id
    if (typeof message.author === 'undefined' && 'user_id' in message && message.user_id)
      message.author = (await this.resolveUser(message.user_id))!;

    return message;
  }

  override listChannelMessages(
    channelId: string,
    options: { limit?: number; before?: string }
  ): Promise<APIMessageData[]> {
    if (options && !options?.before) delete options.before;

    return this.client.messages
      .list(channelId, options)
      .then((messages) =>
        Promise.all(messages.map((message) => this.client.messages.raw(message.id, message.channelId)))
      )
      .catch(() => []) as Promise<APIMessageData[]>;
  }

  override resolveGuildChannels(guildId: string): Promise<AllAPIChannel[]> {
    return this.client.guilds.channels
      .list(guildId)
      .then((channels) => Promise.all(channels.map((channel) => this.client.channels.raw(channel.id))))
      .catch(() => []) as Promise<AllAPIChannel[]>;
  }

  override createTranscriptAttachment(html: string, filename: string): AttachmentBuilder {
    return new AttachmentBuilder().setFile('buffer', Buffer.from(html)).setName(filename);
  }

  override resolveGuildRoles(guildId: string): Promise<APIRole[]> {
    return this.client.roles
      .list(guildId)
      .then((roles) => Promise.all(roles.map((role) => this.client.roles.raw(role.guildId, role.id))))
      .catch(() => []);
  }

  override resolveGuildMember(guildId: string, userId: string): Promise<GuildMemberData | null> {
    return this.client.members.raw(guildId, userId).catch(() => null);
  }
}

export class SeyfertTranscript {
  static async create<T extends ExportReturnType = ExportReturnType.Attachment>(
    options: Omit<CreateTranscriptOptions<T, SeyfertTranscriptAdapter>, 'adapter' | 'channel'> & {
      channel: AllChannels;
    }
  ) {
    const raw = await options.channel.client.channels.raw(options.channel.id);
    return createTranscript<SeyfertTranscriptAdapter, T>({
      ...options,
      adapter: new SeyfertTranscriptAdapter(options.channel.client),
      channel: raw as AllAPIChannel,
    });
  }
}
