import 'dotenv/config';

import { Client, type ParseClient } from 'seyfert';
import { GatewayIntentBits } from 'seyfert/lib/types';
import { ExportReturnType } from '../src';
import { SeyfertTranscript } from '../src/adapters/seyfert';
import { writeFile } from 'node:fs/promises';

const client = new Client({
  getRC() {
    return {
      debug: true,
      token: process.env.TOKEN!,
      locations: {
        base: '.',
      },
      intents: [
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
      ].reduce((a, b) => a | b, 0),
    };
  },
});

const isSendable = process.env.SEND_TRANSCRIPT_TEST !== 'false';

client.events.values.READY = {
  __filePath: null,
  data: { name: 'ready', once: true },
  async run(user, client) {
    client.logger.info(`Logged in as ${user.username}`);

    if (process.env.CHANNEL) {
      const channel = await client.channels.fetch(process.env.CHANNEL).catch(() => null);
      if (!channel || !channel.isGuildTextable()) {
        client.logger.error('Invalid channel provided.');
        process.exit(1);
      }

      client.logger.info(`Generating transcript for channel ${channel.name}...`);

      const attachment = await SeyfertTranscript.create({
        channel,
        limit: 30,
        returnType: isSendable ? ExportReturnType.Attachment : ExportReturnType.String,
      });

      client.logger.info(`Transcript generated for channel ${channel.name}.`);

      if (typeof attachment === 'string') {
        const route = `./index.html`;
        await writeFile(route, attachment);
        client.logger.info(`Transcript saved in  ${route}`);
      } else {
        await channel.messages.write({
          content: 'Here is the transcript',
          files: [attachment],
        });
        client.logger.info(`Transcript sent in channel ${channel.name}. (${channel.id})`);
      }

      client.gateway.disconnectAll();
      process.exit(0);
    } else {
      client.logger.error('No channel provided.');
      process.exit(1);
    }
  },
};

client.start();

declare module 'seyfert' {
  interface UsingClient extends ParseClient<Client<true>> {}
}
