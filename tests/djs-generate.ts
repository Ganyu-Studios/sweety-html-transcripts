import 'dotenv/config';

import type { GuildTextBasedChannel } from 'discord.js';
import { Client, GatewayIntentBits } from 'discord.js';
import { DiscordJSTranscript } from '../src';

const client = new Client({
  intents: [GatewayIntentBits.GuildMessages, GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent],
});

client.on('clientReady', async () => {
  console.log('Fetching channel: ', process.env.CHANNEL!);
  const channel = await client.channels.fetch(process.env.CHANNEL!);

  if (!channel || !channel.isTextBased()) {
    console.error('Invalid channel provided.');
    process.exit(1);
  }

  const attachment = await DiscordJSTranscript.create({
    channel,
    limit: 20,
  });

  await (channel as GuildTextBasedChannel).send({
    content: 'Here is the transcript',
    files: [attachment],
  });

  client.destroy();
  process.exit(0);
});

client.login(process.env.TOKEN!);
