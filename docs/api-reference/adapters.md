# Adapters

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
