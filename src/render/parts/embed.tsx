import type { APIEmbed } from 'discord-api-types/v10';
import { EmbedType } from 'discord-api-types/v10';
import type { Child } from '../jsx';
import { h } from '../jsx';
import { calculateInlineIndex } from '../../utils/embeds';
import { toHex } from '../../utils/utils';
import { MediaGallery } from './attachments';
import { Content, ContentKind } from './content';
import type { RenderContext } from '../context';

export function Embed({ ctx, embed }: { ctx: RenderContext; embed: APIEmbed }): Child {
  // Image, video and gifv embeds are link unfurls Discord draws as bare media.
  if (embed.type === EmbedType.Image || embed.type === EmbedType.Video || embed.type === EmbedType.GIFV) {
    const media = embed.video ?? embed.thumbnail ?? embed.image;
    const source = media?.proxy_url ?? media?.url;
    if (!media || !source) return null;

    return (
      <MediaGallery
        slot="embeds"
        items={[
          {
            media: source,
            mimeType: embed.type === EmbedType.Image ? undefined : 'video/mp4',
            width: media.width,
            height: media.height,
          },
        ]}
      />
    );
  }

  const isArticle = embed.type === EmbedType.Article;
  const thumbnail = embed.thumbnail?.proxy_url ?? embed.thumbnail?.url;

  return (
    <discord-embed
      slot="embeds"
      embed-title={embed.title}
      url={embed.url}
      color={toHex(embed.color)}
      author-name={embed.author?.name}
      author-image={embed.author?.proxy_icon_url ?? embed.author?.icon_url}
      author-url={embed.author?.url}
      image={embed.image?.proxy_url ?? embed.image?.url ?? (isArticle ? thumbnail : undefined)}
      thumbnail={isArticle ? undefined : thumbnail}
      provider={embed.provider?.name}
    >
      {embed.description && (
        <discord-embed-description slot="description">
          <Content ctx={ctx} content={embed.description} kind={ContentKind.Embed} />
        </discord-embed-description>
      )}

      {embed.fields && embed.fields.length > 0 && (
        <discord-embed-fields slot="fields">
          {embed.fields.map((field, index) => (
            <discord-embed-field
              field-title={field.name}
              inline={field.inline}
              inline-index={field.inline ? calculateInlineIndex(embed.fields!, index) : undefined}
            >
              <span slot="field-title">
                <Content ctx={ctx} content={field.name} kind={ContentKind.Embed} />
              </span>
              <Content ctx={ctx} content={field.value} kind={ContentKind.Embed} />
            </discord-embed-field>
          ))}
        </discord-embed-fields>
      )}

      {embed.footer && (
        <discord-embed-footer
          slot="footer"
          footer-image={embed.footer.proxy_icon_url ?? embed.footer.icon_url}
          timestamp={embed.timestamp}
        >
          {embed.footer.text}
        </discord-embed-footer>
      )}
    </discord-embed>
  );
}
