import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Profile } from '../context';

/** The `@penwin/discord-components-core/ssr` entry. Declared locally so the dependency stays optional. */
interface CoreSSR {
  renderMarkup(markup: string): Promise<string>;
  setConfig(config: { profiles?: Record<string, Profile>; defaultTheme?: string }): void;
}

let core: Promise<CoreSSR> | undefined;
let queue: Promise<unknown> = Promise.resolve();

// A variable, so the optional dependency is not resolved at compile time. Under `module: nodenext`
// TypeScript keeps this a real import() in the CommonJS build, which the ESM-only core needs.
const SSR_ENTRY: string = '@penwin/discord-components-core/ssr';

function loadCore(): Promise<CoreSSR> {
  core ??= (import(SSR_ENTRY) as Promise<CoreSSR>).catch((error: unknown) => {
    core = undefined;
    throw new Error(
      "[sweety-html-transcripts] mode: 'server' needs the optional dependency @penwin/discord-components-core " +
        `(with its ./ssr entry). Install it, or render with mode: 'client'. Cause: ${String(error)}`
    );
  });

  return core;
}

/**
 * The version of the installed core, the one that renders the server markup.
 *
 * The page must load the client bundle of this same version: the bundle re-renders each
 * server-rendered component in place, and a bundle without that support (any core before 4.6.0)
 * renders a second copy next to the server content instead.
 */
function installedCoreVersion(): string | undefined {
  try {
    let dir = dirname(require.resolve('@penwin/discord-components-core'));
    for (let depth = 0; depth < 4; depth++, dir = dirname(dir)) {
      try {
        const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { name?: string; version?: string };
        if (pkg.name === '@penwin/discord-components-core') return pkg.version;
      } catch {
        // No package.json at this level; keep walking up.
      }
    }
  } catch {
    // Not resolvable from CommonJS; the caller falls back to the pinned version.
  }
  return undefined;
}

const SHADOW_STYLE = /(<template shadowroot(?:mode)?="open"[^>]*>)<style>([\s\S]*?)<\/style>/g;
const LIT_MARKERS = /<!--\/?lit-part[^>]*-->|<!--lit-node \d+-->|<!--\?-->/g;

/**
 * Pre-render custom elements to declarative shadow DOM.
 *
 * Two things keep the output a sane size: each component's CSS, repeated in every shadow root, is
 * replaced by an index into one shared list (see SERVER_STYLES_SCRIPT), and Lit's hydration markers
 * are dropped, since the client re-renders instead of hydrating.
 *
 * @returns The rendered markup, the shared style sheets, and the core version that rendered them.
 */
export async function renderServer(
  markup: string,
  globals: { profiles: Record<string, Profile>; theme: 'dark' | 'light'; selectMenus: Record<string, unknown[]> | null }
): Promise<{ html: string; styles: string[]; coreVersion: string | undefined }> {
  const ssr = await loadCore();

  // The core reads profiles and select menu data from globals, so renders must not interleave.
  const job = queue.then(async () => {
    ssr.setConfig({ profiles: globals.profiles, defaultTheme: globals.theme });
    (globalThis as { $discordSelectMenu?: unknown }).$discordSelectMenu = globals.selectMenus ?? undefined;
    return ssr.renderMarkup(markup);
  });
  queue = job.catch(() => undefined);

  const rendered = await job;

  const styles: string[] = [];
  const index = new Map<string, number>();

  const html = rendered
    .replace(SHADOW_STYLE, (_, template: string, css: string) => {
      let i = index.get(css);
      if (i === undefined) {
        i = styles.push(css) - 1;
        index.set(css, i);
      }
      return `${template}<style data-s="${i}"></style>`;
    })
    .replace(LIT_MARKERS, '');

  return { html, styles, coreVersion: installedCoreVersion() };
}
