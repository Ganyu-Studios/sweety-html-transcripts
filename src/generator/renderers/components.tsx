import { DiscordActionRow, DiscordButton, DiscordContainer, DiscordComponentsColumn, DiscordSection, DiscordSectionComponents, DiscordTextDisplay, DiscordSeparator, DiscordThumbnail, DiscordFileAttachment, DiscordMediaGallery, DiscordMediaGalleryItem, DiscordStringSelectMenu, DiscordStringSelectMenuOption, DiscordSelectMenuPortal } from '@penwin/discord-components-react-render';
import React, { ReactElement } from 'react';
import { APIFileComponent, APIMessageComponent, ButtonStyle, ComponentType } from 'discord-api-types/v10';
import { convertToHEX, formatBytes, parseDiscordEmoji } from '../../utils/utils';
import MessageContent, { RenderType } from './content';
import { RenderMessageContext } from '..';
import { ChannelSelectMenuOptionData, RoleSelectMenuOptionData, UserSelectMenuOptionData } from '@penwin/discord-components-core';
import { guildUtils } from '../../utils/guild';

const selectMenuScriptHeader = `(window.$discordSelectMenu ??= {})`;

const ButtonStyleMapping = {
  [ButtonStyle.Primary]: 'primary',
  [ButtonStyle.Secondary]: 'secondary',
  [ButtonStyle.Success]: 'success',
  [ButtonStyle.Danger]: 'destructive',
  [ButtonStyle.Link]: 'secondary',
  [ButtonStyle.Premium]: 'premium',
} as const;

