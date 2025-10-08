import { DiscordReply } from '@penwin/discord-components-react-render';
import React from 'react';
import { UserFlags } from 'discord-api-types/v10';
import type { RenderMessageContext } from '..';
import type { APIMessageData } from '../../utils/channel';
import { channelUtils } from '../../utils/channel';
import { convertToHEX } from '../../utils/utils';
import MessageContent, { RenderType } from './content';
import { userUtils } from '../../utils/user';
import { isObject } from '../../utils/replacer';
import { messageUtils } from '../../utils/message';

export default async function MessageReply({
  message,
  context,
}: {
  message: APIMessageData;
  context: RenderMessageContext;
}) {
  if (messageUtils.isForward(message)) return null;
  if (!message.message_reference) return null;

  if (message.message_reference.guild_id !== message.guild_id) return null;

  const referencedMessage = message.message_reference.message_id
    ? await context.adapter.resolveMessage(message.message_reference.channel_id, message.message_reference.message_id)
    : null;
  if (!referencedMessage) return <DiscordReply slot="reply">Message could not be loaded.</DiscordReply>;

  const isCrosspost =
    referencedMessage.message_reference && referencedMessage.message_reference.guild_id !== message.guild_id;
  const isCommand = isObject(referencedMessage.interaction_metadata);

  const referencedMember = (await context.adapter.resolveGuildMember(message.guild_id!, referencedMessage.author.id))!;

  const channel = await context.adapter.resolveChannel(message.channel_id);
  const role = await context.adapter.resolveHighestGuildMemberRole(referencedMember, message.guild_id!);

  const roleColor = role?.color ?? referencedMessage.author.accent_color;
  const authorName = referencedMessage.author.bot
    ? referencedMessage.author.username
    : userUtils.displayName(referencedMessage.author);

  return (
    <DiscordReply
      slot="reply"
      edited={!isCommand && referencedMessage.edited_timestamp !== null}
      attachment={referencedMessage.attachments.length > 0}
      author={referencedMessage.member?.nick ?? authorName}
      avatar={userUtils.avatarURL(referencedMessage.author, { size: 32 })}
      roleColor={roleColor ? convertToHEX(roleColor) : undefined}
      bot={!isCrosspost && referencedMessage.author.bot}
      verified={(referencedMessage.author.public_flags ?? 0 & UserFlags.VerifiedBot) === UserFlags.VerifiedBot}
      op={Boolean(channel && channelUtils.isThread(channel) && referencedMessage.author.id === channel.owner_id)}
      server={isCrosspost ?? undefined}
      command={isCommand}
    >
      {referencedMessage.content ? (
        <span data-goto={referencedMessage.id}>
          <MessageContent content={referencedMessage.content} context={{ ...context, type: RenderType.REPLY }} />
        </span>
      ) : isCommand ? (
        <em data-goto={referencedMessage.id}>Click to see command.</em>
      ) : (
        <em data-goto={referencedMessage.id}>Click to see attachment.</em>
      )}
    </DiscordReply>
  );
}
