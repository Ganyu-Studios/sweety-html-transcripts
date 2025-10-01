import { MessageReferenceType } from 'discord-api-types/v10';
import type { APIMessageData } from './channel';

class MessageUtils {
  isForward(message: Pick<APIMessageData, 'message_reference'>) {
    return message.message_reference?.type === MessageReferenceType.Forward;
  }
}

export const messageUtils = new MessageUtils();
