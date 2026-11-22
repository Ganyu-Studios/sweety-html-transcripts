import 'dotenv/config';

import { Client, type ParseClient } from 'seyfert';
import { GatewayIntentBits } from 'seyfert/lib/types';
import { seyfert } from '../../src';
import { generate } from './shared';

const client = new Client({
  getRC() {
    return {
      token: process.env.TOKEN!,
      locations: { base: '.' },
      intents: GatewayIntentBits.Guilds | GatewayIntentBits.GuildMessages | GatewayIntentBits.MessageContent,
    };
  },
});

client.events.values.READY = {
  __filePath: null,
  data: { name: 'ready', once: true },
  async run(user, client) {
    client.logger.info(`Logged in as ${user.username}`);

    try {
      await generate(
        seyfert(client),
        (channelId, file) => client.messages.write(channelId, { content: 'Here is the transcript', files: [file] }),
        (message) => client.logger.info(message)
      );
    } finally {
      await client.gateway.disconnectAll();
      process.exit(0);
    }
  },
};

void client.start();

declare module 'seyfert' {
  interface SeyfertRegistry {
    client: ParseClient<Client<true>>;
  }
}
