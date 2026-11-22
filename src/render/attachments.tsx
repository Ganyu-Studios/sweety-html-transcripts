import type { APIAttachment, APIMessage, APIMessageSnapshotFields } from 'discord-api-types/v10';
import { AttachmentFlags, MessageFlags } from 'discord-api-types/v10';
import type { Child } from '../jsx';
import { h } from '../jsx';
import { attachmentKind, attachmentLanguage, formatBytes } from '../utils/files';
import { hasFlag } from '../utils/utils';
import type { RenderContext } from './context';

export interface GalleryItem {
  media: string;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  description?: string | null;
  spoiler?: boolean;
}

/**
 * A media gallery. `size` and each item's slot are written into the markup, so the layout is right
 * before (or without) the component counting its children in the browser.
 */
export function MediaGallery({ items, slot }: { items: GalleryItem[]; slot?: string }): Child {
  const shown = items.slice(0, 10);
  if (shown.length === 0) return null;

  return (
    <discord-media-gallery slot={slot} size={shown.length}>
      {shown.map((item, index) => (
        <discord-media-gallery-item
          slot={`media-${index + 1}`}
          media={item.media}
          mime-type={item.mimeType ?? undefined}
          width={item.width ?? undefined}
          height={item.height ?? undefined}
          description={item.description ?? undefined}
          spoiler={item.spoiler}
        />
      ))}
    </discord-media-gallery>
  );
}

export function Attachments({
  ctx,
  message,
}: {
  ctx: RenderContext;
  message: APIMessage | APIMessageSnapshotFields;
}): Child {
  if (message.attachments.length === 0) return null;

  const gallery: GalleryItem[] = [];
  const others: Child[] = [];
  const voice = hasFlag(message.flags, MessageFlags.IsVoiceMessage);

  for (const attachment of message.attachments) {
    const kind = attachmentKind(attachment);

    if (kind === 'image' || kind === 'video') {
      const media = ctx.media(attachment.url);
      if (media === null) continue;

      gallery.push({
        media,
        mimeType: attachment.content_type,
        width: attachment.width,
        height: attachment.height,
        description: attachment.description,
        spoiler: hasFlag(attachment.flags, AttachmentFlags.IsSpoiler) || attachment.filename.startsWith('SPOILER_'),
      });
    } else {
      others.push(<Attachment ctx={ctx} attachment={attachment} voice={voice} />);
    }
  }

  return (
    <discord-attachments slot="attachments">
      <MediaGallery items={gallery} />
      {others}
    </discord-attachments>
  );
}

function Attachment({ ctx, attachment, voice }: { ctx: RenderContext; attachment: APIAttachment; voice: boolean }) {
  if (voice) {
    return (
      <discord-voice-message href={attachment.url} waveform={attachment.waveform} duration={attachment.duration_secs} />
    );
  }

  const { size, unit } = formatBytes(attachment.size);

  if (attachmentKind(attachment) === 'audio') {
    return <discord-audio-attachment href={attachment.url} name={attachment.filename} bytes={size} bytes-unit={unit} />;
  }

  const preview = ctx.transcript.files[attachment.id];
  const language = attachmentLanguage(attachment);

  if (preview !== undefined && language) {
    return (
      <discord-text-file-attachment-previewer
        href={attachment.url}
        name={attachment.filename}
        language={language}
        bytes={size}
        bytes-unit={unit}
        content={preview}
      />
    );
  }

  return (
    <discord-file-attachment
      href={attachment.url}
      name={attachment.filename}
      bytes={size}
      bytes-unit={unit}
      type="file"
      spoiler={hasFlag(attachment.flags, AttachmentFlags.IsSpoiler)}
    />
  );
}
