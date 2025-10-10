import 'dotenv/config';

import type { GuildTextBasedChannel } from 'discord.js';
import { Client, GatewayIntentBits } from 'discord.js';
import { ExportReturnType } from '../src';
import { DiscordJSTranscript } from '../src/adapters/discordjs';
import { writeFile } from 'node:fs/promises';

const client = new Client({
  intents: [
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const isSendable = process.env.SEND_TRANSCRIPT_TEST !== 'false';

client.on('debug', (message) => console.info(message));

client.on('clientReady', async () => {
  console.info(`Logged in as ${client.user?.username}`);

  if (process.env.CHANNEL) {
    const channel = await client.channels.fetch(process.env.CHANNEL);
    if (!channel || !channel.isTextBased()) {
      console.error('Invalid channel provided.');
      process.exit(1);
    }

    console.info(`Generating transcript for channel ${(channel as GuildTextBasedChannel).name}...`);

    const attachment = await DiscordJSTranscript.create({
      channel,
      limit: 30,
      returnType: isSendable ? ExportReturnType.Attachment : ExportReturnType.String,
    });

    console.info(`Transcript generated for channel ${(channel as GuildTextBasedChannel).name}.`);

    if (typeof attachment === 'string') {
      const route = `./index.html`;
      await writeFile(route, attachment);
      console.info(`Transcript saved in  ${route}`);
    } else {
      await (channel as GuildTextBasedChannel).send({
        content: 'Here is the transcript',
        files: [attachment],
      });
    }

    client.destroy();
    process.exit(0);
  } else {
    console.error('No channel provided.');
    process.exit(1);
  }
});

client.login(process.env.TOKEN!);
