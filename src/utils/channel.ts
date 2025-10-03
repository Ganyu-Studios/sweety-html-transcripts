import type {
  APIBasePartialChannel,
  APIChannel,
  APIDMChannel,
  APIGuildCategoryChannel,
  APIGuildForumChannel,
  APIGuildMediaChannel,
  APIGuildMember,
  APIGuildStageVoiceChannel,
  APIGuildVoiceChannel,
  APIInteractionDataResolvedGuildMember,
  APIMessage,
  APINewsChannel,
  APITextChannel,
  APIThreadChannel,
  GatewayGuildMemberAddDispatchData,
  GatewayGuildMemberUpdateDispatchData,
  GatewayMessageCreateDispatchData,
} from 'discord-api-types/v10';
import { ChannelType } from 'discord-api-types/v10';

export type APIAllGuildTextableChannels = APITextChannel | APIGuildVoiceChannel | APINewsChannel | APIThreadChannel;
export type APIAllTextableChannels =
  | APITextChannel
  | APIGuildVoiceChannel
  | APIDMChannel
  | APINewsChannel
  | APIThreadChannel;
export type APIDirectoryChannel = APIBasePartialChannel & { type: ChannelType.GuildDirectory };
export type AllAPIChannel = APIChannel | APIDirectoryChannel;
export type AllAPIGuildChannels =
  | APIAllGuildTextableChannels
  | APIGuildStageVoiceChannel
  | APIGuildMediaChannel
  | APIGuildForumChannel
  | APIThreadChannel
  | APIGuildCategoryChannel
  | APINewsChannel
  | APIDirectoryChannel;

export type APIMessageData =
  | (APIMessage & { guild_id?: string; member?: APIGuildMember; system?: boolean })
  | GatewayMessageCreateDispatchData;

export type GuildMemberData =
  | APIGuildMember
  | Omit<APIGuildMember, 'user'>
  | GatewayGuildMemberUpdateDispatchData
  | GatewayGuildMemberAddDispatchData
  | APIInteractionDataResolvedGuildMember;

type AllChannelTypePicked = AllAPIChannel;

class BaseChannelUtils {
  isStage(channel: AllChannelTypePicked): channel is APIGuildStageVoiceChannel {
    return channel.type === ChannelType.GuildStageVoice;
  }

  isMedia(channel: AllChannelTypePicked): channel is APIGuildMediaChannel {
    return channel.type === ChannelType.GuildMedia;
  }

  isDM(channel: AllChannelTypePicked): channel is APIDMChannel {
    return [ChannelType.DM, ChannelType.GroupDM].includes(channel.type);
  }

  isForum(channel: AllChannelTypePicked): channel is APIGuildForumChannel {
    return channel.type === ChannelType.GuildForum;
  }

  isThread(channel: AllChannelTypePicked): channel is APIThreadChannel {
    return [ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.AnnouncementThread].includes(channel.type);
  }

  isDirectory(channel: AllChannelTypePicked) {
    return channel.type === ChannelType.GuildDirectory;
  }

  isVoice(channel: AllChannelTypePicked): channel is APIGuildVoiceChannel {
    return channel.type === ChannelType.GuildVoice;
  }

  isTextGuild(channel: AllChannelTypePicked): channel is APITextChannel {
    return channel.type === ChannelType.GuildText;
  }

  isCategory(channel: AllChannelTypePicked): channel is APIGuildCategoryChannel {
    return channel.type === ChannelType.GuildCategory;
  }

  isNews(channel: AllChannelTypePicked): channel is APINewsChannel {
    return channel.type === ChannelType.GuildAnnouncement;
  }

  isTextable(channel: AllChannelTypePicked): channel is APIAllTextableChannels {
    return (
      this.isDM(channel) ||
      this.isVoice(channel) ||
      this.isNews(channel) ||
      this.isTextGuild(channel) ||
      this.isThread(channel)
    );
  }

  isGuildTextable(channel: AllChannelTypePicked): channel is APIAllGuildTextableChannels {
    return !this.isDM(channel) && this.isTextable(channel);
  }

  isThreadOnly(channel: AllChannelTypePicked): channel is APIGuildForumChannel | APIGuildMediaChannel {
    return this.isForum(channel) || this.isMedia(channel);
  }
}

export const channelUtils = new BaseChannelUtils();
