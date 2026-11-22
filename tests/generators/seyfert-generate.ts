import 'dotenv/config';

import { writeFile } from 'node:fs/promises';
import { Client, type ParseClient } from 'seyfert';
import { GatewayIntentBits } from 'seyfert/lib/types';
import { createTranscripts, seyfert } from '../../src';

const client = new Client({
  getRC() {
    return {
      token: process.env.TOKEN!,
      locations: { base: '.' },
      intents: GatewayIntentBits.Guilds | GatewayIntentBits.GuildMessages | GatewayIntentBits.MessageContent,
    };
  },
});

const send = process.env.SEND_TRANSCRIPT_TEST !== 'false';
const mode = process.env.MODE === 'server' ? 'server' : 'client';

client.events.values.READY = {
  __filePath: null,
  data: { name: 'ready', once: true },
  async run(user, client) {
    client.logger.info(`Logged in as ${user.username}`);

    const channelId = process.env.CHANNEL;
    if (!channelId) throw new Error('Set CHANNEL in .env');

    const transcripts = createTranscripts(seyfert(client));
    const started = performance.now();

    if (send) {
      const file = await transcripts.attachment(channelId, { limit: 30, mode });
      await client.messages.write(channelId, { content: 'Here is the transcript', files: [file] });
    } else {
      await writeFile('./index.html', await transcripts.html(channelId, { limit: 30, mode }));
      client.logger.info('Transcript saved to ./index.html');
    }

    client.logger.info(`Done in ${(performance.now() - started).toFixed(0)}ms`);
    await client.gateway.disconnectAll();
    process.exit(0);
  },
};

void client.start();

declare module 'seyfert' {
  interface SeyfertRegistry {
    client: ParseClient<Client<true>>;
  }
}
