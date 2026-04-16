# generateFromMessages

If you want to provide your own messages for finer control of what `sweety-html-transcripts` will save, use this function.

## Example

### Seyfert

```javascript
const discordTranscripts = require("sweety-html-transcripts");
import { SeyfertTranscriptAdapter } from 'sweety-html-transcripts/adapters/seyfert';

const messages = /* array of APIMessage objects */;
const channel = /* API channel object */;

// somehow get your messages

const transcript = await discordTranscripts.generateFromMessages(messages, {
    channel,
    adapter: new SeyfertTranscriptAdapter(client),
    // other options
});

// By default returns an AttachmentBuilder that can be sent in a channel.
await client.messages.write(channelId, {
    files: [transcript]
});
```

### Discord.js

```javascript
const discordTranscripts = require("sweety-html-transcripts");
import { DiscordJSTranscriptAdapter } from 'sweety-html-transcripts/adapters/discordjs';

const messages = /* array of APIMessage objects */;
const channel = /* channel object */;

// somehow get your messages

const transcript = await discordTranscripts.generateFromMessages(messages, {
    channel,
    adapter: new DiscordJSTranscriptAdapter(client),
    // other options
});

// By default returns an AttachmentBuilder that can be sent in a channel.
await channel.send({
    files: [transcript]
});
```


## Parameters

```javascript
generateFromMessages(messages, options);
```

### `messages: APIMessageData[]`

These are the messages that will be used in the body of the transcript. Must be an array of Discord API message objects.

### `channel: AllAPIChannel`

This is the channel used to grab information about the transcript, like guild name and icon, channel name, etc. Must be a Discord API channel object.

### `options: GenerateFromMessagesOptions`

An object with the sweety-html-transcripts configuration options.

<details>

<summary>TLDR: quick summary of everything below.</summary>

```javascript
const attachment = await discordTranscripts.generateFromMessages(messages, {
    channel, // API channel object
    returnType: 'attachment', // Valid options: 'buffer' | 'string' | 'attachment' Default: 'attachment' OR use the enum ExportReturnType
    filename: 'transcript.html', // Only valid with returnType is 'attachment'. Name of attachment.
    saveImages: false, // Download all images and include the image data in the HTML (allows viewing the image even after it has been deleted) (! WILL INCREASE FILE SIZE !)
    footerText: "Exported {number} message{s}", // Change text at footer, don't forget to put {number} to show how much messages got exported, and {s} for plural
    adapter: new SomeAdapter(..), // The client adapter to create the transcripts
    callbacks: {
      // register custom callbacks for the following:
      resolveChannel: (channelId: string) => Awaitable<AllAPIChannel | null>,
      resolveUser: (userId: string) => Awaitable<APIUser | null>,
      resolveRole: (roleId: string) => Awaitable<APIRole | null>
    },
    poweredBy: true // Whether to include the "Powered by sweety-html-transcripts" footer
});
```

</details>

#### `options.returnType: 'buffer' | 'string' | 'attachment'`

It's recommended to use the `ExportReturnType` enum instead of passing in a string.\
This option determines what this function will return.&#x20;

- **buffer**: the HTML data as a buffer.
- string: the HTML data as a string.
- attachment: the HTML data as an `AttachmentBuilder`

The default value is `attachment`

#### `options.filename: string`

The name of the output file when the return type is `attachment`

The default value is `transcript-{channel id}.html`

#### `options.saveImages: boolean`

Enabling this option will make Discord HTML Transcripts download all image attachments. This is useful in use cases where the channel will be deleted which will wipe all images off of Discord's CDN, which will break images that aren't downloaded.

**If you are uploading the transcript to discord,** enabling this option may cause issues. Your bot may hit the upload filesize limit since images take up a lot of space!&#x20;

The default value is `false`

#### `options.footerText: string`

The text that will be used in the footer of the transcript. You can use the following placeholders:

- `{number}`: the total number of messages exported. Useful when you are using `createTranscript(...)`
- `{s}`: Adds an s if the number is >0, otherwise it is replaced with nothing

The default value is `Exported {number} message{s}`

#### `options.poweredBy: boolean`

Disabling this will remove the `Powered by sweety-html-transcripts` in the footer.

The default value is `true`

#### `options.callbacks.resolveChannel: (channelId: string) => Awaitable<AllAPIChannel | null>`

A custom function that will be used by the module whenever it needs to resolve a channel (for example, if someone mentions a channel)

#### `options.callbacks.resolveUser: (userId: string) => Awaitable<APIUser | null>`

A custom function that will be used by the module whenever it needs to resolve a user (for example, if a user is mentioned)

#### `options.callbacks.resolveRole: (guildId: string, roleId: string) => Awaitable<APIRole | null>`

A custom function that will be used by the module whenever it needs to resolve a role (for example, if a role is mentioned)
