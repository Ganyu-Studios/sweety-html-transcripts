# Seyfert plugin

`sweety-html-transcripts/plugin` registers the package with
[seyfert's plugin system](https://seyfert.dev) (seyfert 5 or later). It adds:

- `client.transcripts`: the same methods `createTranscripts(seyfert(client))` returns, created once
  with the client.
- `ctx.transcripts` in commands, components and modals: the same methods for the channel the
  context runs in, so you don't pass a channel id.

## Register it

```ts
import { Client, definePlugins } from 'seyfert';
import { transcriptsPlugin } from 'sweety-html-transcripts/plugin';

const plugins = definePlugins(
  transcriptsPlugin({
    render: { theme: 'dark', locale: 'es' },
    fetch: { limit: 1000 },
  })
);

const client = new Client({ plugins });
```

`client.transcripts` is typed from the plugins you pass to `new Client`. To type `ctx.transcripts`,
`ctx.client.transcripts` and `UsingClient` too (commands, components, modals, events), register
the plugin list once:

```ts
declare module 'seyfert' {
  interface SeyfertRegistry {
    plugins: typeof plugins;
  }
}
```

## Use it

### The channel the context runs in

```ts
import { Command, type CommandContext, Declare } from 'seyfert';

@Declare({ name: 'transcript', description: 'Save this channel as HTML' })
export default class TranscriptCommand extends Command {
  async run(ctx: CommandContext) {
    await ctx.deferReply();

    const file = await ctx.transcripts.attachment({ filename: `transcript-${ctx.channelId}.html` });

    await ctx.editOrReply({ content: 'Here it is:', files: [file] });
  }
}
```

`ctx.transcripts` has `attachment`, `html`, `buffer`, `fetch` and `fromMessages`, each taking the
options of its `createTranscripts` counterpart without the channel. `ctx.transcripts.channelId`
says which channel that is: the one the interaction (or prefix message) came from. Creating the
context fetches nothing; the API is only called when you call a method.

### Any channel

`ctx.client.transcripts` (or `client.transcripts` outside a context) takes the channel first, like
`createTranscripts`. Use it for other channels, for example closing a ticket from a log channel, and
for `render`:

```ts
const file = await ctx.client.transcripts.attachment(ticketChannelId, { filename: 'ticket-42.html' });

const transcript = await ctx.client.transcripts.fetch(ticketChannelId);
const html = ctx.client.transcripts.render(transcript, { theme: 'light' });
```

See [createTranscripts](../api-reference/createtranscripts.md) for every method and option.

## Options

| Option   | Default | What it does                                                                |
| -------- | ------- | --------------------------------------------------------------------------- |
| `fetch`  | `{}`    | Fetch defaults for every transcript (`limit`, `filter`, `saveImages`…).     |
| `render` | `{}`    | Render defaults for every transcript (`theme`, `title`, `locale`, `mode`…). |
| `cache`  | `true`  | Look channels, guilds, roles, members and users up through seyfert's cache. |

Options passed to a single call override these defaults, on `ctx.transcripts` and
`client.transcripts` alike.

## How it works

The plugin is a plain seyfert plugin object, so the package never imports seyfert at runtime. Seyfert
creates `client.transcripts` while it constructs the client, and `ctx.transcripts` each time it
creates a context. Channels, guilds, roles, members and users go through seyfert's `raw` shorters
(`client.members.raw()` and the like): the cache when it has them, otherwise one request that seyfert
caches, so the next transcript does not ask again. The adapter reads the client on every request, so
a REST client or cache that seyfert sets up later (for example through `setServices`) is the one
transcripts use.
