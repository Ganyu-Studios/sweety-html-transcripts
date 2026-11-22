import 'dotenv/config';

import type { SendableChannels } from 'discord.js';
import { Client, GatewayIntentBits } from 'discord.js';
import { discordjs } from '../../src';
import { generate } from './shared';

const isDebug = process.env.DEBUG === 'true';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

if (isDebug) client.on('debug', (message) => console.info(message));

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