export async function Component({ component, id, context }: { component: APIMessageComponent; id: number, context: RenderMessageContext }) {

  switch (component.type) {
    case ComponentType.Button:

      return (
        <DiscordButton
          key={id}
          type={'style' in component ? ButtonStyleMapping[component.style] : 'secondary'}
          url={'url' in component ? component.url : undefined}
          emoji={'emoji' in component ? parseDiscordEmoji(component.emoji!) : undefined}
        >
          {'label' in component ? component.label : undefined}
        </DiscordButton>
      );
    case ComponentType.ActionRow: {
      return (
        <DiscordActionRow key={id}>
          {component.components.map((component, id) => (
            <Component component={component} id={id} key={id} context={context} />
          ))}
        </DiscordActionRow>
      )
    }

    case ComponentType.Container: {
      return (
        <DiscordContainer key={id} spoiler={component.spoiler}>
          <DiscordComponentsColumn>
            {component.components.map((component, id) => (
              <Component component={component} id={id} key={id} context={context} />
            ))}
          </DiscordComponentsColumn>
        </DiscordContainer>
      )
    }
    case ComponentType.Thumbnail: {
      return (
        <DiscordThumbnail
          key={id}
          media={component.media.proxy_url ?? component.media.url}
          spoiler={component.spoiler}
        />
      )
    }
    case ComponentType.Section: {
      return (
        <DiscordSection key={id}>
          <DiscordSectionComponents>
            {component.components.map((component, id) => (
              <Component component={component} id={id} key={id} context={context} />
            ))}
          </DiscordSectionComponents>
          <Component component={component.accessory} id={id} key={id} context={context} />
        </DiscordSection>
      )
    }

    case ComponentType.TextDisplay: {
      return (
        <DiscordTextDisplay key={id}>
          <MessageContent content={component.content} context={{ ...context, type: RenderType.EMBED }} />
        </DiscordTextDisplay>
      )
    }

    case ComponentType.Separator: {
      return <DiscordSeparator key={id} spacing={component.spacing} divider={component.divider} />
    }

    case ComponentType.File: {

      interface ResolvedFileComponent extends APIFileComponent {
        name: string;
        size: number;
      }

      const resolvedFileComponent = component as ResolvedFileComponent;

      const { size, unit } = formatBytes(resolvedFileComponent.size);

      return <DiscordFileAttachment
        key={id}
        name={resolvedFileComponent.name}
        bytes={size}
        bytes-unit={unit}
        href={component.file.proxy_url ?? component.file.url}
        spoiler={component.spoiler}
      />
    }
    case ComponentType.MediaGallery: {
      return (
        <DiscordMediaGallery key={id}>
          {component.items.map((item, id) => (
            <DiscordMediaGalleryItem
              key={`${id}-${component.id}`}
              media={item.media.proxy_url ?? item.media.url}
              mime-type={item.media.content_type}
              spoiler={item.spoiler}
              description={item.description ?? void 0}
              width={item.media.width ?? void 0}
              height={item.media.height ?? void 0}
            />
          ))}
        </DiscordMediaGallery>
      )
    }

    case ComponentType.StringSelect:
    case ComponentType.SelectMenu: {
      return (
        <DiscordStringSelectMenu>
          {component.options.map((option, id) => (
            <DiscordStringSelectMenuOption
              key={id}
              label={option.label}
              description={option.description}
              emojiName={option.emoji?.name}
              emoji={option.emoji && parseDiscordEmoji(option.emoji)}
            />
          ))}
        </DiscordStringSelectMenu>
      )
    }

    case ComponentType.ChannelSelect:
    case ComponentType.RoleSelect:
    case ComponentType.MentionableSelect:
    case ComponentType.UserSelect: {

      const isMentionable = component.type === ComponentType.MentionableSelect;
      const isUser = component.type === ComponentType.UserSelect;
      const isRole = component.type === ComponentType.RoleSelect;
      const isChannel = component.type === ComponentType.ChannelSelect;

      const containsUsers = (isMentionable || isUser) && context.selectMenus?.includeUsers;
      const containsRoles = isRole && context.selectMenus?.includeRoles;
      const containsChannels = isChannel && context.selectMenus?.includeChannels;

      const scripts: ReactElement[] = [];

      if (containsUsers && !context.adapter.renderContext.selectMenu.users) {
        context.adapter.renderContext.selectMenu.users = {
          data: Object.entries(context.adapter.renderContext.profiles).map(([id, profile]) => ({
            identifier: id,
            discriminator: profile.discriminator,
            avatarUrl: profile.avatar!,
            username: profile.author,
            globalName: profile.displayName ?? profile.globalName,
            bot: profile.bot,
            verified: profile.verified,
          }) as UserSelectMenuOptionData),
          injectedScript: !context.hydrate
        };

        !context.hydrate && scripts.push(
          <script
            key={"users-script"}
            dangerouslySetInnerHTML={{
              __html: `${selectMenuScriptHeader}.users = ${JSON.stringify(context.adapter.renderContext.selectMenu.users.data)}`,
            }} />
        )
      }

      if (containsRoles && !context.adapter.renderContext.selectMenu.roles && context.guild?.id) {
        const data: RoleSelectMenuOptionData[] = [];

        const roles = await context.adapter.resolveGuildRoles(context.guild?.id);

        for (const role of roles) {
          data.push(({
            identifier: role.id,
            name: role.name,
            color: convertToHEX(role.color),
            iconUrl: (role.icon && guildUtils.roleIcon(role.id, role.icon)) ?? void 0,
            memberCount: 0,
            showMemberCount: false,
          } satisfies RoleSelectMenuOptionData))
        }

        context.adapter.renderContext.selectMenu.roles = {
          data,
          injectedScript: !context.hydrate,
        };

        !context.hydrate && scripts.push(
          <script
            key={"roles-script"}
            dangerouslySetInnerHTML={{
              __html: `${selectMenuScriptHeader}.roles = ${JSON.stringify(context.adapter.renderContext.selectMenu.roles.data)}`,
            }} />
        )
      }

      if (containsChannels && !context.adapter.renderContext.selectMenu.channels && context.guild?.id) {

        const data: ChannelSelectMenuOptionData[] = [];

        const channels = await context.adapter.resolveGuildChannels(context.guild?.id);

        for (const channel of channels) {
          if (data.length >= (context.selectMenus?.channelLimits ?? 25)) break;
          if ("name" in channel && channel.name) {
            data.push({
              identifier: channel.id,
              name: channel.name,
              type: channel.type,
            } satisfies ChannelSelectMenuOptionData);
          }
        }

        context.adapter.renderContext.selectMenu.channels = {
          data,
          injectedScript: !context.hydrate
        };

        !context.hydrate && scripts.push(
          <script key={"channels-script"} dangerouslySetInnerHTML={{
            __html: `${selectMenuScriptHeader}.channels = ${JSON.stringify(context.adapter.renderContext.selectMenu.channels.data)}`,
          }} />
        )
      }

      return <>
        {scripts}
        <DiscordSelectMenuPortal
          key={id}
          type={isMentionable ? 'mentionable' : isUser ? 'user' : isRole ? 'role' : 'channel'}
          defaultIdentifier={component.default_values?.[0].id}
          defaultType={component.default_values?.[0].type}
        />
      </>
    }
  };
}
