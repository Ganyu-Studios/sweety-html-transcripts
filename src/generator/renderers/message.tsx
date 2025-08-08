import {
  DiscordAttachments,
  DiscordCommand,
  DiscordMessage as DiscordMessageComponent,
  DiscordReaction,
  DiscordReactions,
  DiscordThread,
  DiscordThreadMessage
} from '@penwin/discord-components-react-render';
import { APIMessageComponentEmoji, ChannelType, InteractionType } from 'discord-api-types/v10';
import React from 'react';
import type { RenderMessageContext } from '..';
import { APIMessageData } from '../../utils/channel';
import { parseDiscordEmoji } from '../../utils/utils';
import { Attachments } from './attachment';
import { Component } from './components';
import MessageContent, { RenderType } from './content';
import { DiscordEmbed } from './embed';
import MessageReply from './reply';
import DiscordSystemMessage from './systemMessage';

export default async function DiscordMessage({
  message,
  context,
}: {
  message: APIMessageData;
  context: RenderMessageContext;
}) {

  const { adapter } = context;

  if ('system' in message) return <DiscordSystemMessage message={message} context={context} />;

  const isCrosspost = message.message_reference && message.message_reference.guild_id !== message.guild_id;

  const threadMessage =
    message.thread &&
      (message.thread.type === ChannelType.PublicThread || message.thread.type === ChannelType.PrivateThread)
      ? await adapter.resolveMessage(message.thread.id, message.thread.last_message_id!)
      : null;


  return (
    <DiscordMessageComponent
      id={`m-${message.id}`}
      timestamp={message.timestamp}
      key={message.id}
      edited={message.edited_timestamp !== null}
      server={isCrosspost ?? undefined}
      highlight={message.mention_roles.includes('@everyone') || message.mention_roles.includes('@here')}
      profile={message.author.id}
    >
      {/* reply */}
      <MessageReply message={message} context={context} />

      {/* slash command */}
      {message.interaction_metadata?.type === InteractionType.ApplicationCommand && (
        <DiscordCommand
          slot="reply"
          profile={message.interaction_metadata.user.id}
          //@ts-expect-error not implented yet
          command={'/' + message.interaction.name}
        />
      )}

      {/* message content */}
      {message.content && (
        <MessageContent
          content={message.content}
          context={{ ...context, type: message.webhook_id ? RenderType.WEBHOOK : RenderType.NORMAL }}
        />
      )}

      {/* attachments */}
      <Attachments message={message} context={context} />

      {/* message embeds */}
      {message.embeds.map((embed, id) => (
        <DiscordEmbed embed={embed} context={{ ...context, index: id, message }} key={id} />
      ))}

      {/* components */}
      {message.components && message.components.length > 0 && (
        <DiscordAttachments slot="components">
          {message.components.map((component, id) => (
            <Component key={id} component={component} id={id} />
          ))}
        </DiscordAttachments>
      )}

      {/* reactions */}
      {message.reactions && message.reactions.length > 0 && (
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
      {message.thread &&
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
