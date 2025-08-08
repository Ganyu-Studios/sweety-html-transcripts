import { DiscordActionRow, DiscordButton } from '@penwin/discord-components-react-render';
import React from 'react';
import { APIMessageComponent } from 'discord-api-types/v10';
import { ButtonStyle, ComponentType } from 'seyfert/lib/types';
import { parseDiscordEmoji } from '../../utils/utils';

const ButtonStyleMapping = {
  [ButtonStyle.Primary]: 'primary',
  [ButtonStyle.Secondary]: 'secondary',
  [ButtonStyle.Success]: 'success',
  [ButtonStyle.Danger]: 'destructive',
  [ButtonStyle.Link]: 'secondary',
  [ButtonStyle.Premium]: 'primary',
} as const;

export function Component({ component, id }: { component: APIMessageComponent; id: number }) {

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
            <Component component={component as never} id={id} key={id} />
          ))}
        </DiscordActionRow>
      )
    }
  };

  return undefined;
}
