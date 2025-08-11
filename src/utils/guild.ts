import { APIGuild } from "discord-api-types/v10";
import { cdn, CDNUrlOptions } from "./cdn";

class GuildUtils {

  iconURL(guild: Pick<APIGuild, 'id' | 'icon'>, options?: CDNUrlOptions): string | undefined {
    if (!guild.icon) return;

    return cdn.guildIcon(guild.id, guild.icon, options);
  }

  guildTagBadge(guildId: string, guildTagBadge: string, options?: CDNUrlOptions) {

    return cdn.guildTagBadge(guildId, guildTagBadge, options);
  }
}

export const guildUtils = new GuildUtils();