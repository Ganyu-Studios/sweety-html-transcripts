import type { APIMessage } from 'discord-api-types/v10';
import type { TranscriptAdapter } from './adapters/core';
import type { RenderMessageContext } from './generator';
import type { AllAPIChannel } from './utils/channel';

export type AttachmentTypes = 'audio' | 'video' | 'image' | 'file';

export enum ExportReturnType {
  Buffer = 'buffer',
  String = 'string',
  Attachment = 'attachment',
}

export type ObjectType<
  T extends ExportReturnType,
  Adapter extends TranscriptAdapter<unknown>,
> = T extends ExportReturnType.Buffer
  ? Buffer
  : T extends ExportReturnType.String
    ? string
    : ReturnType<Adapter['createTranscriptAttachment']>;

export type GenerateFromMessagesOptions<
  T extends ExportReturnType,
  Adapter extends TranscriptAdapter<unknown>,
> = Partial<{
  /**
   * The type of object to return
   * @default ExportReturnType.ATTACHMENT
   */
  returnType: T;

  /**
   * Downloads images and encodes them as base64 data urls
   * @default false
   */
  saveImages: boolean;

  /**
   * Callbacks for resolving channels, users, and roles
   */
  callbacks: Partial<RenderMessageContext['callbacks']>;

  /**
   * The name of the file to return if returnType is ExportReturnType.ATTACHMENT
   * @default 'transcript-{channel-id}.html'
   */
  filename: string;

  /**
   * Whether to include the "Powered by sweety-html-transcripts" footer
   * @default true
   */
  poweredBy: boolean;

  /**
   * The message right before "Powered by" text. Remember to put the {s}
   * @default 'Exported {number} message{s}.'
   */
  footerText: string;

  /**
   * Whether to show the guild icon or a custom icon as the favicon
   * 'guild' - use the guild icon
   * or pass in a url to use a custom icon
   * @default "guild"
   */
  favicon: 'guild' | (string & {});

  /**
   * Whether to hydrate the html server-side
   * @default false - the returned html will be hydrated client-side
   */
  hydrate: boolean;
}> &
  RequiredTranscriptData<Adapter>;

export type RequiredTranscriptData<Adapter extends TranscriptAdapter<unknown>> = {
  adapter: Adapter;
  channel: AllAPIChannel;
};

export type CreateTranscriptOptions<T extends ExportReturnType, Adapter extends TranscriptAdapter<unknown>> = Partial<
  GenerateFromMessagesOptions<T, Adapter> & {
    /**
     * The max amount of messages to fetch. Use `-1` to recursively fetch.
     */
    limit: number;

    /**
     * Filter messages of the channel
     * @default (() => true)
     */
    filter: (message: APIMessage) => boolean;
  }
> &
  RequiredTranscriptData<Adapter>;
