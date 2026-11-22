import { ChannelType } from 'discord-api-types/v10';
import { cdn } from '../utils/cdn';
import { toHex } from '../utils/utils';
import type { RenderContext } from './context';

/**
 * Options for user, role and channel select menus, read by `discord-select-menu-portal` from
 * `window.$discordSelectMenu`. Only the kinds that appeared in the transcript are included.
 */
export function selectMenuData(ctx: RenderContext): Record<string, unknown[]> | null {
  const { transcript, options } = ctx;
  const wanted = options.selectMenus ?? {};
  const data: Record<string, unknown[]> = {};

  if (ctx.selectMenus.users && wanted.users !== false) {
    data.users = Object.values(transcript.users).map((user) => ({
      identifier: user.id,
      username: user.username,
      discriminator: user.discriminator,
      globalName: ctx.displayName(user),
      avatarUrl: ctx.avatar(user, 32),
      bot: user.bot,
    }));
  }

  if (ctx.selectMenus.roles && wanted.roles !== false) {
    data.roles = Object.values(transcript.roles)
      .filter((role) => role.id !== transcript.guild?.id)
      .sort((a, b) => b.position - a.position)
      .map((role) => ({
        identifier: role.id,
        name: role.name,
        color: toHex(role.colors?.primary_color ?? role.color) ?? '#99aab5',
        iconUrl: role.icon ? cdn.roleIcon(role.id, role.icon, { size: 32 }) : undefined,
        memberCount: 0,
        showMemberCount: false,
      }));
  }

  if (ctx.selectMenus.channels && wanted.channels !== false) {
    data.channels = Object.values(transcript.channels)
      .filter((channel) => channel.name && channel.type !== ChannelType.GuildCategory)
      .slice(0, wanted.channelLimit ?? 25)
      .map((channel) => ({ identifier: channel.id, name: channel.name, type: channel.type }));
  }

  return Object.keys(data).length === 0 ? null : data;
}
