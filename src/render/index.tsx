import { ChannelType } from 'discord-api-types/v10';
import { devDependencies, name as packageName, repository } from '../../package.json';
import type { Child } from '../jsx';
import { h, raw, renderChild } from '../jsx';
import type { Transcript } from '../model';
import { TRANSCRIPT_VERSION } from '../model';
import { cdn } from '../utils/cdn';
import { stringifyForScript, toHex } from '../utils/utils';
import { Content, ContentKind } from './content';
import type { RenderOptions } from './context';
import { RenderContext } from './context';
import { resolveLocale } from './locale';
import { fill, Message } from './message';
import { GOTO_SCRIPT, SERVER_STYLES_SCRIPT } from './scripts';
import { renderServer } from './server';

export type { Profile, RenderOptions } from './context';

const CORE_VERSION = devDependencies['@penwin/discord-components-core'].replace(/^[\^~]/, '');
const DEFAULT_CDN = `https://cdn.jsdelivr.net/npm/@penwin/discord-components-core@${CORE_VERSION}`;
const REPOSITORY = repository.url.replace(/^git\+/, '').replace(/\.git$/, '');

const isDM = (type: ChannelType): boolean => type === ChannelType.DM || type === ChannelType.GroupDM;
const isThread = (type: ChannelType): boolean =>
  type === ChannelType.PublicThread || type === ChannelType.PrivateThread || type === ChannelType.AnnouncementThread;

/**
 * Render a transcript to a complete HTML document.
 *
 * Pure and synchronous in client mode: the same transcript and options always give the same HTML.
 * Server mode returns a promise, since it loads the component library.
 */
export function render(transcript: Transcript, options?: RenderOptions & { mode?: 'client' }): string;
export function render(transcript: Transcript, options: RenderOptions & { mode: 'server' }): Promise<string>;
export function render(transcript: Transcript, options?: RenderOptions): string | Promise<string>;
export function render(transcript: Transcript, options: RenderOptions = {}): string | Promise<string> {
  if (transcript.version !== TRANSCRIPT_VERSION) {
    throw new TypeError(
      `[sweety-html-transcripts] Unsupported transcript version ${transcript.version} (expected ${TRANSCRIPT_VERSION}).`
    );
  }

  const ctx = new RenderContext(transcript, options, resolveLocale(options.locale));
  const theme = options.theme ?? 'dark';

  // The body goes first: rendering it is what registers profiles and select menu usage.
  const body = renderChild(<Messages ctx={ctx} />);
  const selectMenus = selectMenuData(ctx);

  if (options.mode === 'server') {
    return renderServer(body, { profiles: ctx.profiles, theme, selectMenus }).then(({ html, styles }) =>
      document(ctx, html, selectMenus, [
        <script type="application/json" id="sweety-styles">
          {raw(stringifyForScript(styles))}
        </script>,
        <script>{raw(SERVER_STYLES_SCRIPT)}</script>,
      ])
    );
  }

  return document(ctx, body, selectMenus, []);
}

function document(
  ctx: RenderContext,
  body: string,
  selectMenus: Record<string, unknown[]> | null,
  afterBody: Child[]
): string {
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
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="generator" content={packageName} />
        <title>
          {options.title ?? (isDM(channel.type) ? ctx.locale.directMessages : (channel.name ?? channel.id))}
        </title>
        {favicon && <link rel="icon" type="image/png" href={favicon} />}
        <link rel="stylesheet" href={`${base}/dist/bundle/styles/base.css`} />
        <script>{raw(`window.$discordMessage=${stringifyForScript(config)};`)}</script>
        {selectMenus && <script>{raw(`window.$discordSelectMenu=${stringifyForScript(selectMenus)};`)}</script>}
        <script>{raw(GOTO_SCRIPT)}</script>
        <script type="module" src={`${base}/dist/bundle/index.mjs`}></script>
      </head>
      <body style={{ margin: 0, minHeight: '100vh' }}>
        {raw(body)}
        {afterBody}
      </body>
    </html>
  )}`;
}

function Messages({ ctx }: { ctx: RenderContext }): Child {
  const { transcript, options, locale } = ctx;
  const count = transcript.messages.length;

  const footer =
    options.footer === false
      ? null
      : (options.footer ?? (count === 1 ? locale.footer.one : locale.footer.other))
          .replaceAll('{count}', String(count))
          // The 0.x placeholders.
          .replaceAll('{number}', String(count))
          .replaceAll('{s}', count === 1 ? '' : 's');

  return (
    <discord-messages light-theme={options.theme === 'light'} style={{ minHeight: '100vh' }}>
      <Header ctx={ctx} />
      {transcript.messages.map((message) => (
        <Message ctx={ctx} message={message} />
      ))}
      <div style={{ textAlign: 'center', width: '100%', padding: '16px 0' }}>
        {footer}{' '}
        {options.poweredBy !== false &&
          fill(locale.poweredBy, {
            name: (
              <a href={REPOSITORY} style={{ color: 'lightblue' }}>
                {packageName}
              </a>
            ),
          })}
      </div>
    </discord-messages>
  );
}

function Header({ ctx }: { ctx: RenderContext }): Child {
  const { channel, guild } = ctx.transcript;
  const { header } = ctx.locale;
  const dm = isDM(channel.type);

  const recipient = channel.recipients?.[0];
  const name = dm
    ? recipient
      ? ctx.displayName(recipient)
      : ctx.locale.unknownRecipient
    : (channel.name ?? channel.id);

  let description: Child;
  if (dm) description = header.directMessages;
  else if (isThread(channel.type)) description = header.thread.replace('{name}', name);
  else if (channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice)
    description = header.voice.replace('{name}', name);
  else if (channel.type === ChannelType.GuildCategory) description = header.category;
  else if (channel.topic) description = <Content ctx={ctx} content={channel.topic} kind={ContentKind.Reply} />;
  else description = header.channel.replace('{name}', name);

  return (
    <discord-transcript-header
      guild={guild?.name ?? ctx.locale.directMessages}
      channel={name}
      icon={guild?.icon ? cdn.guildIcon(guild.id, guild.icon, { size: 128 }) : undefined}
    >
      {description}
    </discord-transcript-header>
  );
}

/** Options for user, role and channel select menus, read by `discord-select-menu-portal`. */
function selectMenuData(ctx: RenderContext): Record<string, unknown[]> | null {
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
