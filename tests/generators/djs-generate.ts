import 'dotenv/config';

import { writeFile } from 'node:fs/promises';
import type { SendableChannels } from 'discord.js';
import { Client, GatewayIntentBits } from 'discord.js';
import { createTranscripts, discordjs } from '../../src';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const send = process.env.SEND_TRANSCRIPT_TEST !== 'false';
const mode = process.env.MODE === 'server' ? 'server' : 'client';

client.once('clientReady', async () => {
  console.info(`Logged in as ${client.user?.username}`);

  const channelId = process.env.CHANNEL;
  if (!channelId) throw new Error('Set CHANNEL in .env');

  const transcripts = createTranscripts(discordjs(client));
  const started = performance.now();

  if (send) {
    const file = await transcripts.attachment(channelId, { limit: 30, mode });
    const channel = (await client.channels.fetch(channelId)) as SendableChannels;
    await channel.send({ content: 'Here is the transcript', files: [file] });
  } else {
    await writeFile('./index.html', await transcripts.html(channelId, { limit: 30, mode }));
    console.info('Transcript saved to ./index.html');
  }

  console.info(`Done in ${(performance.now() - started).toFixed(0)}ms`);
  await client.destroy();
});

void client.login(process.env.TOKEN);
