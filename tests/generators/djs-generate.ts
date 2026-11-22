import 'dotenv/config';

import type { SendableChannels } from 'discord.js';
import { Client, GatewayIntentBits } from 'discord.js';
import { discordjs } from '../../src';
import { generate } from './shared';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once('clientReady', async () => {
  console.info(`Logged in as ${client.user?.username}`);

  try {
    await generate(discordjs(client), async (channelId, file) => {
      const channel = (await client.channels.fetch(channelId)) as SendableChannels;
      return channel.send({ content: 'Here is the transcript', files: [file] });
    });
  } finally {
    await client.destroy();
  }
});

void client.login(process.env.TOKEN);
