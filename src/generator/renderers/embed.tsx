import {
  DiscordEmbed as DiscordEmbedComponent,
  DiscordEmbedDescription,
  DiscordEmbedField,
  DiscordEmbedFields,
  DiscordEmbedFooter,
} from '@penwin/discord-components-react-render';
import React from 'react';
import type { RenderMessageContext } from '..';
import { calculateInlineIndex } from '../../utils/embeds';
import MessageContent, { RenderType } from './content';
import type { Embed, Message } from 'seyfert';
import { convertToHEX } from '../../utils/utils';

type RenderEmbedContext = RenderMessageContext & {
  index: number;
  message: Message;
};

export async function DiscordEmbed({ embed, context }: { embed: Embed; context: RenderEmbedContext }) {
  return (
    <DiscordEmbedComponent
      embedTitle={embed.data.title ?? undefined}
      slot="embeds"
      key={`${context.message.id}-e-${context.index}`}
      authorImage={embed.data.author?.proxy_icon_url ?? embed.data.author?.icon_url}
      authorName={embed.data.author?.name}
      authorUrl={embed.data.author?.url}
      color={embed.data.color ? convertToHEX(embed.data.color) : undefined}
      image={embed.data.image?.proxy_url ?? embed.data.image?.url}
      thumbnail={embed.data.thumbnail?.proxy_url ?? embed.data.thumbnail?.url}
      url={embed.data.url ?? undefined}
    >
      {/* Description */}
      {embed.data.description && (
        <DiscordEmbedDescription slot="description">
          <MessageContent content={embed.data.description} context={{ ...context, type: RenderType.EMBED }} />
        </DiscordEmbedDescription>
      )}

      {/* Fields */}
      {embed.data.fields && embed.data.fields.length > 0 && (
        <DiscordEmbedFields slot="fields">
          {embed.data.fields.map(async (field, id) => (
            <DiscordEmbedField
              key={`${context.message.id}-e-${context.index}-f-${id}`}
              fieldTitle={field.name}
              inline={field.inline}
              inlineIndex={calculateInlineIndex(embed.data.fields ?? [], id)}
            >
              <MessageContent content={field.value} context={{ ...context, type: RenderType.EMBED }} />
            </DiscordEmbedField>
          ))}
        </DiscordEmbedFields>
      )}

      {/* Footer */}
      {embed.data.footer && (
        <DiscordEmbedFooter
          slot="footer"
          footerImage={embed.data.footer.proxy_icon_url ?? embed.data.footer.icon_url}
          timestamp={embed.data.timestamp ?? undefined}
        >
          {embed.data.footer.text}
        </DiscordEmbedFooter>
      )}
    </DiscordEmbedComponent>
  );
}
