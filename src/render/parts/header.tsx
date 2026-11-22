import { ChannelType } from 'discord-api-types/v10';
import { cdn } from '../../utils/cdn';
import { isDM, isThread, isVoice } from '../../utils/channels';
import type { RenderContext } from '../context';
import type { Child } from '../jsx';
import { h } from '../jsx';
import { Content, ContentKind } from './content';

/** The banner at the top: guild icon and name, channel name, and what the channel is. */
export function Header({ ctx }: { ctx: RenderContext }): Child {
  const { channel, guild } = ctx.transcript;
  const { header } = ctx.locale;
  const dm = isDM(channel.type);

  const recipient = channel.recipients?.[0];
  const name = dm
    ? recipient
      ? ctx.displayName(recipient)
      : ctx.locale.unknownRecipient
    : (channel.name ?? channel.id);

  let description: Child;
  if (dm) description = header.directMessages;
  else if (isThread(channel.type)) description = header.thread.replace('{name}', name);
  else if (isVoice(channel.type)) description = header.voice.replace('{name}', name);
  else if (channel.type === ChannelType.GuildCategory) description = header.category;
  else if (channel.topic) description = <Content ctx={ctx} content={channel.topic} kind={ContentKind.Reply} />;
  else description = header.channel.replace('{name}', name);

  return (
    <discord-transcript-header
      guild={guild?.name ?? ctx.locale.directMessages}
      channel={name}
      icon={guild?.icon ? cdn.guildIcon(guild.id, guild.icon, { size: 128 }) : undefined}
    >
      {description}
    </discord-transcript-header>
  );
}
