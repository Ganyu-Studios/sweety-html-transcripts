import type { APIRole, APIUser } from 'discord-api-types/v10';
import { UserFlags } from 'discord-api-types/v10';
import type { Transcript, TranscriptMember } from '../model';
import { cdn } from '../utils/cdn';
import { hasFlag, toHex } from '../utils/utils';
import type { DeepPartial, Locale, LocaleName } from './locale';

export interface RenderOptions {
  /** @default 'dark' */
  theme?: 'dark' | 'light';
  /** The document title. @default the channel name */
  title?: string;
  /** A built-in locale (`'en'`, `'es'`) or overrides on top of English. @default 'en' */
  locale?: LocaleName | DeepPartial<Locale>;
  /**
   * `'client'`: components render in the viewer's browser from the CDN bundle (smallest file).
   * `'server'`: components are pre-rendered to declarative shadow DOM, so the transcript paints
   * immediately and is readable without JavaScript. Several times larger; needs the optional
   * `@penwin/discord-components-core` dependency.
   * @default 'client'
   */
  mode?: 'client' | 'server';
  /** `'guild'` uses the guild icon, a string is used as the icon url, `false` sets none. @default 'guild' */
  favicon?: 'guild' | false | (string & {});
  /**
   * Footer text, or `false` to hide it. Use `{count}` for the number of messages.
   * @default the locale's footer
   */
  footer?: string | false;
  /** Show the "Powered by" link. @default true */
  poweredBy?: boolean;
  /** Which data user, role and channel select menus show as options. All default to true. */
  selectMenus?: { users?: boolean; roles?: boolean; channels?: boolean; channelLimit?: number };
  /**
   * Where the component bundle is loaded from. Must serve `dist/bundle/index.mjs` and
   * `dist/bundle/styles/base.css` of `@penwin/discord-components-core`.
   * @default jsDelivr, pinned to the version this package was built against
   */
  cdn?: string;
}

/** The profile the components read from `$discordMessage.profiles`. */
export interface Profile {
  author: string;
  avatar?: string;
  roleColor?: string;
  roleIcon?: string;
  roleName?: string;
  bot?: boolean;
  verified?: boolean;
  clanTag?: string;
  clanIcon?: string;
}

export class RenderContext {
  public readonly profiles: Record<string, Profile> = {};
  /** Which kinds of entity select menus appeared, so only their option data is embedded. */
  public readonly selectMenus = { users: false, roles: false, channels: false };
  private readonly highestRoles = new Map<string, APIRole | null>();

  public constructor(
    public readonly transcript: Transcript,
    public readonly options: RenderOptions,
    public readonly locale: Locale
  ) {}

  public get guildId(): string | undefined {
    return this.transcript.guild?.id;
  }

  public user(id: string): APIUser | undefined {
    return this.transcript.users[id];
  }

  public member(id: string): TranscriptMember | undefined {
    return this.transcript.members[id];
  }

  /** The member's highest role that has a color, as Discord colors names. */
  public colorRole(userId: string): APIRole | null {
    if (this.highestRoles.has(userId)) return this.highestRoles.get(userId)!;

    let best: APIRole | null = null;
    for (const id of this.member(userId)?.roles ?? []) {
      const role = this.transcript.roles[id];
      if (!role || !(role.colors?.primary_color ?? role.color)) continue;
      if (!best || role.position > best.position) best = role;
    }

    this.highestRoles.set(userId, best);
    return best;
  }

  public roleColor(userId: string): string | undefined {
    const role = this.colorRole(userId);
    return toHex(role?.colors?.primary_color ?? role?.color);
  }

  /** Nickname, then global name, then username — what Discord shows next to a message. */
  public displayName(user: Pick<APIUser, 'id' | 'username' | 'discriminator' | 'global_name'>): string {
    const nick = this.member(user.id)?.nick;
    if (nick) return nick;
    if (user.global_name) return user.global_name;
    return user.discriminator && user.discriminator !== '0' ? `${user.username}#${user.discriminator}` : user.username;
  }

  public avatar(user: Pick<APIUser, 'id' | 'avatar' | 'discriminator'>, size: 32 | 64 | 128 = 64): string {
    const member = this.member(user.id);
    if (member?.avatar && this.guildId) return cdn.memberAvatar(this.guildId, user.id, member.avatar, { size });
    if (user.avatar) return cdn.userAvatar(user.id, user.avatar, { size });

    const index =
      !user.discriminator || user.discriminator === '0'
        ? Number((BigInt(user.id) >> 22n) % 6n)
        : Number(user.discriminator) % 5;
    return cdn.defaultUserAvatar(index);
  }

  /** Register a user as a profile, so components can reference it by id. */
  public profile(userId: string): string {
    if (this.profiles[userId]) return userId;

    const user = this.user(userId);
    if (!user) return userId;

    const role = this.colorRole(userId);
    const tag = user.primary_guild;

    this.profiles[userId] = {
      author: this.displayName(user),
      avatar: this.avatar(user),
      roleColor: this.roleColor(userId),
      roleIcon: role?.icon ? cdn.roleIcon(role.id, role.icon, { size: 32 }) : undefined,
      roleName: role?.name,
      bot: user.bot,
      verified: hasFlag(user.public_flags ?? user.flags, UserFlags.VerifiedBot),
      clanTag: tag?.tag ?? undefined,
      clanIcon:
        tag?.identity_guild_id && tag.badge
          ? cdn.guildTagBadge(tag.identity_guild_id, tag.badge, { size: 32, extension: 'png' })
          : undefined,
    };

    return userId;
  }

  /** The source for a media url: the saved copy if there is one, `null` when it was dropped. */
  public media(url: string, fallback = url): string | null {
    return url in this.transcript.assets ? this.transcript.assets[url]! : fallback;
  }
}
