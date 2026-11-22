/**
 * Every string the transcript itself writes (message content is never translated).
 * Placeholders in braces are filled in by the renderer: `{user}`, `{message}`, `{name}`, `{count}`.
 */
export interface Locale {
  directMessages: string;
  unknownRecipient: string;
  header: {
    channel: string; // {name}
    thread: string; // {name}
    voice: string; // {name}
    category: string;
    directMessages: string;
  };
  /** Footer. `{count}` is the number of messages. One entry per plural form (one, other). */
  footer: { one: string; other: string };
  poweredBy: string; // {name}
  reply: { notLoaded: string; attachment: string; command: string };
  thread: { messages: { one: string; other: string }; view: string; notSaved: string };
  system: {
    pinned: string; // {user} {message}
    pinnedMessage: string;
    boost: string; // {user}
    threadStarted: string; // {user} {name}
    channelName: string; // {user} {name}
    join: string[]; // {user}
  };
}
