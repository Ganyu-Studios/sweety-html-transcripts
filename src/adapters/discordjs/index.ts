import { AttachmentBuilder } from 'discord.js';
import { TranscriptAdapter } from '../core';
import type { GatewayGuildCreateDispatchData, Client, Channel } from 'discord.js';
import type { APIUser, APIRole, APIGuild, APIMessage } from 'discord-api-types/v10';
import type { AllAPIChannel, APIMessageData, GuildMemberData } from '../../utils/channel';
import type { CreateTranscriptOptions, ExportReturnType } from '../../types';
import { createTranscript } from '../..';
import { toApiChannel, toApiGuild, toApiGuildMember, toApiMessage, toApiRole, toApiUser } from './api';

export class DiscordJSTranscriptAdapter extends TranscriptAdapter<Client> {
  override async resolveChannel(id: string): Promise<AllAPIChannel | null> {
    const channel = await this.client.channels.fetch(id).catch(() => null);
    if (!channel) return null;

    return toApiChannel(channel);
  }

  override async resolveUser(id: string): Promise<APIUser | null> {
    const user = await this.client.users.fetch(id).catch(() => null);
    if (!user) return null;

    return toApiUser(user);
  }

  override async resolveRole(guildId: string, id: string): Promise<APIRole | null> {
    const guild = await this.client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return null;

    const role = await guild.roles.fetch(id).catch(() => null);
    if (!role) return null;

    return toApiRole(role);
  }

  override async resolveGuild(id: string): Promise<APIGuild | GatewayGuildCreateDispatchData | null> {
    const guild = await this.client.guilds.fetch(id).catch(() => null);
    if (!guild) return null;

    return toApiGuild(guild);
  }

  override async resolveMessage(channelId: string, messageId: string): Promise<APIMessageData | null> {
    const channel = await this.client.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased()) return null;

    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message) return null;

    return toApiMessage(message);
  }

  override async listChannelMessages(
    channelId: string,
    options?: { limit?: number; before?: string }
  ): Promise<APIMessage[]> {
    const channel = await this.client.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased()) return [];

    const messages = await channel.messages.fetch(options).catch(() => null);
    if (!messages) return [];

    return messages.map((message) => toApiMessage(message));
  }

  override createTranscriptAttachment(html: string, filename: string): AttachmentBuilder {
    return new AttachmentBuilder(Buffer.from(html)).setName(filename);
  }

  override async resolveGuildRoles(guildId: string): Promise<APIRole[]> {
    const guild = await this.client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return [];

    const roles = await guild.roles.fetch().catch(() => null);
    if (!roles) return [];

    return roles.map((role) => toApiRole(role));
  }

  override async resolveGuildMember(guildId: string, userId: string): Promise<GuildMemberData | null> {
    const guild = await this.client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return null;

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return null;

    return toApiGuildMember(member);
  }

  override async resolveGuildChannels(guildId: string): Promise<AllAPIChannel[]> {
    const guild = await this.client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return [];

    const channels = await guild.channels.fetch().catch(() => null);
    if (!channels) return [];

    return channels
      .map((channel) => {
        if (!channel) return null;
        return toApiChannel(channel);
      })
      .filter((channel): channel is AllAPIChannel => channel !== null);
  }
}

export class DiscordJSTranscript {
  static async create<T extends ExportReturnType = ExportReturnType.Attachment>(
    options: Omit<CreateTranscriptOptions<T, DiscordJSTranscriptAdapter>, 'adapter' | 'channel'> & {
      channel: Channel;
    }
  ) {
    return createTranscript<DiscordJSTranscriptAdapter, T>({
      ...options,
      adapter: new DiscordJSTranscriptAdapter(options.channel.client),
      channel: toApiChannel(options.channel),
    });
  }
}
