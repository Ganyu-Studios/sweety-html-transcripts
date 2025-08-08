import { APIUser, Snowflake } from "discord-api-types/v10";
import { cdn, CDNUrlOptions } from "./cdn";
import { GuildMemberData } from "./channel";

class UserUtils {

  calculateUserDefaultAvatarIndex(userId: Snowflake, discriminator: string) {
    if (discriminator === '0') return Number(BigInt(userId) >> 22n) % 6;
    return Number(discriminator) % 5;
  }

  defaultAvatarURL(user: Pick<APIUser, 'id' | 'discriminator'>) {
    return cdn.defaultUserAvatar(this.calculateUserDefaultAvatarIndex(user.id, user.discriminator));
  }

  avatarURL(user: Pick<APIUser, 'id' | 'avatar' | 'discriminator'>, options?: CDNUrlOptions) {
    if (!user.avatar) {
      return this.defaultAvatarURL(user);
    }

    return cdn.userAvatar(user.id, user.avatar, options);
  }

  memberAvatarURL(member: Pick<GuildMemberData, 'avatar'>, user: Pick<APIUser, 'id' | 'avatar' | 'discriminator'>, guildId: string, options: CDNUrlOptions & { exclude: true }): string | null;
  memberAvatarURL(member: Pick<GuildMemberData, 'avatar'>, user: Pick<APIUser, 'id' | 'avatar' | 'discriminator'>, guildId: string, options?: CDNUrlOptions & { exclude?: false }): string;
  memberAvatarURL(member: Pick<GuildMemberData, 'avatar'>, user: Pick<APIUser, 'id' | 'avatar' | 'discriminator'>, guildId: string, options?: CDNUrlOptions & { exclude?: boolean }): string | null {
    if (!member.avatar) {
      return options?.exclude ? null : this.avatarURL(user, options);
    }

    return cdn.memberAvatar(guildId, user.id, member.avatar, options);
  }

  avatarDecorationURL(user: Pick<APIUser, 'id' | 'avatar_decoration_data'>) {
    if (!user.avatar_decoration_data) return;
    return cdn.avatarDecoration(user.avatar_decoration_data.asset);
  }

  tag(user: Pick<APIUser, 'username' | 'discriminator' | 'global_name'>) {
    return user.global_name ?? `${user.username}#${user.discriminator}`;
  }

}

export const userUtils = new UserUtils();