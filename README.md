# `seyfert-html-transcripts`

[![Discord](https://img.shields.io/discord/555474311637499955?label=discord)](https://discord.gg/4JmKY8wgB6)
[![npm](https://img.shields.io/npm/dw/seyfert-html-transcripts)](http://npmjs.org/package/seyfert-html-transcripts)
![GitHub package.json version](https://img.shields.io/github/package-json/v/Ganyu-Studios/seyfert-html-transcripts)
![GitHub Repo stars](https://img.shields.io/github/stars/Ganyu-Studios/seyfert-html-transcripts?style=social)

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

**This module is designed to work with [seyfert](https://seyfert.dev) 3.2 or
above _only_.**

Styles from
[@penwin/discord-components-core](https://github.com/Ganyu-Studios/discord-components).\
Behind the scenes, this package uses React SSR to generate a static site.

## 👋 Support

Please do not DM me requesting support with this package, I will not respond.\
Instead, please open a thread on [this](https://discord.gg/4JmKY8wgB6) server.

## 🖨️ Example Output

![output](https://derock.media/r/6G6FIl.gif)

## 📝 Usage

### Example usage using the built in message fetcher.

```js
const discordTranscripts = require('seyfert-html-transcripts');
// or (if using typescript) import * as discordTranscripts from 'seyfert-html-transcripts';

const channel = await message.channel(); // or however you get your TextChannel

// Must be awaited
const attachment = await discordTranscripts.createTranscript(channel);

channel.messages.write({
  files: [attachment],
});
```

### Or if you prefer, you can pass in your own messages.

```js
const discordTranscripts = require('seyfert-html-transcripts');
// or (if using typescript) import * as discordTranscripts from 'seyfert-html-transcripts';

const messages = someWayToGetMessages(); // Must be Collection<string, Message> or Message[]
const channel = someWayToGetChannel(); // Used for ticket name, guild icon, and guild name

// Must be awaited
const attachment = await discordTranscripts.generateFromMessages(messages, channel);

channel.messages.write({
  files: [attachment],
});
```

## ⚙️ Configuration

Both methods of generating a transcript allow for an option object as the last
parameter.\
**All configuration options are optional!**

### Built in Message Fetcher

```js
const attachment = await discordTranscripts.createTranscript({
    channel: channel, // The API channel object to create the transcript.
    limit: -1, // Max amount of messages to fetch. `-1` recursively fetches.
    returnType: 'attachment', // Valid options: 'buffer' | 'string' | 'attachment' Default: 'attachment' OR use the enum ExportReturnType
    filename: 'transcript.html', // Only valid with returnType is 'attachment'. Name of attachment.
    saveImages: false, // Download all images and include the image data in the HTML (allows viewing the image even after it has been deleted) (! WILL INCREASE FILE SIZE !)
    footerText: "Exported {number} message{s}", // Change text at footer, don't forget to put {number} to show how much messages got exported, and {s} for plural
    adapter: new SomeAdapter(), // The adapter to use to generate the transcripts
    callbacks: {
      // register custom callbacks for the following:
      resolveChannel: (channelId: string) => Awaitable<AllAPIChannel | null>,
      resolveUser: (userId: string) => Awaitable<APIUser | null>,
      resolveRole: (roleId: string) => Awaitable<APIRole | null>,
    },
    poweredBy: true, // Whether to include the "Powered by seyfert-html-transcripts" footer
    hydrate: true, // Whether to hydrate the html server-side
    filter: (APIMessage) => true // Filter messages, e.g. (message) => !message.author.bot
});
```

### Providing your own messages

```js
const attachment = await discordTranscripts.generateFromMessages(messages, {
  // Same as createTranscript, except no limit or filter
  channel: channel, // The API channel object to create the transcript.
});
```

## 🤝 Enjoy the package?

Give it a star ⭐ and/or support me on [ko-fi](https://ko-fi.com/justevil)
