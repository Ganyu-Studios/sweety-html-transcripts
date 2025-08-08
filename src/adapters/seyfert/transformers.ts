import { BaseChannel, BaseGuildChannel, CategoryChannel, DirectoryChannel, DMChannel, ForumChannel, Guild, GuildMember, GuildMemberData, GuildRole, MediaChannel, Message, MessageData, NewsChannel, StageChannel, TextGuildChannel, ThreadChannel, Transformers, User, UsingClient, VoiceChannel } from "seyfert";
import { StructStates } from "seyfert/lib/common";
import { APIChannelBase, APIGuild, APIGuildChannel, APIRole, APIUser, ChannelType, GatewayGuildCreateDispatchData } from "seyfert/lib/types";

export class TranscriptMessage extends Message {
  constructor(client: UsingClient, public data: MessageData) {
    super(client, data);
  }
  toJSON() {
    return this.data;
  }
}
export class TranscriptGuildRole extends GuildRole {
  constructor(client: UsingClient, public data: APIRole, guildId: string) {
    super(client, data, guildId);
  }
  toJSON() {
    return this.data;
  }
}

export class TranscriptGuild<State extends StructStates = 'api'> extends Guild<State> {
  constructor(client: UsingClient, public data: APIGuild | GatewayGuildCreateDispatchData) {
    super(client, data);
  }
  toJSON() {
    return this.data;
  }
}
export class TranscriptUser extends User {
  constructor(client: UsingClient, public data: APIUser) {
    super(client, data);
  }
  toJSON() {
    return this.data;
  }
}
export class TranscriptGuildMember extends GuildMember {
  constructor(client: UsingClient, public data: GuildMemberData, user: APIUser, guildId: string) {
    super(client, data, user, guildId);
  }
  toJSON() {
    return this.data;
  }
}

export class TranscriptDirectoryChannel extends DirectoryChannel {
  constructor(client: UsingClient, public data: APIChannelBase<ChannelType>) { super(client, data); } toJSON() { return this.data; }
}

export class TranscriptStageChannel extends StageChannel {
  constructor(client: UsingClient, public data: APIGuildChannel<ChannelType>) { super(client, data); } toJSON() { return this.data; }
}

export class TranscriptNewsChannel extends NewsChannel {
  constructor(client: UsingClient, public data: APIGuildChannel<ChannelType>) { super(client, data); } toJSON() { return this.data; }
}

export class TranscriptCategoryChannel extends CategoryChannel {
  constructor(client: UsingClient, public data: APIChannelBase<ChannelType>) { super(client, data); } toJSON() { return this.data; }
}

export class TranscriptThreadChannel extends ThreadChannel {
  constructor(client: UsingClient, public data: APIChannelBase<ChannelType>) { super(client, data); } toJSON() { return this.data; }
}

export class TranscriptForumChannel extends ForumChannel {
  constructor(client: UsingClient, public data: APIGuildChannel<ChannelType>) { super(client, data); } toJSON() { return this.data; }
}

export class TranscriptMediaChannel extends MediaChannel {
  constructor(client: UsingClient, public data: APIGuildChannel<ChannelType>) { super(client, data); } toJSON() { return this.data; }
}

export class TranscriptVoiceChannel extends VoiceChannel {
  constructor(client: UsingClient, public data: APIGuildChannel<ChannelType>) { super(client, data); } toJSON() { return this.data; }
}

export class TranscriptBaseChannel<T extends ChannelType> extends BaseChannel<T> {
  constructor(client: UsingClient, public data: APIChannelBase<T>) { super(client, data); } toJSON() { return this.data; }
}

export class TranscriptBaseGuildChannel extends BaseGuildChannel {
  constructor(client: UsingClient, public data: APIGuildChannel<ChannelType>) { super(client, data); } toJSON() { return this.data; }
}

export class TranscriptTextGuildChannel extends TextGuildChannel {
  constructor(client: UsingClient, public data: APIGuildChannel<ChannelType>) { super(client, data); } toJSON() { return this.data; }
}

export class TranscriptDMChannel extends DMChannel {
  constructor(client: UsingClient, public data: APIChannelBase<ChannelType>) { super(client, data); } toJSON() { return this.data; }
}

Transformers.DirectoryChannel = (client, data) => new TranscriptDirectoryChannel(client, data);
Transformers.StageChannel = (client, data) => new TranscriptStageChannel(client, data);
Transformers.NewsChannel = (client, data) => new TranscriptNewsChannel(client, data);
Transformers.CategoryChannel = (client, data) => new TranscriptCategoryChannel(client, data);
Transformers.ThreadChannel = (client, data) => new TranscriptThreadChannel(client, data);
Transformers.ForumChannel = (client, data) => new TranscriptForumChannel(client, data);
Transformers.MediaChannel = (client, data) => new TranscriptMediaChannel(client, data);
Transformers.VoiceChannel = (client, data) => new TranscriptVoiceChannel(client, data);
Transformers.BaseChannel = (client, data) => new TranscriptBaseChannel(client, data);
Transformers.BaseGuildChannel = (client, data) => new TranscriptBaseGuildChannel(client, data);
Transformers.TextGuildChannel = (client, data) => new TranscriptTextGuildChannel(client, data);

Transformers.DMChannel = (client, data) => new TranscriptDMChannel(client, data);

Transformers.Message = (...args) => new TranscriptMessage(...args);
Transformers.GuildRole = (...args) => new TranscriptGuildRole(...args);
Transformers.Guild = (...args) => new TranscriptGuild(...args);
Transformers.User = (...args) => new TranscriptUser(...args);
Transformers.GuildMember = (...args) => new TranscriptGuildMember(...args);


declare module "seyfert" {
  interface CustomStructures {
    Message: TranscriptMessage,
    User: TranscriptUser,
    Guild: TranscriptGuild,

    GuildRole: TranscriptGuildRole,
    GuildMember: TranscriptGuildMember,

    NewsChannel: TranscriptNewsChannel,
    CategoryChannel: TranscriptCategoryChannel,
    ThreadChannel: TranscriptThreadChannel,
    ForumChannel: TranscriptForumChannel,
    MediaChannel: TranscriptMediaChannel,
    VoiceChannel: TranscriptVoiceChannel,
    BaseChannel: TranscriptBaseChannel<ChannelType>,
    BaseGuildChannel: TranscriptBaseGuildChannel,
    TextGuildChannel: TranscriptTextGuildChannel,
    DMChannel: TranscriptDMChannel,
    DirectoryChannel: TranscriptDirectoryChannel,
    StageChannel: TranscriptStageChannel,
  }
}