import type { Channel, Message, Role, User, Guild, GuildMember } from 'discord.js';
import type { AllAPIChannel, APIMessageData, GuildMemberData } from '../../utils/channel';
import type {
  APIMessage,
  APIAttachment,
  APIUser,
  APIMessageSnapshot,
  APIChannel,
  APIRole,
  APIGuild,
} from 'discord-api-types/v10';
import { toSnakeCase } from '../../utils/replacer';

// for some reason, discord.js works with camelCase but the API uses snake_case
// so we convert the keys to snake_case to match the API types
// this is a shallow conversion, so nested objects will not be converted
// and even properties are not available in the object (like message.author, snapshots, etc)
// they just return an array of ids.

export const toApiMessage = (message: Message): APIMessageData => {
  const json = message.toJSON() as APIMessage;
  const author = message.author.toJSON() as APIUser;
  const attachments = message.attachments.map((attachment) => attachment.toJSON() as APIAttachment);

  const message_snapshots =
    message.messageSnapshots?.map((snapshot) => {
      const json = (snapshot.toJSON?.() ?? {}) as APIMessageSnapshot | APIMessage;
      return {
        ...(json as APIMessageSnapshot),
        message: {
          ...(json as APIMessage),
          timestamp: String(snapshot.createdTimestamp),
        },
      };
    }) ?? [];

  return toSnakeCase<APIMessageData>({
    ...json,
    author,
    attachments,
    message_snapshots,
  });
};

export const toApiChannel = (channel: Channel): AllAPIChannel =>
  toSnakeCase<AllAPIChannel>({ ...(channel.toJSON() as APIChannel) });
export const toApiUser = (user: User): APIUser => toSnakeCase<APIUser>({ ...(user.toJSON() as APIUser) });
export const toApiRole = (role: Role): APIRole => toSnakeCase<APIRole>({ ...(role.toJSON() as APIRole) });
export const toApiGuild = (guild: Guild): APIGuild => toSnakeCase<APIGuild>({ ...(guild.toJSON() as APIGuild) });
export const toApiGuildMember = (member: GuildMember) =>
  toSnakeCase<GuildMemberData>({ ...(member.toJSON() as GuildMemberData) });
