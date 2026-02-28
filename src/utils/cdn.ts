import type { ImageSize } from 'discord-api-types/v10';
import { ImageFormat } from 'discord-api-types/v10';

export const CDN_URL = 'https://cdn.discordapp.com';

export enum StickerExtension {
  PNG = 'png',
  JSON = 'json',
  GIF = 'gif',
}

export interface CDNUrlOptions {
  extension?: ImageFormat | (string & {});
  size?: ImageSize;
  forceStatic?: boolean;
}

export class BaseCDN {
  constructor(public readonly baseURL: string) {}

  makeURL(route: string[], options: CDNUrlOptions = {}): string {
    const lastRoute: string = route.at(-1)!;
    const isAnimated: boolean = lastRoute.includes('a_');

    if (isAnimated) {
      if (options.forceStatic) options.extension = ImageFormat.PNG;
      else if (!options.extension) options.extension = ImageFormat.GIF;
    }

    options.extension ??= ImageFormat.PNG;

    const url = new URL(`${this.baseURL}/${route.join('/')}.${options.extension}`);

    if (options.size) url.searchParams.set('size', `${options.size}`);

    return url.toString();
  }

  userAvatar(userId: string, avatar: string, options?: CDNUrlOptions): string {
    return this.makeURL(['avatars', userId, avatar], options);
  }

  defaultUserAvatar(index: number): string {
    return this.makeURL(['embed', 'avatars', index.toString()], { extension: ImageFormat.PNG });
  }

  memberAvatar(guildId: string, userId: string, avatar: string, options?: CDNUrlOptions): string {
    return this.makeURL(['guilds', guildId, 'users', userId, 'avatars', avatar], options);
  }

  guildIcon(guildId: string, icon: string, options?: CDNUrlOptions): string {
    return this.makeURL(['icons', guildId, icon], options);
  }

  avatarDecoration(avatarDecorationDataAsset: string): string {
    return this.makeURL(['avatar-decoration-presets', avatarDecorationDataAsset], { extension: ImageFormat.PNG });
  }

  sticker(stickerId: string, extension: StickerExtension): string {
    return this.makeURL(['stickers', stickerId], { extension });
  }

  roleIcon(roleId: string, icon: string, options?: CDNUrlOptions): string {
    return this.makeURL(['role-icons', roleId, icon], options);
  }

  emoji(emojiId: string, options?: CDNUrlOptions): string {
    return this.makeURL(['emojis', emojiId], options);
  }

  guildTagBadge(guildId: string, guildTagBadge: string, options?: CDNUrlOptions): string {
    return this.makeURL(['guild-tag-badges', guildId, guildTagBadge], options);
  }
}

export const cdn = new BaseCDN(CDN_URL);
