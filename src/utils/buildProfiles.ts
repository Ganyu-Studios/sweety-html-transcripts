import { APIUser } from 'discord-api-types/v10';
import { UserFlags } from 'seyfert/lib/types';
import { RenderMessageContext } from '../generator';
import { channelUtils, GuildMemberData } from './channel';
import { userUtils } from './user';
import { convertToHEX } from './utils';

export type Profile = {
  author: string; // author of the message
  avatar?: string; // avatar of the author
  roleColor?: string; // role color of the author
  roleIcon?: string; // role color of the author
  roleName?: string; // role name of the author

  bot?: boolean; // is the author a bot
  verified?: boolean; // is the author verified
};

export async function buildProfiles(context: RenderMessageContext) {

  const { adapter, messages } = context;

  const profiles: Record<string, Profile> = {};

  // loop through messages
  for (const message of messages) {
    // add all users
    const author = message.author;
    if (!profiles[author.id]) {
      // add profile
      const member = await adapter.resolveGuildMember(message.guild_id!, author.id);
      profiles[author.id] = await buildProfile(member, message.guild_id, author, context);
    }

    // add interaction users
    if (message.interaction_metadata) {
      // const user = await message.client.users.fetch(message.interactionMetadata.user.id);
      const user = await adapter.resolveUser(message.interaction_metadata.user.id);

      if (user && !profiles[user.id]) {
        profiles[user.id] = await buildProfile(null, message.guild_id, user, context);
      }
    }

    // threads
    if (message.thread && channelUtils.isThread(message.thread) && message.thread.last_message_id) {

      const thread = (await adapter.resolveMessage(message.thread.id, message.thread.last_message_id!))!;

      profiles[thread.author.id] = await buildProfile(null, message.guild_id, thread.author, context);
    }
  }

  // return as a JSON
  return profiles;
}

async function buildProfile(member: GuildMemberData | null | undefined, guildId: string | null | undefined, author: APIUser, context: RenderMessageContext) {
  // await author.fetch();

  // if (guildId && !member) member = await author.client.members.fetch(guildId, author.id);
  if (guildId && !member) member = await context.adapter.resolveGuildMember(guildId, author.id);

  const role = await context.adapter.resolveHighestGuildMemberRole(member!, guildId!);
  // await member?.fetch();

  // const role = await member?.roles.highest();

  // await role?.fetch();

  const authorName = author.bot ? author.username : userUtils.tag(author);
  const roleColor = role?.color ?? author.accent_color;

  return {
    author: member?.nick ?? authorName,
    avatar: (member && guildId ? userUtils.memberAvatarURL(member, author, guildId, { size: 64 }) : null) ?? userUtils.avatarURL(author, { size: 64 }),
    roleColor: roleColor ? convertToHEX(roleColor) : undefined,
    roleIcon: role?.icon ?? undefined,
    roleName: role?.name ?? undefined,
    bot: author.bot,
    verified: (author.public_flags ?? 0 & UserFlags.VerifiedBot) === UserFlags.VerifiedBot,
  };
}
