# Adapters

An adapter is just "GET this Discord API route and give me the raw JSON", plus an optional way to
wrap the finished file. Nothing is converted from library objects, so it does not break when a
library changes its classes, and rate limits stay with your library.

| Adapter             | Uses                                | `attachment()` returns           |
| ------------------- | ----------------------------------- | -------------------------------- |
| `seyfert(client)`   | `client.rest`                       | a seyfert `RawFile`              |
| `discordjs(client)` | `client.rest`                       | a discord.js `AttachmentPayload` |
| `rest(token)`       | `fetch` and a bot token, no library | `{ data, name }`                 |

Any other library works by implementing `TranscriptAdapter`:

```ts
const adapter: TranscriptAdapter<MyFile> = {
  get: (route, query) => myRest.get(route, query), // must resolve with the raw JSON body
  file: (data, name) => new MyFile(data, name), // optional
};
```
