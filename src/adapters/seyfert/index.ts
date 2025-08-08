import { APIGuild, APIRole, APIUser, GatewayGuildCreateDispatchData } from "discord-api-types/v10";
import { AllChannels, AttachmentBuilder, UsingClient } from "seyfert";
import { AllAPIChannel, APIMessageData, GuildMemberData } from "../../utils/channel";
import { Awaitable, TranscriptAdapter } from "../core";
import "./transformers";
import { TranscriptGuild } from "./transformers";
import { CreateTranscriptOptions, ExportReturnType } from "../../types";
import { createTranscript } from "../..";

export class SeyfertTranscriptAdapter extends TranscriptAdapter<UsingClient> {

  override resolveChannel(id: string): Awaitable<AllAPIChannel | null> | null {
    return this.client.channels.fetch(id).then(channel => channel.data as AllAPIChannel).catch(() => null);
  }

  override resolveUser(id: string): Awaitable<APIUser | null> | null {
    return this.client.users.fetch(id).then(user => user?.data).catch(() => null);
  }

  override resolveRole(guildId: string, id: string): Awaitable<APIRole | null> | null {
    return this.client.roles.fetch(guildId, id).then(role => role.data).catch(() => null);
  }

  override resolveGuild(id: string): Awaitable<APIGuild | GatewayGuildCreateDispatchData | null> | null {
    return this.client.guilds.fetch(id).then(guild => (guild as TranscriptGuild).data as APIGuild | GatewayGuildCreateDispatchData).catch(() => null);
  }

  override resolveMessage(channelId: string, messageId: string): Awaitable<APIMessageData | null> | null {
    return this.client.messages.fetch(messageId, channelId).then(message => message?.data as APIMessageData).catch(() => null);
  }

  override listChannelMessages(channelId: string, options: { limit?: number, before?: string }): Awaitable<APIMessageData[]> {

    if (options && !options?.before) delete options.before;

    return this.client.messages.list(channelId, options).then(messages => messages.map(message => message.data as APIMessageData)).catch(() => []);
  }

  override createTranscriptAttachment(html: string, filename: string) {
    return new AttachmentBuilder()
      .setFile('buffer', Buffer.from(html))
      .setName(filename)
  }

  override resolveGuildRoles(guildId: string): Awaitable<APIRole[]> {
    return this.client.roles.list(guildId).then(roles => roles.map(role => role.data)).catch(() => [])
  }

  override resolveGuildMember(guildId: string, userId: string): Awaitable<GuildMemberData | null> {
    return this.client.members.fetch(guildId, userId).then(member => member.data as GuildMemberData).catch(() => null);
  }

}

export class SeyfertTranscript {

  static async create<T extends ExportReturnType = ExportReturnType.Attachment>(options: Omit<CreateTranscriptOptions<T, SeyfertTranscriptAdapter>, 'adapter' | 'channel'> & {
    channel: AllChannels
  }) {
    return createTranscript<SeyfertTranscriptAdapter, T>({
      ...options,
      adapter: new SeyfertTranscriptAdapter(options.channel.client),
      channel: options.channel.data as AllAPIChannel,
    });
  }
}

export { ExportReturnType } from '../../types';