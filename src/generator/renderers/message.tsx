import {
  DiscordAttachments,
  DiscordCommand,
  DiscordMessage as DiscordMessageComponent,
  DiscordReaction,
  DiscordReactions,
  DiscordThread,
  DiscordThreadMessage,
} from '@penwin/discord-components-react-render';
import type { ActionRow, Message as MessageType } from 'seyfert';
import React from 'react';
import type { RenderMessageContext } from '..';
import { parseDiscordEmoji } from '../../utils/utils';
import { Attachments } from './attachment';
import ComponentRow from './components';
import MessageContent, { RenderType } from './content';
import { DiscordEmbed } from './embed';
import MessageReply from './reply';
import DiscordSystemMessage from './systemMessage';
import type { APIMessageComponentEmoji } from 'seyfert/lib/types';
import { ChannelType } from 'seyfert/lib/types';

export default async function DiscordMessage({
  message,
  context,
}: {
  message: MessageType;
  context: RenderMessageContext;
}) {
  if ('system' in message) return <DiscordSystemMessage message={message} />;

  const isCrosspost = message.messageReference && message.messageReference.guildId !== message.guildId;
  const threadMessage =
    message.thread &&
      (message.thread.type === ChannelType.PublicThread || message.thread.type === ChannelType.PrivateThread)
      ? await message.client.messages.fetch(message.thread.lastMessageId!, message.thread.id).catch(() => null)
      : null;

  console.log(message)

  return (
    <DiscordMessageComponent
      id={`m-${message.id}`}
      timestamp={message.createdAt.toISOString()}
      key={message.id}
      edited={message.editedTimestamp !== null}
      server={isCrosspost ?? undefined}
      highlight={message.mentions.roles.includes('@everyone') || message.mentions.roles.includes('@here')}
      profile={message.author.id}
    >
      {/* reply */}
      <MessageReply message={message} context={context} />

      {/* slash command */}
      {message.interactionMetadata && (
        <DiscordCommand
          slot="reply"
          profile={message.interactionMetadata.user.id}
          //@ts-expect-error not implented yet
          command={'/' + message.interaction.name}
        />
      )}

      {/* message content */}
      {message.content && (
        <MessageContent
          content={message.content}
          context={{ ...context, type: message.webhookId ? RenderType.WEBHOOK : RenderType.NORMAL }}
        />
      )}

      {/* attachments */}
      <Attachments message={message} context={context} />

      {/* message embeds */}
      {message.embeds.map((embed, id) => (
        <DiscordEmbed embed={embed.toBuilder()} context={{ ...context, index: id, message }} key={id} />
      ))}

      {/* components */}
      {message.components.length > 0 && (
        <DiscordAttachments slot="components">
          {message.components.map((component, id) => (
            <ComponentRow key={id} id={id} row={component.toBuilder() as ActionRow} />
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
              message.thread.messageCount
                ? `${message.thread.messageCount} Message${message.thread.messageCount > 1 ? 's' : ''}`
                : 'View Thread'
            }
          >
            {message.thread.lastMessageId && threadMessage ? (
              <DiscordThreadMessage
                profile={
                  (await message.client.messages.fetch(message.thread.lastMessageId, message.thread.id)).author.id
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
