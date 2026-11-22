# Upgrading from 0.x

`createTranscript`, `generateFromMessages`, `DiscordJSTranscript`, `SeyfertTranscript` and the
adapter classes still work and are deprecated. They now take the same adapters, so
`new SeyfertTranscriptAdapter(client)` still works, and the channel only needs an `id`. The
`callbacks.resolveChannel`/`resolveUser`/`resolveRole` and `hydrate` options are gone: lookups now
happen once during `fetch`, and server rendering is `mode: 'server'`.

## Before and after

```ts
// 0.x
const attachment = await createTranscript({
  channel: await client.channels.raw(channelId),
  adapter: new SeyfertTranscriptAdapter(client),
  footerText: 'Saved {number} message{s}',
});

// 1.x
const transcripts = createTranscripts(seyfert(client));
const attachment = await transcripts.attachment(channelId, { footer: 'Saved {count} messages' });
```
