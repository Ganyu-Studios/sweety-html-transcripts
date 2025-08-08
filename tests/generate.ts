import 'dotenv/config';

import { Client, type ParseClient } from 'seyfert';
import { GatewayIntentBits } from 'seyfert/lib/types';

import { createTranscript } from '../src';
import { SeyfertTranscript, SeyfertTranscriptAdapter } from '../src/adapters/seyfert';

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

      console.info(`Generating transcript for channel ${channel.name}...`);

      // const attachment = await createTranscript(channel, {
      //   // the options for the transcript
      //   limit: 10,
      // });
      // const attachment = await createTranscript({
      //   channel: channel,
      //   adapter: new SeyfertTranscriptAdapter(client),
      //   // the options for the transcript
      //   limit: 10,
      // });

      const attachment = await SeyfertTranscript.create({
        channel,
        limit: 10,
      })

      console.info(`Transcript generated for channel ${channel.name}.`);

      // await channel.messages.write({
      //   content: 'Here is the transcript',
      //   files: [attachment],
      // });

      client.gateway.disconnectAll();
      process.exit(0);
    }
  },
};

client.start();

declare module 'seyfert' {
  interface UsingClient extends ParseClient<Client<true>> { }
}
