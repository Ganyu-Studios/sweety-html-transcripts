import type { APIGuild, APIRole, APIUser } from 'discord-api-types/v10';
import React from 'react';
import { prerenderToNodeStream } from 'react-dom/static';
import { devDependencies } from '../../package.json';
import type { Awaitable, TranscriptAdapter } from '../adapters/core';
import type { ResolveImageCallback } from '../downloader/images';
import { scrollToMessage } from '../static/client';
import { buildProfiles } from '../utils/profiles';
import type { AllAPIChannel, APIMessageData } from '../utils/channel';
import { channelUtils } from '../utils/channel';
import { guildUtils } from '../utils/guild';
import { streamToString, stringifyForScript } from '../utils/utils';
import DiscordMessages from './transcript';

const resolveVersion = (version: string) => version.replace('^', '').replace('~', '');
const discordComponentsVersion = resolveVersion(devDependencies['@penwin/discord-components-core']);

export type RenderMessageContext = {
  adapter: TranscriptAdapter<unknown>;
  messages: APIMessageData[];
  channel: AllAPIChannel;
  guild?: APIGuild | null;

  callbacks: {
    resolveImageSrc: ResolveImageCallback;
    resolveChannel: (channelId: string) => Awaitable<AllAPIChannel | null>;
    resolveUser: (userId: string) => Awaitable<APIUser | null>;
    resolveRole: (roleId: string) => Awaitable<APIRole | null>;
  };

  poweredBy?: boolean;
  footerText?: string;
  saveImages: boolean;
  favicon: 'guild' | string;
  /** @default false */
  lightTheme?: boolean;

  selectMenus?: {
    /** @default true */
    includeUsers?: boolean;
    /** @default true */
    includeRoles?: boolean;
    /** @default true */
    includeChannels?: boolean;
    /** @default 25 */
    channelLimits?: number;
  };
};

export default async function render(context: RenderMessageContext) {
  context.lightTheme ??= false;
  context.selectMenus ??= {};
  context.selectMenus.includeUsers ??= true;
  context.selectMenus.includeRoles ??= true;
  context.selectMenus.includeChannels ??= true;
  context.selectMenus.channelLimits ??= 25;

  const { adapter, channel, ...options } = context;

  const profiles = await buildProfiles(context);

  adapter.renderContext.profiles = profiles;

  // tysom sagiriikeda to fix this <3
  const stream = await prerenderToNodeStream(
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* favicon */}
        <link
          rel="icon"
          type="image/png"
          href={
            options.favicon === 'guild'
              ? channelUtils.isDM(channel) || channelUtils.isDirectory(channel)
                ? undefined
                : ((context.guild ? guildUtils.iconURL(context.guild, { size: 16, extension: 'png' }) : undefined) ??
                  undefined)
              : options.favicon
          }
        />

        {/* title */}
        <title>
          {channelUtils.isDM(channel) || channelUtils.isDirectory(channel) ? 'Direct Messages' : channel.name}
        </title>

        {/* message reference handler */}
        <script
          dangerouslySetInnerHTML={{
            __html: scrollToMessage,
          }}
        />

        {/* profiles */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.$discordMessage={profiles:${stringifyForScript(profiles)}}`,
          }}
        ></script>
        {/* component library */}
        <script
          type="module"
          src={`https://cdn.jsdelivr.net/npm/@penwin/discord-components-core@${discordComponentsVersion}/dist/bundle/index.mjs`}
        ></script>
        <link
          rel="stylesheet"
          href={`https://cdn.jsdelivr.net/npm/@penwin/discord-components-core@${discordComponentsVersion}/dist/bundle/styles/base.css`}
        />
      </head>

      <body
        style={{
          margin: 0,
          minHeight: '100vh',
        }}
      >
        <DiscordMessages context={context} />
      </body>
    </html>
  );

  return streamToString(stream.prelude);
}
