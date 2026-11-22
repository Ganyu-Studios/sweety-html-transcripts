import type { Locale } from './types';

export const es: Locale = {
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
