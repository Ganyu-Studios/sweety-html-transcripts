import {
  DiscordTranscriptHeader,
  DiscordMessages as DiscordMessagesComponent,
} from '@penwin/discord-components-react-render';
import React from 'react';
import type { RenderMessageContext } from '.';
import MessageContent, { RenderType } from './renderers/content';
import DiscordMessage from './renderers/message';
import { ChannelType } from 'seyfert/lib/types';
import type { AllGuildTextableChannels } from 'seyfert';
import { channelUtils } from '../utils/channel';
import { guildUtils } from '../utils/guild';
import { name as packageName, repository } from '../../package.json';

const github = repository?.url?.split(/\+|\.git/)?.[1].trim() ?? repository.url;

/**
 * The core transcript component.
 * Expects window.$discordMessage.profiles to be set for profile information.
 *
 * @param props Messages, channel details, callbacks, etc.
 * @returns
 */
export default async function DiscordMessages({ context }: { context: RenderMessageContext }) {
  const { messages, channel, guild, ...options } = context;

  return (
    <DiscordMessagesComponent style={{ minHeight: '100vh' }}>
      {/* header */}
      <DiscordTranscriptHeader
        guild={
          // channel.isDM() || channel.isDirectory() ? 'Direct Messages' : (channel as AllGuildTextableChannels).guild.name
          // (channelUtils.isDM(channel) || channelUtils.isDirectory(channel)) ? 'Direct Messages' : channel.guild
          guild?.name ?? 'Direct Messages'
        }
        channel={
          channelUtils.isDM(channel)
            ? channel.type === ChannelType.DM
              ? (channel.recipients?.find((r) => r.id !== channel.id)?.username ?? 'Unknown Recipient')
              : 'Unknown Recipient'
            : channelUtils.isDirectory(channel)
              ? 'Unknown Directory'
              : (channel as AllGuildTextableChannels).name
        }
        icon={
          channelUtils.isDM(channel) || channelUtils.isDirectory(channel)
            ? undefined
            : ((context.guild ? guildUtils.iconURL(context.guild, { size: 128 }) : undefined) ?? undefined)
        }
      >
        {channelUtils.isThread(channel) ? (
          `Thread channel in ${channel.parent_id ?? 'Unknown Channel'}`
        ) : channelUtils.isDM(channel) ? (
          `Direct Messages`
        ) : channelUtils.isVoice(channel) ? (
          `Voice Text Channel for ${channel.name}`
        ) : channel.type === ChannelType.GuildCategory ? (
          `Category Channel`
        ) : 'topic' in channel && channel.topic ? (
          <MessageContent content={channel.topic} context={{ type: RenderType.REPLY, ...context }} />
        ) : channelUtils.isDirectory(channel) ? (
          `This is the start of the directory.`
        ) : (
          `This is the start of #${channel.name} channel.`
        )}
      </DiscordTranscriptHeader>

      {/* body */}
      {messages.map((message) => (
        <DiscordMessage message={message} context={context} key={message.id} />
      ))}

      {/* footer */}
      <div style={{ textAlign: 'center', width: '100%' }}>
        {options.footerText
          ? options.footerText
              .replaceAll('{number}', messages.length.toString())
              .replaceAll('{s}', messages.length > 1 ? 's' : '')
          : `Exported ${messages.length} message${messages.length > 1 ? 's' : ''}.`}{' '}
        {options.poweredBy ? (
          <span style={{ textAlign: 'center' }}>
            Powered by{' '}
            <a href={github} style={{ color: 'lightblue' }}>
              {packageName}
            </a>
            .
          </span>
        ) : null}
      </div>
    </DiscordMessagesComponent>
  );
}
