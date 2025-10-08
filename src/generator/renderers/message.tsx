import {
  DiscordAttachments,
  DiscordCommand,
  DiscordForwardedMessage,
  DiscordMessage as DiscordMessageComponent,
  DiscordReaction,
  DiscordReactions,
  DiscordThread,
  DiscordThreadMessage,
  DiscordComponentsColumn,
} from '@penwin/discord-components-react-render';
import type { APIMessageComponentEmoji, APIMessageSnapshot } from 'discord-api-types/v10';
import { ChannelType, InteractionType, MessageReferenceType } from 'discord-api-types/v10';
import React from 'react';
import type { RenderMessageContext } from '..';
import type { APIMessageData } from '../../utils/channel';
import { parseDiscordEmoji } from '../../utils/utils';
import { Attachments } from './attachment';
import { Component } from './components';
import MessageContent, { RenderType } from './content';
import { DiscordEmbed } from './embed';
import MessageReply from './reply';
import DiscordSystemMessage, { SystemMessageTypes } from './systemMessage';
import { messageUtils } from '../../utils/message';
import { guildUtils } from '../../utils/guild';

export default async function DiscordMessage({
  message,
  snapshot,
  snapshotId,
  context,
}: {
  context: RenderMessageContext;
} & (
  | { message: APIMessageData; snapshot?: undefined; snapshotId?: undefined }
  | { snapshot: APIMessageSnapshot; message?: undefined; snapshotId: string | number }
)) {
  const { adapter } = context;

  const isSystem = message && 'system' in message && message.system === true;
  if (message && (isSystem || SystemMessageTypes.includes(message.type)))
    return <DiscordSystemMessage message={message} context={context} />;

  const isCrosspost =
    message?.message_reference &&
    message.message_reference.type !== MessageReferenceType.Forward &&
    message.message_reference.guild_id !== message.guild_id;

  const threadMessage =
    message?.thread &&
    (message.thread.type === ChannelType.PublicThread || message.thread.type === ChannelType.PrivateThread)
      ? await adapter.resolveMessage(message.thread.id, message.thread.last_message_id!)
      : null;

  const displayMessage = (message ?? snapshot.message) as (APIMessageData | APIMessageSnapshot['message']) & {
    webhook_id?: string;
  };

  const componets = displayMessage?.components && displayMessage.components.length > 0 && (
    <DiscordAttachments slot="components">
      <DiscordComponentsColumn>
        {displayMessage.components.map((component, id) => (
          <Component key={id} component={component} id={id} context={context} />
        ))}
      </DiscordComponentsColumn>
    </DiscordAttachments>
  );

  const id = message ? `m-${message.id}` : `sn-${snapshotId}`;

  const isForward = message && messageUtils.isForward(message);

  const [forwardedGuild, forwardedChannel] = await Promise.all([
    isForward && message.message_reference?.guild_id ? adapter.resolveGuild(message.message_reference.guild_id) : null,
    isForward && message.message_reference?.guild_id
      ? adapter.resolveChannel(message.message_reference.channel_id)
      : null,
  ]);

  return (
    <DiscordMessageComponent
      id={id}
      timestamp={displayMessage.timestamp}
      raw-timestamp={displayMessage.timestamp}
      key={id}
      edited={displayMessage.edited_timestamp !== null}
      server={isCrosspost ?? undefined}
      highlight={message?.mention_roles?.includes('@everyone') || message?.mention_roles?.includes('@here')}
      profile={message?.author?.id}
    >
      {/* reply */}
      {message && <MessageReply message={message} context={context} />}

      {/* slash command */}
      {message?.interaction_metadata?.type === InteractionType.ApplicationCommand && (
        <DiscordCommand
          slot="reply"
          profile={message.interaction_metadata.user.id}
          command={'/' + message.interaction!.name}
        />
      )}

      {/* message content */}
      {displayMessage.content && (
        <MessageContent
          content={displayMessage.content}
          context={{ ...context, type: displayMessage.webhook_id ? RenderType.WEBHOOK : RenderType.NORMAL }}
        />
      )}

      <Attachments message={displayMessage} context={context} />

      {/* message embeds */}
      {displayMessage.embeds.map((embed, id) => (
        <DiscordEmbed embed={embed} context={{ ...context, index: id, message: displayMessage }} key={id} />
      ))}

      {componets}

      {message?.message_snapshots?.map((snpashot, index) => (
        <DiscordForwardedMessage
          key={index}
          guild-icon={forwardedGuild ? guildUtils.iconURL(forwardedGuild, { size: 32, extension: 'png' }) : undefined}
          channel-name={forwardedChannel && 'name' in forwardedChannel ? (forwardedChannel.name ?? void 0) : undefined}
          timestamp={snpashot.message.timestamp}
          is-same-guild={forwardedGuild?.id === context.guild?.id}
        >
          <DiscordMessage snapshot={snpashot} context={context} snapshotId={index} />
        </DiscordForwardedMessage>
      ))}

      {/* reactions */}
      {message?.reactions && message?.reactions.length > 0 && (
        <DiscordReactions slot="reactions">
          {message.reactions.map((reaction, id) => (
            <DiscordReaction
              key={`${message.id}r${id}`}
              name={reaction.emoji.name!}
              emoji={parseDiscordEmoji(reaction.emoji as APIMessageComponentEmoji)}
              count={reaction.count}
            />
          ))}
        </DiscordReactions>
      )}

      {/* threads */}
      {message?.thread &&
        (message.thread.type === ChannelType.PublicThread || message.thread.type === ChannelType.PrivateThread) && (
          <DiscordThread
            slot="thread"
            name={message.thread.name}
            cta={
              message.thread.message_count
                ? `${message.thread.message_count} Message${message.thread.message_count > 1 ? 's' : ''}`
                : 'View Thread'
            }
          >
            {message.thread.last_message_id && threadMessage ? (
              <DiscordThreadMessage
                profile={
                  // (await message.client.messages.fetch(message.thread.lastMessageId, message.thread.id)).author.id
                  (await adapter.resolveMessage(message.thread.id, message.thread.last_message_id!))?.author.id
                }
              >
                <MessageContent
                  content={
                    threadMessage.content.length > 128
                      ? threadMessage.content.substring(0, 125) + '...'
                      : threadMessage.content
                  }
                  context={{ ...context, type: RenderType.REPLY }}
                />
              </DiscordThreadMessage>
            ) : (
              `Thread messages not saved.`
            )}
          </DiscordThread>
        )}
    </DiscordMessageComponent>
  );
}
