# createTranscript

Will fetch (by default, all) the messages from the provided channel and can return either a `Buffer`, `string`, or `AttachmentBuilder`

## Example

### Seyfert

```javascript
const discordTranscripts = require('sweety-html-transcripts');
const { SeyfertTranscriptAdapter } = require('sweety-html-transcripts/adapters/seyfert');

export default createEvent({
  data: { name: 'messageCreate' },
  async run(message) {
    if (message.content === '!transcript') {
      const channel = await client.channels.raw(message.channelId);

      const transcript = await discordTranscripts.createTranscript({
        channel,
        saveImages: true,
        footerText: 'Saved {number} message{s}',
        adapter: new SeyfertTranscriptAdapter(message.client),
      });

      await message.reply({
        content: "Here's your transcript!",
        files: [transcript],
      });
    }
  },
});
```

### Discord.js

```javascript
const discordTranscripts = require('sweety-html-transcripts');
const { DiscordJSTranscriptAdapter } = require('sweety-html-transcripts/adapters/discordjs');

client.on('messageCreate', async (message) => {
  if (message.content === '!transcript') {
    const transcript = await discordTranscripts.createTranscript({
      channel, // some way to get the api channel object, or use the DiscordJSTranscript class instead
      saveImages: true,
      footerText: 'Saved {number} message{s}',
      adapter: new DiscordJSTranscriptAdapter(message.client),
    });

    await message.reply({
      content: "Here's your transcript!",
      files: [transcript],
    });
  }
});
```


## Parameters

```javascript
createTranscript(options);
```

### `options: CreateTranscriptOptions`

The same options as [generatefrommessages.md](generatefrommessages.md 'mention') but adds the `limit` option which lets you limit set the number of messages to fetch.

### `options.limit: number`

The number of messages to fetch.

### `options.filter: (message: Message) => boolean`

A function that will be called for each message to determine if it should be included in the transcript. If false, the message will not be included.
