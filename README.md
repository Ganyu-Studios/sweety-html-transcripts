# `sweety-html-transcripts`

[![Discord](https://img.shields.io/discord/555474311637499955?label=discord)](https://discord.gg/4JmKY8wgB6)
[![npm](https://img.shields.io/npm/dw/sweety-html-transcripts)](http://npmjs.org/package/sweety-html-transcripts)
![GitHub package.json version](https://img.shields.io/github/package-json/v/Ganyu-Studios/sweety-html-transcripts)
![GitHub Repo stars](https://img.shields.io/github/stars/Ganyu-Studios/sweety-html-transcripts?style=social)

Discord HTML Transcripts is a node.js module to generate nice looking HTML
transcripts. Processes discord markdown like **bold**, _italics_,
~~strikethroughs~~, and more. Nicely formats attachments and embeds. Built in
XSS protection, preventing users from inserting arbitrary html tags.

This module can format the following:

- Discord flavored markdown
  - Uses
    [discord-markdown-parser](https://github.com/ItzDerock/discord-markdown-parser)
  - Allows for complex markdown syntax to be parsed properly
- Embeds
- System messages
  - Join messages
  - Message Pins
  - Boost messages
- Slash commands
  - Will show the name of the command in the same style as Discord
- Buttons
- Reactions
- Attachments
  - Images, videos, audio, and generic files
- Replies
- Mentions
- Threads

**Works with [seyfert](https://seyfert.dev), [discord.js](https://discord.js.org), any other library through a small adapter, or no library at all.**

Styles from
[@penwin/discord-components-core](https://github.com/Ganyu-Studios/discord-components).\
The HTML is built with a tiny string renderer (no React); components render in the browser, or on the server with `mode: 'server'`.

## 👋 Support

Please do not DM me requesting support with this package, I will not respond.\
Instead, please open a thread on [this](https://discord.gg/4JmKY8wgB6) server.

## 🖨️ Example Output

![output](./assets/output.gif)

## 📝 Usage

Create a `transcripts` instance once, with the adapter for your library, and use it anywhere you
have the client:

```ts
import { createTranscripts, seyfert } from 'sweety-html-transcripts';
// discord.js: import { createTranscripts, discordjs } from 'sweety-html-transcripts';

const transcripts = createTranscripts(seyfert(client)); // or discordjs(client)

// 1. A file ready to send
const file = await transcripts.attachment(channelId, { filename: 'ticket-42.html' });
await client.messages.write(logChannelId, { content: 'Transcript:', files: [file] });
// discord.js: await logChannel.send({ content: 'Transcript:', files: [file] });

// 2. Just the HTML (store it, serve it…)
const html = await transcripts.html(channelId, { theme: 'light', title: 'Ticket #42' });

// 3. The data model (save it, render it later or somewhere else)
const transcript = await transcripts.fetch(channelId);
const again = transcripts.render(transcript, { locale: 'en' });
```

`transcripts.fetch()` returns plain JSON with the raw Discord API messages and everything needed to
draw them. Store it in a database and render it on demand, without a bot.

### Adapters

An adapter is "GET this Discord API route and give me the raw JSON", plus two optional parts: a
cache to read first, and a way to wrap the finished file. Messages always come from REST as raw API
objects, so nothing in them is converted from library classes, and rate limits stay with your
library.

| Adapter             | Reads first                                         | Then                                | `attachment()` returns           |
| ------------------- | --------------------------------------------------- | ----------------------------------- | -------------------------------- |
| `seyfert(client)`   | `client.cache` (already raw API objects)            | `client.rest`                       | a seyfert `RawFile`              |
| `discordjs(client)` | the client's caches (`channels`, `guilds`, `users`) | `client.rest`                       | a discord.js `AttachmentPayload` |
| `rest(token)`       |                                                     | `fetch` and a bot token, no library | `{ data, name }`                 |

The cache covers what the bot usually already has (the channel, the guild and its roles, members,
users, guild channels), so a transcript mostly costs the message pages plus the members that are not
cached. Anything not cached falls back to REST. Turn it off with `seyfert(client, { cache: false })` or
`discordjs(client, { cache: false })` if your cache can be stale in ways that matter.

Any other library works by implementing `TranscriptAdapter`:

```ts
const adapter: TranscriptAdapter<MyFile> = {
  get: (route, query) => myRest.get(route, query), // must resolve with the raw JSON body
  cache: { member: (guildId, userId) => myCache.member(guildId, userId) }, // optional, any subset
  file: (data, name) => new MyFile(data, name), // optional
};
```

### Seyfert plugin

On seyfert 5 or later, the plugin puts the instance on the client (`client.transcripts`), and on
every command, component and modal context (`ctx.transcripts`) already bound to that context's
channel:

```ts
import { Client, definePlugins } from 'seyfert';
import { transcriptsPlugin } from 'sweety-html-transcripts/plugin';

const plugins = definePlugins(transcriptsPlugin({ render: { theme: 'dark' } }));
const client = new Client({ plugins });

// Types client.transcripts and ctx.transcripts everywhere
declare module 'seyfert' {
  interface SeyfertRegistry {
    plugins: typeof plugins;
  }
}

// In a command, component or modal: the channel it runs in
const file = await ctx.transcripts.attachment({ filename: 'ticket.html' });
await ctx.write({ files: [file] });

// Any other channel
const html = await ctx.client.transcripts.html(otherChannelId);
```

The options are the `createTranscripts` defaults (`fetch` and `render`) plus `cache: false` to skip
`client.cache`. See [the guide](docs/guides/seyfert-plugin.md).

### Messages you already have

```ts
const transcript = await transcripts.fromMessages(channelId, messages);
```

Raw API messages are used as they are. Library message objects (anything with an `id`) are
refetched as raw messages.

### Server rendering

By default the components render in the viewer's browser from the
[@penwin/discord-components-core](https://github.com/Ganyu-Studios/discord-components) bundle.
`mode: 'server'` pre-renders them to declarative shadow DOM instead, so the transcript paints
instantly and stays readable before (or without) the bundle. It costs file size, roughly 6× for a
large channel, and needs the optional dependency:

```shell
pnpm add @penwin/discord-components-core
```

```ts
const html = await transcripts.html(channelId, { mode: 'server' });
```

## ⚙️ Options

Every option is optional. `html()`, `buffer()` and `attachment()` take fetch and render options
together; `createTranscripts(adapter, { fetch, render })` sets defaults for both.

### Fetch

```ts
await transcripts.fetch(channelId, {
  limit: Infinity, // newest messages to fetch; Infinity (or -1) fetches the whole channel
  before: undefined, // only messages before this message id
  filter: (message) => true, // e.g. (message) => !message.author.bot
  saveImages: false, // inline images as data urls, or a configured TranscriptImageDownloader
  resolveImageSrc: undefined, // (media, message) => url | undefined (keep) | null (drop)
  threads: true, // fetch the latest message of each thread for its preview
  filePreviews: true, // download small code/text attachments to show them inline
  concurrency: 4, // parallel requests while resolving members, users and channels
});
```

### Render

```ts
transcripts.render(transcript, {
  theme: 'dark', // 'dark' | 'light'
  title: undefined, // <title>, defaults to the channel name
  locale: 'en', // 'en' | 'es' | partial overrides of the English strings
  mode: 'client', // 'client' | 'server'
  favicon: 'guild', // 'guild' | a url | false
  footer: undefined, // footer text with {count}, or false to hide it
  poweredBy: true, // the "Powered by" link
  selectMenus: { users: true, roles: true, channels: true, channelLimit: 25 },
  cdn: undefined, // where the component bundle is served from
});
```

### Upgrading from 0.x

`createTranscript`, `generateFromMessages`, `DiscordJSTranscript`, `SeyfertTranscript` and the
adapter classes still work and are deprecated. They now take the same adapters, so
`new SeyfertTranscriptAdapter(client)` still works, and the channel only needs an `id`. The
`callbacks.resolveChannel`/`resolveUser`/`resolveRole` and `hydrate` options are gone: lookups now
happen once during `fetch`, and server rendering is `mode: 'server'`.

## 🤝 Enjoy the package?

Give it a star ⭐ and/or support me on [ko-fi](https://ko-fi.com/justevil)
