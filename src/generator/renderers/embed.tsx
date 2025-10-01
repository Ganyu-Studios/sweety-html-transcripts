import {
  DiscordEmbed as DiscordEmbedComponent,
  DiscordEmbedDescription,
  DiscordEmbedField,
  DiscordEmbedFields,
  DiscordEmbedFooter,
  DiscordMediaGallery,
  DiscordMediaGalleryItem,
} from '@penwin/discord-components-react-render';
import type { APIEmbed, APIMessageSnapshot } from 'discord-api-types/v10';
import { EmbedType } from 'discord-api-types/v10';
import React from 'react';
import type { RenderMessageContext } from '..';
import type { APIMessageData } from '../../utils/channel';
import { calculateInlineIndex } from '../../utils/embeds';
import { convertToHEX } from '../../utils/utils';
import MessageContent, { RenderType } from './content';

type RenderEmbedContext = RenderMessageContext & {
  index: number;
  message: APIMessageData | (APIMessageSnapshot['message'] & { id?: string });
};

interface EmbeddedMediaData {
  url: string;
  proxy_url?: string;
  height?: number;
  width?: number;
  content_type?: string;
}

export async function DiscordEmbed({ embed, context }: { embed: APIEmbed; context: RenderEmbedContext }) {
  if (embed.type === EmbedType.Image || embed.type === EmbedType.Video || embed.type === EmbedType.GIFV) {
    const data = embed.thumbnail as EmbeddedMediaData;

    return (
      <DiscordMediaGallery slot="embeds">
        <DiscordMediaGalleryItem
          media={data.proxy_url ?? data.url}
          mime-type={data.content_type}
          width={data.width}
          height={data.height}
        />
      </DiscordMediaGallery>
    );
  }

  const key = context.message.id ? `${context.message.id}-e-${context.index}` : void 0;

  return (
    <DiscordEmbedComponent
      embedTitle={embed.title ?? undefined}
      slot="embeds"
      key={key}
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
