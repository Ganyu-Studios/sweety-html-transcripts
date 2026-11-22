import { ChannelType } from 'discord-api-types/v10';

export const isDM = (type: ChannelType): boolean => type === ChannelType.DM || type === ChannelType.GroupDM;

export const isThread = (type: ChannelType): boolean =>
  type === ChannelType.PublicThread || type === ChannelType.PrivateThread || type === ChannelType.AnnouncementThread;

export const isVoice = (type: ChannelType): boolean =>
  type === ChannelType.GuildVoice || type === ChannelType.GuildStageVoice;
