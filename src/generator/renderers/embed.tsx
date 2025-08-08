import {
  DiscordEmbed as DiscordEmbedComponent,
  DiscordEmbedDescription,
  DiscordEmbedField,
  DiscordEmbedFields,
  DiscordEmbedFooter,
} from '@penwin/discord-components-react-render';
import { APIEmbed } from 'discord-api-types/v10';
import React from 'react';
import type { RenderMessageContext } from '..';
import { APIMessageData } from '../../utils/channel';
import { calculateInlineIndex } from '../../utils/embeds';
import { convertToHEX } from '../../utils/utils';
import MessageContent, { RenderType } from './content';

type RenderEmbedContext = RenderMessageContext & {
  index: number;
  message: APIMessageData;
};

export async function DiscordEmbed({ embed, context }: { embed: APIEmbed; context: RenderEmbedContext }) {
  return (
    <DiscordEmbedComponent
      embedTitle={embed.title ?? undefined}
      slot="embeds"
      key={`${context.message.id}-e-${context.index}`}
      authorImage={embed.author?.proxy_icon_url ?? embed.author?.icon_url}
      authorName={embed.author?.name}
      authorUrl={embed.author?.url}
      color={embed.color ? convertToHEX(embed.color) : undefined}
      image={embed.image?.proxy_url ?? embed.image?.url}
      thumbnail={embed.thumbnail?.proxy_url ?? embed.thumbnail?.url}
      url={embed.url ?? undefined}
    >
      {/* Description */}
      {embed.description && (
        <DiscordEmbedDescription slot="description">
          <MessageContent content={embed.description} context={{ ...context, type: RenderType.EMBED }} />
        </DiscordEmbedDescription>
      )}

      {/* Fields */}
      {embed.fields && embed.fields.length > 0 && (
        <DiscordEmbedFields slot="fields">
          {embed.fields.map(async (field, id) => (
            <DiscordEmbedField
              key={`${context.message.id}-e-${context.index}-f-${id}`}
              fieldTitle={field.name}
              inline={field.inline}
              inlineIndex={calculateInlineIndex(embed.fields ?? [], id)}
            >
              <MessageContent content={field.value} context={{ ...context, type: RenderType.EMBED }} />
            </DiscordEmbedField>
          ))}
        </DiscordEmbedFields>
      )}

      {/* Footer */}
      {embed.footer && (
        <DiscordEmbedFooter
          slot="footer"
          footerImage={embed.footer.proxy_icon_url ?? embed.footer.icon_url}
          timestamp={embed.timestamp ?? undefined}
        >
          {embed.footer.text}
        </DiscordEmbedFooter>
      )}
    </DiscordEmbedComponent>
  );
}
