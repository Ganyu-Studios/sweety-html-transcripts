import {
  DiscordAttachments,
  DiscordAudioAttachment,
  DiscordFileAttachment,
  DiscordMediaGallery,
  DiscordMediaGalleryItem,
  DiscordTextFileAttachmentPreviewer,
  DiscordVoiceMessage,
} from '@penwin/discord-components-react-render';
import type { APIAttachment, APIMessageSnapshot } from 'discord-api-types/v10';
import { MessageFlags } from 'discord-api-types/v10';
import React from 'react';
import type { RenderMessageContext } from '..';
import type { AttachmentTypes } from '../../types';
import type { APIMessageData } from '../../utils/channel';
import { formatBytes, hasFlag } from '../../utils/utils';

function getAttachmentType(attachment: Pick<APIAttachment, 'content_type'>): AttachmentTypes {
  const type = attachment.content_type?.split('/')?.[0] ?? 'unknown';
  if (['audio', 'video', 'image'].includes(type)) return type as AttachmentTypes;
  return 'file';
}

/**
 * Renders all attachments for a message
 * @param message
 * @param context
 * @returns
 */
export async function Attachments(props: {
  message: APIMessageData | APIMessageSnapshot['message'];
  context: RenderMessageContext;
}) {
  if (props.message.attachments.length === 0) return <></>;

  type Attachments = typeof props.message.attachments;
  const grouped = {
    mediaGallery: [] as Attachments,
    other: [] as Attachments,
  };

  for (const attachment of props.message.attachments) {
    const type = getAttachmentType(attachment);
    if (type === 'image' || type === 'video') {
      grouped.mediaGallery.push(attachment);
    } else {
      grouped.other.push(attachment);
    }
  }

  const isVoiceMessage = props.message.flags
    ? (props.message.flags & MessageFlags.IsVoiceMessage) === MessageFlags.IsVoiceMessage
    : false;

  return (
    <DiscordAttachments slot="attachments">
      {grouped.mediaGallery.length > 0 && (
        <DiscordMediaGallery>
          {grouped.mediaGallery.map((attachment, id) => (
            <Attachment attachment={attachment} message={props.message} context={props.context} key={id} />
          ))}
        </DiscordMediaGallery>
      )}
      {grouped.other.map((attachment, id) => (
        <Attachment
          attachment={attachment}
          message={props.message}
          context={props.context}
          key={id}
          isVoiceMessage={isVoiceMessage}
        />
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
  isVoiceMessage,
}: {
  attachment: APIAttachment;
  context: RenderMessageContext;
  message: APIMessageData | APIMessageSnapshot['message'];
  isVoiceMessage?: boolean;
}) {
  let url = attachment.url;

  const type = getAttachmentType(attachment);
  const attach = ('data' in attachment ? attachment.data : attachment) as APIAttachment;

  if (isVoiceMessage) {
    return <DiscordVoiceMessage key={attachment.id} href={attachment.url} waveform={attachment.waveform} />;
  }

  if (type === 'image' || type === 'video') {
    // download it to a data url
    const downloaded = await context.callbacks.resolveImageSrc(attach, message);

    if (downloaded !== null) {
      url = downloaded ?? url;
    }
    return (
      <DiscordMediaGalleryItem
        spoiler={hasFlag({ bitfield: attach.flags, flag: 8 })}
        media={url}
        key={attachment.id}
        description={attachment.description}
        mime-type={attachment.content_type}
        width={attachment.width ?? void 0}
        height={attachment.height ?? void 0}
      />
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
  const mime = attachment.content_type?.split(';')[0]!;
  const format = programmingLanguageMimeMap.get(mime);
  const { size, unit } = formatBytes(attachment.size);

  if (type === 'audio') {
    return (
      <DiscordAudioAttachment
        key={attachment.id}
        href={url}
        bytes={size}
        bytes-unit={unit}
        name={attachment.filename}
      />
    );
  }

  if (type === 'file') {
    if (format && size <= 1024 * 1024) {
      const content = await fetch(attach.url)
        .then((res) => res.text())
        .catch(() => null);

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
        );
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
