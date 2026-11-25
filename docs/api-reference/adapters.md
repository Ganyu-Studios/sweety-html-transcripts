# Adapters

An adapter is "GET this Discord API route and give me the raw JSON", plus two optional parts:
lookups through your library, and a way to wrap the finished file. Messages always come from REST
as raw API objects, so nothing in them is converted from library classes, and rate limits stay with
your library.

| Adapter             | Channels, guilds, roles, members, users            | Messages                            | `attachment()` returns           |
| ------------------- | -------------------------------------------------- | ----------------------------------- | -------------------------------- |
| `seyfert(client)`   | seyfert's `raw` shorters (`client.members.raw()`…) | `client.rest`                       | a seyfert `RawFile`              |
| `discordjs(client)` | the managers' `fetch()` (`guild.members.fetch()`…) | `client.rest`                       | a discord.js `AttachmentPayload` |
| `rest(token)`       | `fetch` and a bot token                            | `fetch` and a bot token, no library | `{ data, name }`                 |

The library lookups work the way your bot's own code does: the cache when it has the object,
otherwise one request, which the library stores in its cache. So the first transcript of a channel
fills the cache, and the next ones mostly cost the message pages. Answers the library does not cache
(a member who left, a channel the bot cannot see) are remembered for five minutes. Turn all of this
off with `seyfert(client, { cache: false })` or `discordjs(client, { cache: false })` to ask the API
directly every time.

Any other library works by implementing `TranscriptAdapter`:

```ts
const adapter: TranscriptAdapter<MyFile> = {
  get: (route, query) => myRest.get(route, query), // must resolve with the raw JSON body
  cache: { member: (guildId, userId) => myCache.member(guildId, userId) }, // optional, any subset
  file: (data, name) => new MyFile(data, name), // optional
};
```
