import type { Locale } from './types';

export const en: Locale = {
  directMessages: 'Direct Messages',
  unknownRecipient: 'Unknown Recipient',
  header: {
    channel: 'This is the start of the #{name} channel.',
    thread: 'This is the start of the {name} thread.',
    voice: 'Text chat for the {name} voice channel.',
    category: 'Category channel.',
    directMessages: 'This is the beginning of your direct message history.',
  },
  footer: { one: 'Exported {count} message.', other: 'Exported {count} messages.' },
  poweredBy: 'Powered by {name}.',
  reply: {
    notLoaded: 'Original message was deleted.',
    attachment: 'Click to see attachment',
    command: 'Click to see command',
  },
  thread: {
    messages: { one: '{count} Message', other: '{count} Messages' },
    view: 'See Thread',
    notSaved: 'Thread messages not saved.',
  },
  system: {
    pinned: '{user} pinned {message} to this channel.',
    pinnedMessage: 'a message',
    boost: '{user} just boosted the server!',
    threadStarted: '{user} started a thread: {name}',
    channelName: '{user} changed the channel name: {name}',
    join: [
      '{user} just joined the server - glhf!',
      '{user} just joined. Everyone, look busy!',
      '{user} just joined. Can I get a heal?',
      '{user} joined your party.',
      'Welcome, {user}. Stay awhile and listen.',
      'Welcome, {user}. We hope you brought pizza.',
      'A wild {user} appeared.',
      'Swoooosh. {user} just landed.',
      '{user} just slid into the server.',
      'Big {user} showed up!',
      "Where's {user}? In the server!",
      '{user} hopped into the server. Kangaroo!!',
      'Challenger approaching - {user} has appeared!',
      '{user} is here, as the prophecy foretold.',
      'Ready player {user}',
    ],
  },
};
