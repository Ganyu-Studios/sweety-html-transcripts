import { DiscordTranscriptHeader, DiscordMessages as DiscordMessagesComponent } from '@penwin/discord-components-react-render';
import React from 'react';
import type { RenderMessageContext } from '.';
import MessageContent, { RenderType } from './renderers/content';
import DiscordMessage from './renderers/message';
import { ChannelType } from 'seyfert/lib/types';
import type { AllGuildTextableChannels } from 'seyfert';

/**
 * The core transcript component.
 * Expects window.$discordMessage.profiles to be set for profile information.
 *
 * @param props Messages, channel details, callbacks, etc.
 * @returns
 */
export default async function DiscordMessages({ messages, channel, callbacks, ...options }: RenderMessageContext) {
  return (
    <DiscordMessagesComponent style={{ minHeight: '100vh' }}>
      {/* header */}
      <DiscordTranscriptHeader
        guild={
          channel.isDM() || channel.isDirectory() ? 'Direct Messages' : (channel as AllGuildTextableChannels).guild.name
        }
        channel={
          channel.isDM()
            ? channel.type === ChannelType.DM
              ? (channel.recipients?.find((r) => r.id !== channel.id)?.username ?? 'Unknown Recipient')
              : 'Unknown Recipient'
            : channel.isDirectory()
              ? 'Unknown Directory'
              : (channel as AllGuildTextableChannels).name
        }
        icon={
          channel.isDM() || channel.isDirectory()
            ? undefined
            : ((await (channel as AllGuildTextableChannels).guild()).iconURL({ size: 128 }) ?? undefined)
        }
      >
        {channel.isThread() ? (
          `Thread channel in ${channel.parentId ?? 'Unknown Channel'}`
        ) : channel.isDM() ? (
          `Direct Messages`
        ) : channel.isVoice() ? (
          `Voice Text Channel for ${channel.name}`
        ) : channel.type === ChannelType.GuildCategory ? (
          `Category Channel`
        ) : 'topic' in channel && channel.topic ? (
          <MessageContent
            content={channel.topic}
            context={{ messages, channel, callbacks, type: RenderType.REPLY, ...options }}
          />
        ) : channel.isDirectory() ? (
          `This is the start of the directory.`
        ) : (
          `This is the start of #${(channel as AllGuildTextableChannels).name} channel.`
        )}
      </DiscordTranscriptHeader>

      {/* body */}
      {messages.map((message) => (
        <DiscordMessage message={message} context={{ messages, channel, callbacks, ...options }} key={message.id} />
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
            <a href="https://github.com/Ganyu-Studios/seyfert-html-transcripts" style={{ color: 'lightblue' }}>
              seyfert-html-transcripts
            </a>
            .
          </span>
        ) : null}
      </div>
    </DiscordMessagesComponent>
  );
}
