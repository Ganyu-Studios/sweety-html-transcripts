import type { APIMessageComponent, APIMessageTopLevelComponent } from 'discord-api-types/v10';
import { ButtonStyle, ComponentType } from 'discord-api-types/v10';
import type { Child } from '../jsx';
import { h } from '../jsx';
import { formatBytes } from '../../utils/files';
import { parseDiscordEmoji, toHex } from '../../utils/utils';
import { MediaGallery } from './attachments';
import { Content, ContentKind } from './content';
import type { RenderContext } from '../context';

const BUTTON_STYLES: Record<ButtonStyle, string> = {
  [ButtonStyle.Primary]: 'primary',
  [ButtonStyle.Secondary]: 'secondary',
  [ButtonStyle.Success]: 'success',
  [ButtonStyle.Danger]: 'destructive',
  [ButtonStyle.Link]: 'secondary',
  [ButtonStyle.Premium]: 'premium',
};

export function Components({
  ctx,
  components,
}: {
  ctx: RenderContext;
  components: (APIMessageTopLevelComponent | APIMessageComponent)[];
}): Child {
  if (components.length === 0) return null;

  return (
    <discord-attachments slot="components">
      <discord-components-column>
        {components.map((component) => (
          <Component ctx={ctx} component={component} />
        ))}
      </discord-components-column>
    </discord-attachments>
  );
}

function Component({
  ctx,
  component,
}: {
  ctx: RenderContext;
  component: APIMessageTopLevelComponent | APIMessageComponent;
}): Child {
  const children = (items: (APIMessageTopLevelComponent | APIMessageComponent)[]): Child =>
    items.map((item) => <Component ctx={ctx} component={item} />);

  switch (component.type) {
    case ComponentType.ActionRow:
      return <discord-action-row>{children(component.components)}</discord-action-row>;

    case ComponentType.Button:
      return (
        <discord-button
          type={'style' in component ? BUTTON_STYLES[component.style] : 'secondary'}
          url={'url' in component ? component.url : undefined}
          emoji={'emoji' in component && component.emoji ? parseDiscordEmoji(component.emoji) : undefined}
          emoji-name={'emoji' in component ? component.emoji?.name : undefined}
          disabled={component.disabled}
        >
          {'label' in component ? component.label : undefined}
        </discord-button>
      );

    case ComponentType.Container:
      return (
        <discord-container spoiler={component.spoiler} accent-color={toHex(component.accent_color)}>
          <discord-components-column>{children(component.components)}</discord-components-column>
        </discord-container>
      );

    case ComponentType.Section:
      return (
        <discord-section>
          <discord-section-components>{children(component.components)}</discord-section-components>
          <Component ctx={ctx} component={component.accessory} />
        </discord-section>
      );

    case ComponentType.TextDisplay:
      return (
        <discord-text-display>
          <Content ctx={ctx} content={component.content} kind={ContentKind.Embed} />
        </discord-text-display>
      );

    case ComponentType.Thumbnail:
      return (
        <discord-thumbnail
          media={ctx.media(component.media.url, component.media.proxy_url ?? component.media.url) ?? undefined}
          description={component.description ?? undefined}
          spoiler={component.spoiler}
        />
      );

    case ComponentType.Separator:
      return <discord-separator spacing={component.spacing} divider={component.divider ?? true} />;

    case ComponentType.File: {
      // The API resolves file components with name and size, which the types do not declare.
      const file = component as typeof component & { name?: string; size?: number };
      const { size, unit } = formatBytes(file.size ?? 0);

      return (
        <discord-file-attachment
          name={file.name ?? file.file.url.split('/').pop()?.split('?')[0]}
          bytes={size}
          bytes-unit={unit}
          href={file.file.proxy_url ?? file.file.url}
          spoiler={file.spoiler}
        />
      );
    }

    case ComponentType.MediaGallery:
      return (
        <MediaGallery
          items={component.items.flatMap((item) => {
            const media = ctx.media(item.media.url, item.media.proxy_url ?? item.media.url);
            return media === null
              ? []
              : [
                  {
                    media,
                    mimeType: item.media.content_type,
                    width: item.media.width,
                    height: item.media.height,
                    description: item.description,
                    spoiler: item.spoiler,
                  },
                ];
          })}
        />
      );

    case ComponentType.StringSelect:
      return (
        <discord-string-select-menu disabled={component.disabled} placeholder={component.placeholder}>
          {component.options.map((option) => (
            <discord-string-select-menu-option
              label={option.label}
              description={option.description}
              emoji={option.emoji ? parseDiscordEmoji(option.emoji) : undefined}
              emoji-name={option.emoji?.name}
            />
          ))}
        </discord-string-select-menu>
      );

    case ComponentType.UserSelect:
    case ComponentType.RoleSelect:
    case ComponentType.MentionableSelect:
    case ComponentType.ChannelSelect: {
      const type =
        component.type === ComponentType.UserSelect
          ? 'user'
          : component.type === ComponentType.RoleSelect
            ? 'role'
            : component.type === ComponentType.ChannelSelect
              ? 'channel'
              : 'mentionable';

      if (type === 'user' || type === 'mentionable') ctx.selectMenus.users = true;
      if (type === 'role' || type === 'mentionable') ctx.selectMenus.roles = true;
      if (type === 'channel') ctx.selectMenus.channels = true;

      const selected = component.default_values?.[0];

      return (
        <discord-select-menu-portal
          type={type}
          disabled={component.disabled}
          placeholder={component.placeholder}
          default-identifier={selected?.id}
          default-type={selected?.type}
        />
      );
    }

    default:
      return null;
  }
}
