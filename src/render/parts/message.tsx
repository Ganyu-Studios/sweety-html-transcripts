import type { APIMessage, APIMessageSnapshotFields } from 'discord-api-types/v10';
import { ChannelType, InteractionType, MessageFlags, MessageReferenceType, MessageType } from 'discord-api-types/v10';
import { cdn } from '../../utils/cdn';
import { hasFlag } from '../../utils/utils';
import type { RenderContext } from '../context';
import type { Child } from '../jsx';
import { h } from '../jsx';
import { plural } from '../locales';
import { Attachments } from './attachments';
import { Components } from './components';
import { Content, ContentKind } from './content';
import { Embed } from './embed';
import { Reactions } from './reactions';
import { isSystemMessage, SystemMessage } from './system';

export function Message({ ctx, message }: { ctx: RenderContext; message: APIMessage }): Child {
  if (isSystemMessage(message)) return <SystemMessage ctx={ctx} message={message} />;

  // A thread's first message points at the message the thread was started from: show that one.
  if (message.type === MessageType.ThreadStarterMessage) {
    return message.referenced_message ? <Message ctx={ctx} message={message.referenced_message} /> : null;
  }

  const author = message.author;
  // Webhook messages carry their own name and avatar per message, so they are not shared profiles.
  const identity = message.webhook_id
    ? { author: author.username, avatar: ctx.avatar(author), bot: true }
    : { profile: ctx.profile(author.id) };

  const channel = ctx.transcript.channel;
  const isThread = channel.type === ChannelType.PublicThread || channel.type === ChannelType.PrivateThread;

  return (
    <discord-message
      id={`m-${message.id}`}
      {...identity}
      timestamp={message.timestamp}
      raw-timestamp={message.timestamp}
      edited={message.edited_timestamp !== null}
      highlight={message.mention_everyone}
      ephemeral={hasFlag(message.flags, MessageFlags.Ephemeral)}
      server={hasFlag(message.flags, MessageFlags.IsCrosspost)}
      op={isThread && channel.owner_id === author.id}
    >
      <Reply ctx={ctx} message={message} />
      <Command ctx={ctx} message={message} />
      <Body ctx={ctx} message={message} />
      {(message.message_snapshots ?? []).map((snapshot, index) => (
        <Forwarded ctx={ctx} message={message} snapshot={snapshot.message} index={index} />
      ))}
      <Reactions reactions={message.reactions} />
      <Thread ctx={ctx} message={message} />
    </discord-message>
  );
}

/** Content, attachments, embeds and components: the parts a forward copies. */
function Body({ ctx, message }: { ctx: RenderContext; message: APIMessage | APIMessageSnapshotFields }): Child {
  return [
    message.content ? <Content ctx={ctx} content={message.content} kind={ContentKind.Normal} /> : null,
    <Attachments ctx={ctx} message={message} />,
    message.embeds.map((embed) => <Embed ctx={ctx} embed={embed} />),
    <Components ctx={ctx} components={message.components ?? []} />,
  ];
}

function Reply({ ctx, message }: { ctx: RenderContext; message: APIMessage }): Child {
  if (message.type !== MessageType.Reply) return null;

  const referenced = message.referenced_message;
  if (!referenced) {
    return (
      <discord-reply slot="reply" deleted>
        <em>{ctx.locale.reply.notLoaded}</em>
      </discord-reply>
    );
  }

  const isCommand = Boolean(referenced.interaction_metadata);
  const channel = ctx.transcript.channel;

  return (
    <discord-reply
      slot="reply"
      profile={referenced.webhook_id ? undefined : ctx.profile(referenced.author.id)}
      author={referenced.webhook_id ? referenced.author.username : undefined}
      avatar={referenced.webhook_id ? ctx.avatar(referenced.author, 32) : undefined}
      edited={!isCommand && referenced.edited_timestamp !== null}
      attachment={referenced.attachments.length > 0}
      command={isCommand}
      mentions={message.mentions.some((user) => user.id === referenced.author.id)}
      op={channel.owner_id === referenced.author.id}
    >
      <span data-goto={referenced.id}>
        {referenced.content ? (
          <Content ctx={ctx} content={referenced.content} kind={ContentKind.Reply} />
        ) : (
          <em>{isCommand ? ctx.locale.reply.command : ctx.locale.reply.attachment}</em>
        )}
      </span>
    </discord-reply>
  );
}

function Command({ ctx, message }: { ctx: RenderContext; message: APIMessage }): Child {
  const metadata = message.interaction_metadata;
  if (metadata?.type !== InteractionType.ApplicationCommand) return null;

  const name = (metadata as { name?: string }).name ?? message.interaction?.name;

  return (
    <discord-command slot="reply" profile={ctx.profile(metadata.user.id)} command={name ? `/${name}` : undefined} />
  );
}

function Forwarded({
  ctx,
  message,
  snapshot,
  index,
}: {
  ctx: RenderContext;
  message: APIMessage;
  snapshot: APIMessageSnapshotFields;
  index: number;
}): Child {
  const reference = message.message_reference;
  const guildId = reference?.type === MessageReferenceType.Forward ? reference.guild_id : undefined;
  const guild = guildId ? (guildId === ctx.guildId ? ctx.transcript.guild : ctx.transcript.guilds[guildId]) : null;
  const channel = reference ? ctx.transcript.channels[reference.channel_id] : undefined;

  return (
    <discord-forwarded-message
      guild-icon={guild?.icon ? cdn.guildIcon(guild.id, guild.icon, { size: 32, extension: 'png' }) : undefined}
      channel-name={channel?.name ?? undefined}
      timestamp={snapshot.timestamp}
      is-same-guild={guildId === ctx.guildId}
    >
      <discord-message id={`m-${message.id}-f${index}`} timestamp={snapshot.timestamp} message-body-only>
        <Body ctx={ctx} message={snapshot} />
      </discord-message>
    </discord-forwarded-message>
  );
}

function Thread({ ctx, message }: { ctx: RenderContext; message: APIMessage }): Child {
  const thread = message.thread;
  if (!thread || (thread.type !== ChannelType.PublicThread && thread.type !== ChannelType.PrivateThread)) return null;

  const last = ctx.transcript.threads[thread.id];
  const count = 'message_count' in thread ? thread.message_count : undefined;

  return (
    <discord-thread
      slot="thread"
      name={thread.name ?? undefined}
      cta={count ? plural(ctx.locale.thread.messages, count) : ctx.locale.thread.view}
    >
      {last ? (
        <discord-thread-message profile={ctx.profile(last.author.id)}>
          <Content ctx={ctx} content={last.content} kind={ContentKind.Reply} />
        </discord-thread-message>
      ) : (
        ctx.locale.thread.notSaved
      )}
    </discord-thread>
  );
}
