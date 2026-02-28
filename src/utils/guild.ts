import type { APIGuild } from 'discord-api-types/v10';
import type { CDNUrlOptions } from './cdn';
import { cdn } from './cdn';

class GuildUtils {
  iconURL(guild: Pick<APIGuild, 'id' | 'icon'>, options?: CDNUrlOptions): string | undefined {
    if (!guild.icon) return;

    return cdn.guildIcon(guild.id, guild.icon, options);
  }

  guildTagBadge(guildId: string, guildTagBadge: string, options?: CDNUrlOptions): string {
    return cdn.guildTagBadge(guildId, guildTagBadge, options);
  }

  roleIcon(roleId: string, icon: string, options?: CDNUrlOptions): string {
    return cdn.roleIcon(roleId, icon, options);
  }
}

export const guildUtils = new GuildUtils();
