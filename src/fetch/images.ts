import type { APIAttachment, APIMessage } from 'discord-api-types/v10';
import type { WebpOptions } from 'sharp';
import type { Awaitable } from '../adapters/types';

const TAG = '[sweety-html-transcripts]';

/** The media fields an image resolver gets: an attachment, or an embed/gallery media item. */
export type MediaSource = Pick<APIAttachment, 'url'> &
  Partial<Pick<APIAttachment, 'content_type' | 'size' | 'width' | 'height' | 'proxy_url'>>;

/**
 * Decides the source used for a media item in the transcript.
 *
 * - `string`: use it instead (a data url, or your own hosted copy)
 * - `undefined`: keep the original Discord url
 * - `null`: leave the item out of the transcript
 */
export type ResolveImageCallback = (media: MediaSource, message: APIMessage) => Awaitable<string | null | undefined>;

/**
 * Builds a {@link ResolveImageCallback} that downloads images and inlines them as data urls, so the
 * transcript keeps working after Discord's signed attachment urls expire.
 */
export class TranscriptImageDownloader {
  private maxFileSize?: number;
  private compression?: { quality: number; convertToWebP: boolean; options: Omit<WebpOptions, 'quality' | 'force'> };

  /**
   * Skip images bigger than this.
   * @param size - Maximum size in kilobytes
   */
  public withMaxSize(size: number): this {
    this.maxFileSize = size;
    return this;
  }

  /**
   * Recompress still images with `sharp` (an optional dependency you must install).
   * @param quality - 1 (smallest) to 100 (best)
   * @param convertToWebP - Also convert to WebP, which is usually smaller
   */
  public withCompression(quality = 80, convertToWebP = false, options: Omit<WebpOptions, 'quality' | 'force'> = {}) {
    if (quality < 1 || quality > 100) throw new RangeError('Quality must be between 1 and 100');
    this.compression = { quality, convertToWebP, options };
    return this;
  }

  public build(): ResolveImageCallback {
    return async (media) => {
      // Only media with dimensions is an image or video; leave files alone.
      if (!media.width || !media.height) return undefined;
      if (this.maxFileSize && media.size && media.size > this.maxFileSize * 1024) return undefined;

      const response = await fetch(media.url).catch((error: unknown) => {
        console.error(`${TAG} Failed to download image for transcript:`, error);
        return null;
      });
      if (!response?.ok) return undefined;

      const mimetype = response.headers.get('content-type') ?? media.content_type ?? 'application/octet-stream';
      const buffer = Buffer.from(await response.arrayBuffer());

      // Videos and gifs carry dimensions too, so gate sharp on the actual mime type. If sharp is
      // missing or cannot decode this image, embed it uncompressed rather than dropping it.
      if (this.compression && mimetype.startsWith('image/')) {
        try {
          const sharp = (await import('sharp')).default;
          const result = await sharp(buffer)
            .webp({
              quality: this.compression.quality,
              force: this.compression.convertToWebP,
              effort: 2,
              ...this.compression.options,
            })
            .toBuffer({ resolveWithObject: true });

          return `data:image/${result.info.format};base64,${result.data.toString('base64')}`;
        } catch (error) {
          console.error(`${TAG} Failed to compress image, embedding it uncompressed:`, error);
        }
      }

      return `data:${mimetype};base64,${buffer.toString('base64')}`;
    };
  }
}
