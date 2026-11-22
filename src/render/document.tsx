import { devDependencies, name as packageName } from '../../package.json';
import { cdn } from '../utils/cdn';
import { isDM } from '../utils/channels';
import { stringifyForScript } from '../utils/utils';
import type { RenderContext } from './context';
import type { Child } from './jsx';
import { h, raw, renderChild } from './jsx';
import { GOTO_SCRIPT } from './scripts';
import { STYLES } from './styles';

const CORE_VERSION = devDependencies['@penwin/discord-components-core'].replace(/^[\^~]/, '');
const DEFAULT_CDN = `https://cdn.jsdelivr.net/npm/@penwin/discord-components-core@${CORE_VERSION}`;

/** The HTML document around the rendered messages. */
export function Document({
  ctx,
  body,
  selectMenus,
  afterBody = [],
}: {
  ctx: RenderContext;
  body: string;
  selectMenus: Record<string, unknown[]> | null;
  afterBody?: Child[];
}): string {
  const { transcript, options } = ctx;
  const { channel, guild } = transcript;
  const base = (options.cdn ?? DEFAULT_CDN).replace(/\/$/, '');

  const favicon =
    options.favicon === false
      ? undefined
      : options.favicon && options.favicon !== 'guild'
        ? options.favicon
        : guild?.icon
          ? cdn.guildIcon(guild.id, guild.icon, { size: 32, extension: 'png' })
          : undefined;

  const config = {
    profiles: ctx.profiles,
    defaultTheme: options.theme === 'light' ? 'light' : 'dark',
  };

  return `<!DOCTYPE html>${renderChild(
    <html lang={ctx.localeName}>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="generator" content={packageName} />
        <title>
          {options.title ?? (isDM(channel.type) ? ctx.locale.directMessages : (channel.name ?? channel.id))}
        </title>
        {favicon && <link rel="icon" type="image/png" href={favicon} />}
        <link rel="stylesheet" href={`${base}/dist/bundle/styles/base.css`} />
        <style>{raw(STYLES)}</style>
        <script>{raw(`window.$discordMessage=${stringifyForScript(config)};`)}</script>
        {selectMenus && <script>{raw(`window.$discordSelectMenu=${stringifyForScript(selectMenus)};`)}</script>}
        <script>{raw(GOTO_SCRIPT)}</script>
        <script type="module" src={`${base}/dist/bundle/index.mjs`}></script>
      </head>
      <body>
        {raw(body)}
        {afterBody}
      </body>
    </html>
  )}`;
}
