import type { Transcript } from '../model';
import { TRANSCRIPT_VERSION } from '../model';
import { stringifyForScript } from '../utils/utils';
import type { RenderOptions } from './context';
import { RenderContext } from './context';
import { Document } from './document';
import { h, raw, renderChild } from './jsx';
import { resolveLocale } from './locales';
import { Messages } from './parts/messages';
import { selectMenuData } from './select-menus';
import { renderServer } from './server';
import { SERVER_STYLES_SCRIPT } from './server/script';

export type { Profile, RenderOptions } from './context';

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
      Document({
        ctx,
        body: html,
        selectMenus,
        afterBody: [
          <script type="application/json" id="sweety-styles">
            {raw(stringifyForScript(styles))}
          </script>,
          <script>{raw(SERVER_STYLES_SCRIPT)}</script>,
        ],
      })
    );
  }

  return Document({ ctx, body, selectMenus });
}
