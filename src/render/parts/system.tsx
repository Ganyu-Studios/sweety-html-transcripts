import type { APIMessage, APIUser } from 'discord-api-types/v10';
import { MessageType } from 'discord-api-types/v10';
import type { RenderContext } from '../context';
import type { Child } from '../jsx';
import { h } from '../jsx';
import { fill } from '../locales';
import { Reactions } from './reactions';

const SYSTEM_TYPES = new Set<MessageType>([
  MessageType.RecipientAdd,
  MessageType.UserJoin,
  MessageType.ChannelNameChange,
  MessageType.ChannelPinnedMessage,
  MessageType.GuildBoost,
  MessageType.GuildBoostTier1,
  MessageType.GuildBoostTier2,
  MessageType.GuildBoostTier3,
  MessageType.ThreadCreated,
]);

/** Joins, pins, boosts, thread and rename notices: one line instead of a full message. */
export const isSystemMessage = (message: APIMessage): boolean => SYSTEM_TYPES.has(message.type);

export function SystemMessage({ ctx, message }: { ctx: RenderContext; message: APIMessage }): Child {
  const user = <Highlight ctx={ctx} user={message.author} />;
  const { system } = ctx.locale;

  const wrap = (type: string, body: Child): Child => (
    <discord-system-message id={`m-${message.id}`} type={type} timestamp={message.timestamp}>
      {body}
      <Reactions reactions={message.reactions} />
    </discord-system-message>
  );

  switch (message.type) {
    case MessageType.RecipientAdd:
    case MessageType.UserJoin: {
      // Picked from the id so the same message always reads the same.
      const template = system.join[Number(BigInt(message.id) % BigInt(system.join.length))]!;
      return wrap('join', fill(template, { user }));
    }

    case MessageType.ChannelPinnedMessage:
      return wrap(
        'pin',
        fill(system.pinned, {
          user,
          message: <i data-goto={message.message_reference?.message_id}>{system.pinnedMessage}</i>,
        })
      );

    case MessageType.GuildBoost:
    case MessageType.GuildBoostTier1:
    case MessageType.GuildBoostTier2:
    case MessageType.GuildBoostTier3:
      return wrap('boost', fill(system.boost, { user }));

    case MessageType.ThreadCreated:
      return wrap(
        'thread',
        fill(system.threadStarted, {
          user,
          name: <i data-goto={message.message_reference?.message_id}>{message.content}</i>,
        })
      );

    case MessageType.ChannelNameChange:
      return wrap('edit', fill(system.channelName, { user, name: <b>{message.content}</b> }));

    default:
      return null;
  }
}

function Highlight({ ctx, user }: { ctx: RenderContext; user: APIUser }): Child {
  return <i style={{ color: ctx.roleColor(user.id) ?? 'inherit', fontWeight: 500 }}>{ctx.displayName(user)}</i>;
}
