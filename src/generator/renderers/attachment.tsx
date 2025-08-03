import { DiscordFileAttachment, DiscordAttachments, DiscordTextFileAttachmentPreviewer, DiscordMediaGallery, DiscordMediaGalleryItem } from '@penwin/discord-components-react-render';
import React from 'react';
import type { Attachment as AttachmentType, Message } from 'seyfert';
import type { RenderMessageContext } from '..';
import type { AttachmentTypes } from '../../types';
import { formatBytes } from '../../utils/utils';
import type { APIAttachment, APIMessage } from 'seyfert/lib/types';
import { ReplaceRegex, toSnakeCase } from 'seyfert/lib/common';

// "audio" | "video" | "image" | "file"
function getAttachmentType(attachment: Pick<AttachmentType, 'contentType'>): AttachmentTypes {
  const type = attachment.contentType?.split('/')?.[0] ?? 'unknown';
  if (['audio', 'video', 'image'].includes(type)) return type as AttachmentTypes;
  return 'file';
}


/**
 * Renders all attachments for a message
 * @param message
 * @param context
 * @returns
 */
export async function Attachments(props: { message: Message; context: RenderMessageContext }) {
  if (props.message.attachments.length === 0) return <></>;

  const grouped = { mediaGallery: [] as typeof props.message.attachments, other: [] as typeof props.message.attachments };

  for (const attachment of props.message.attachments) {
    const type = getAttachmentType(attachment);
    if (type === 'image' || type === 'video' || type === 'audio') {
      grouped.mediaGallery.push(attachment);
    } else {
      grouped.other.push(attachment);
    }
  }


  return (
    <DiscordAttachments slot="attachments">
      {
        grouped.mediaGallery.length > 0 &&
        <DiscordMediaGallery>
          {grouped.mediaGallery.map((attachment, id) => (
            <Attachment attachment={attachment as never} message={props.message} context={props.context} key={id} />
          ))}
        </DiscordMediaGallery>
      }
      {grouped.other.map((attachment, id) => (
        <Attachment attachment={attachment as never} message={props.message} context={props.context} key={id} />
      ))}
    </DiscordAttachments>
  );
}

const programmingLanguageMimeMap = new Map([
  ['text/html', 'html'],
  ['text/css', 'css'],
  ['text/javascript', 'javascript'],
  ['application/javascript', 'javascript'],
  ['application/json', 'json'],
  ['application/xml', 'xml'],
  ['image/svg+xml', 'svg'],
  ['application/xhtml+xml', 'xhtml'],
  ['application/wasm', 'wasm'],
  ['text/markdown', 'markdown'],
  ['text/x-sass', 'sass'],
  ['text/x-scss', 'scss'],
  ['text/x-python', 'python'],
  ['application/x-python-code', 'python'],
  ['text/x-java-source', 'java'],
  ['text/x-csharp', 'csharp'],
  ['text/x-php', 'php'],
  ['application/x-php', 'php'],
  ['text/x-ruby', 'ruby'],
  ['text/x-go', 'go'],
  ['text/x-rustsrc', 'rust'],
  ['text/x-kotlin', 'kotlin'],
  ['text/x-swift', 'swift'],
  ['text/x-dart', 'dart'],
  ['text/x-lua', 'lua'],
  ['text/x-scala', 'scala'],
  ['application/sql', 'sql'],
  ['text/x-sh', 'bash'],
  ['application/x-sh', 'bash'],
  ['text/x-objectivec', 'objectivec'],
  ['text/x-perl', 'perl'],
  ['text/x-pascal', 'pascal'],
  ['text/x-dsrc', 'd'],
  ['text/x-groovy', 'groovy'],
  ['text/x-rsrc', 'r'],
  ['text/x-vb', 'vbnet'],
  ['text/x-solidity', 'solidity'],
  ['text/x-julia', 'julia'],
  ['text/x-clojure', 'clojure'],
  ['application/graphql', 'graphql'],
  ['application/x-yaml', 'yaml'],
  ['text/x-ini', 'ini'],
  ['text/plain', 'plaintext'],
  ['text/uri-list', 'uri'],
  ['application/diff', 'diff'],
  ['text/x-dockerfile', 'dockerfile'],
]);

/**
 * Renders one Discord Attachment
 * @param props - the attachment and rendering context
 */
export async function Attachment({
  attachment,
  context,
  message,
}: {
  attachment: AttachmentType;
  context: RenderMessageContext;
  message: Message;
}) {
  let url = attachment.url;
  // const name = attachment.filename;
  // const width = attachment.width;
  // const height = attachment.height;

  const type = getAttachmentType(attachment);
  const attach = ('data' in attachment ? attachment.data : attachment) as APIAttachment;
  const json = toJSON(message) as APIMessage;

  if (type === 'image' || type === 'video') {
    // download it to a data url
    const downloaded = await context.callbacks.resolveImageSrc(attach, json);

    if (downloaded !== null) {
      url = downloaded ?? url;
    }
    return (
      <DiscordMediaGalleryItem
        media={url}
        key={attachment.id}
        description={attachment.description}
        mime-type={attachment.contentType}
      // spoiler={attachment}
      />
    )

  }

  const mime = attachment.contentType?.split(';')[0]!;
  const format = programmingLanguageMimeMap.get(mime);
  const { size, unit } = formatBytes(attachment.size);

  if (type === 'file') {
    if (format && size <= 1024 * 1024) {

      const content = await fetch(attach.url).then(res => res.text()).catch(() => null);

      if (content) {
        return (
          <DiscordTextFileAttachmentPreviewer
            href={url}
            name={attachment.filename}
            language={format}
            bytes={size}
            bytes-unit={unit}
            key={attachment.id}
            content={content}
          />
        )
      }
    }
  }


  return (
    <DiscordFileAttachment
      type={type}
      bytes={size}
      bytes-unit={unit}
      name={attachment.filename}
      key={attachment.id}
      href={url}
    />
  );
}

/**
 * Converts a Message to a JSON object
 * @param {Message} message the message to convert
 * @returns the JSON object
 */
function toJSON(message: Message) {
  const keys = Object.getOwnPropertyNames(message);
  const obj: Partial<APIMessage> = {};

  for (const key of keys) {
    if (['timestamp', 'client'].includes(key)) continue;

    const value = message[key as keyof Message];
    if (value && typeof value === 'object' && 'client' in value)
      Object.defineProperty(value, 'client', { value: undefined });

    if (value === undefined || value === null) continue;

    obj[ReplaceRegex.snake(key) as keyof APIMessage] = toSnakeCase(message[key as keyof Message] as never);
  }

  return obj;
}
