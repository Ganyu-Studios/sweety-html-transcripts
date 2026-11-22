import { name as packageName, repository } from '../../../package.json';
import type { RenderContext } from '../context';
import type { Child } from '../jsx';
import { h } from '../jsx';
import { fill, plural } from '../locales';
import { Header } from './header';
import { Message } from './message';

const REPOSITORY = repository.url.replace(/^git\+/, '').replace(/\.git$/, '');

/** Everything inside `<body>`: header, messages and footer. */
export function Messages({ ctx }: { ctx: RenderContext }): Child {
  const { transcript, options } = ctx;

  return (
    <discord-messages light-theme={options.theme === 'light'}>
      <Header ctx={ctx} />
      {transcript.messages.map((message) => (
        <Message ctx={ctx} message={message} />
      ))}
      <Footer ctx={ctx} />
    </discord-messages>
  );
}

function Footer({ ctx }: { ctx: RenderContext }): Child {
  const { options, locale } = ctx;
  const count = ctx.transcript.messages.length;

  const text =
    options.footer === false
      ? null
      : options.footer !== undefined
        ? options.footer
            .replaceAll('{count}', String(count))
            // The 0.x placeholders.
            .replaceAll('{number}', String(count))
            .replaceAll('{s}', count === 1 ? '' : 's')
        : plural(locale.footer, count);

  if (text === null && options.poweredBy === false) return null;

  return (
    <footer class="sweety-footer">
      {text} {options.poweredBy !== false && fill(locale.poweredBy, { name: <a href={REPOSITORY}>{packageName}</a> })}
    </footer>
  );
}
