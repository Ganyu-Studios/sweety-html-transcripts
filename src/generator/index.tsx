import { renderToString } from '@derockdev/discord-components-core/hydrate';
import type { APIGuild, APIRole, APIUser } from 'discord-api-types/v10';
import React from 'react';
import { prerenderToNodeStream } from 'react-dom/static';
import type { Awaitable } from 'seyfert/lib/common';
import { devDependencies } from '../../package.json';
import type { TranscriptAdapter } from '../adapters/core';
import type { ResolveImageCallback } from '../downloader/images';
import { revealSpoiler, scrollToMessage } from '../static/client';
import { buildProfiles } from '../utils/buildProfiles';
import type { AllAPIChannel, APIMessageData } from '../utils/channel';
import { channelUtils } from '../utils/channel';
import { guildUtils } from '../utils/guild';
import { streamToString } from '../utils/utils';
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
  hydrate: boolean;
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

  // NOTE: this renders a STATIC site with no interactivity
  // if interactivity is needed, switch to renderToPipeableStream and use hydrateRoot on client.
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

        <link
          rel="stylesheet"
          href={`https://cdn.jsdelivr.net/npm/@penwin/discord-components-core@${discordComponentsVersion}/dist/bundle/styles/base.css`}
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

        {!options.hydrate && (
          <>
            {/* profiles */}
            <script
              dangerouslySetInnerHTML={{
                __html: `window.$discordMessage={profiles:${JSON.stringify(profiles)}}`,
              }}
            ></script>
            {/* component library */}
            <script
              type="module"
              src={`https://cdn.jsdelivr.net/npm/@penwin/discord-components-core@${discordComponentsVersion}/dist/bundle/index.mjs`}
            ></script>
          </>
        )}
      </head>

      <body
        style={{
          margin: 0,
          minHeight: '100vh',
        }}
      >
        <DiscordMessages context={context} />
      </body>

      {/* Make sure the script runs after the DOM has loaded */}
      {options.hydrate && <script dangerouslySetInnerHTML={{ __html: revealSpoiler }}></script>}
    </html>
  );

  const markup = await streamToString(stream.prelude);

  if (options.hydrate) {
    const result = await renderToString(markup, {
      beforeHydrate: async (document) => {
        document.defaultView.$discordMessage = {
          profiles,
        };
        document.defaultView.$discordSelectMenu = {
          users: !adapter.renderContext.selectMenu.users?.injectedScript
            ? (adapter.renderContext.selectMenu.users?.data ?? [])
            : [],
          roles: !adapter.renderContext.selectMenu.roles?.injectedScript
            ? (adapter.renderContext.selectMenu.roles?.data ?? [])
            : [],
          channels: !adapter.renderContext.selectMenu.channels?.injectedScript
            ? (adapter.renderContext.selectMenu.channels?.data ?? [])
            : [],
        };
      },
    });

    return result.html;
  }

  return markup;
}
