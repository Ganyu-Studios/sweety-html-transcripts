# createTranscripts

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

## Messages you already have

```ts
const transcript = await transcripts.fromMessages(channelId, messages);
```

Raw API messages are used as they are. Library message objects (anything with an `id`) are
refetched as raw messages.

## Options

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
