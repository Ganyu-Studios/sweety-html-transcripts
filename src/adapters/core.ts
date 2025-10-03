import type {
  ChannelSelectMenuOptionData,
  RoleSelectMenuOptionData,
  UserSelectMenuOptionData,
} from '@penwin/discord-components-core';
import type { APIGuild, APIMessage, APIRole, APIUser, GatewayGuildCreateDispatchData } from 'discord-api-types/v10';
import type { Profile } from '../utils/profiles';
import type { AllAPIChannel, APIMessageData, GuildMemberData } from '../utils/channel';

export type Awaitable<T> = Promise<T> | T;

export abstract class TranscriptAdapter<Client> {
  constructor(protected client: Client) {}

  abstract resolveChannel(id: string): Awaitable<AllAPIChannel | null>;
  abstract resolveUser(id: string): Awaitable<APIUser | null>;
  abstract resolveRole(guildId: string, id: string): Awaitable<APIRole | null>;
  abstract resolveGuild(id: string): Awaitable<APIGuild | GatewayGuildCreateDispatchData | null>;
  abstract resolveMessage(channelId: string, messageId: string): Awaitable<APIMessageData | null>;
  abstract listChannelMessages(
    channelId: string,
    options?: { limit?: number; before?: string }
  ): Awaitable<APIMessage[]>;
  abstract createTranscriptAttachment(html: string, filename: string): Awaitable<unknown>;
  abstract resolveGuildRoles(guildId: string): Awaitable<APIRole[]>;
  abstract resolveGuildMember(guildId: string, userId: string): Awaitable<GuildMemberData | null>;
  abstract resolveGuildChannels(guildId: string): Awaitable<AllAPIChannel[]>;

  async resolveGuildMemberRoles(member: Pick<GuildMemberData, 'roles'>, guildId: string) {
    const guildRoles = await this.resolveGuildRoles(guildId);
    return guildRoles.filter((role) => member.roles.includes(role.id));
  }

  async resolveHighestGuildMemberRole(member: Pick<GuildMemberData, 'roles'>, guildId: string) {
    const roles = await this.resolveGuildMemberRoles(member, guildId);
    return roles.sort((a, b) => b.position - a.position)[0];
  }

  renderContext = {
    selectMenu: {
      users: <{ data: UserSelectMenuOptionData[]; injectedScript: boolean } | null>null,
      roles: <{ data: RoleSelectMenuOptionData[]; injectedScript: boolean } | null>null,
      channels: <{ data: ChannelSelectMenuOptionData[]; injectedScript: boolean } | null>null,
    },
    profiles: <Record<string, Profile>>{},
  };
}
