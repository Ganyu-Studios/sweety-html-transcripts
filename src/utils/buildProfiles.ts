import { APIUser } from 'discord-api-types/v10';
import { UserFlags } from 'seyfert/lib/types';
import { RenderMessageContext } from '../generator';
import { channelUtils, GuildMemberData } from './channel';
import { userUtils } from './user';
import { convertToHEX } from './utils';
import { guildUtils } from './guild';

export type Profile = {
  id: string;
  displayName: string;
  discriminator: string;
  username: string;
  globalName?: string | null;
  author: string; // author of the message
  avatar?: string; // avatar of the author
  roleColor?: string; // role color of the author
  roleIcon?: string; // role color of the author
  roleName?: string; // role name of the author

  bot?: boolean; // is the author a bot
  verified?: boolean; // is the author verified,
  clanTag?: string | null; // clan tag of the author
  clanIcon?: string | null; // clan badge of the author
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

  if (guildId && !member) member = await context.adapter.resolveGuildMember(guildId, author.id);

  const role = await context.adapter.resolveHighestGuildMemberRole(member!, guildId!);

  const authorName = author.bot ? author.username : userUtils.displayName(author);
  const roleColor = role?.color ?? author.accent_color;

  return {
    id: author.id,
    author: member?.nick ?? authorName,
    displayName: member?.nick ?? (author.global_name ?? author.username),
    discriminator: author.discriminator,
    username: author.username,
    globalName: author.global_name,
    avatar: (member && guildId ? userUtils.memberAvatarURL(member, author, guildId, { size: 64 }) : null) ?? userUtils.avatarURL(author, { size: 64 }),
    roleColor: roleColor ? convertToHEX(roleColor) : undefined,
    roleIcon: role?.icon ?? undefined,
    roleName: role?.name ?? undefined,
    bot: author.bot,
    verified: (author.public_flags ?? 0 & UserFlags.VerifiedBot) === UserFlags.VerifiedBot,
    clanTag: author.primary_guild?.tag,
    clanIcon: author.primary_guild?.identity_guild_id && author.primary_guild?.badge && guildUtils.guildTagBadge(author.primary_guild.identity_guild_id, author.primary_guild.badge, { size: 32, extension: 'png' }),
  } satisfies Profile;
}
