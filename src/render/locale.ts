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

const en: Locale = {
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

const es: Locale = {
  directMessages: 'Mensajes directos',
  unknownRecipient: 'Destinatario desconocido',
  header: {
    channel: 'Este es el comienzo del canal #{name}.',
    thread: 'Este es el comienzo del hilo {name}.',
    voice: 'Chat de texto del canal de voz {name}.',
    category: 'Canal de categoría.',
    directMessages: 'Este es el comienzo de tu historial de mensajes directos.',
  },
  footer: { one: 'Se exportó {count} mensaje.', other: 'Se exportaron {count} mensajes.' },
  poweredBy: 'Hecho con {name}.',
  reply: {
    notLoaded: 'El mensaje original fue eliminado.',
    attachment: 'Haz clic para ver el archivo adjunto',
    command: 'Haz clic para ver el comando',
  },
  thread: {
    messages: { one: '{count} mensaje', other: '{count} mensajes' },
    view: 'Ver hilo',
    notSaved: 'No se guardaron los mensajes del hilo.',
  },
  system: {
    pinned: '{user} ha fijado {message} en este canal.',
    pinnedMessage: 'un mensaje',
    boost: '¡{user} acaba de mejorar el servidor!',
    threadStarted: '{user} ha creado un hilo: {name}',
    channelName: '{user} ha cambiado el nombre del canal: {name}',
    join: [
      '{user} acaba de unirse al servidor. ¡Suerte y diviértete!',
      '{user} acaba de unirse. ¡Todos, aparenten estar ocupados!',
      '{user} se ha unido a tu grupo.',
      'Te damos la bienvenida, {user}. Esperamos que hayas traído pizza.',
      '¡Ha aparecido un {user} salvaje!',
      'Fiuuu. {user} acaba de aterrizar.',
      '¿Dónde está {user}? ¡En el servidor!',
      '{user} está aquí, como vaticinó la profecía.',
    ],
  },
};

export const locales = { en, es } satisfies Record<string, Locale>;

export type LocaleName = keyof typeof locales;

/** A built-in locale by name, or your own, optionally overriding parts of English. */
export function resolveLocale(locale: LocaleName | DeepPartial<Locale> | undefined): Locale {
  if (locale === undefined) return en;
  if (typeof locale === 'string') return locales[locale] ?? en;
  return merge(en, locale);
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends string[] ? string[] : T[K] extends object ? DeepPartial<T[K]> : T[K];
};

function merge<T>(base: T, override: DeepPartial<T>): T {
  const out = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(override as Record<string, unknown>)) {
    if (value === undefined) continue;
    const current = out[key];
    out[key] =
      value && typeof value === 'object' && !Array.isArray(value) && current && typeof current === 'object'
        ? merge(current, value as DeepPartial<typeof current>)
        : value;
  }
  return out as T;
}

/** Pick a plural form. */
export const plural = (forms: { one: string; other: string }, count: number): string =>
  (count === 1 ? forms.one : forms.other).replaceAll('{count}', String(count));
