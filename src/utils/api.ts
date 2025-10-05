import type {
  ApplicationEmoji,
  Attachment,
  Channel,
  Emoji,
  Guild,
  GuildEmoji,
  GuildMember,
  MessageReaction,
  MessageSnapshot,
  ReactionEmoji,
  Role,
  Sticker,
  User,
} from 'discord.js';
import { type Message } from 'discord.js';
import type {
  APIAttachment,
  APIChannel,
  APIEmoji,
  APIGuild,
  APIGuildForumTag,
  APIGuildMember,
  APIMessage,
  APIMessageSnapshot,
  APIModalSubmitInteractionMetadata,
  APIReaction,
  APIRole,
  APISticker,
  APIUser,
} from 'discord-api-types/v10';
import { toSnakeCase } from './replacer';
import type { AllAPIChannel } from './channel';
import { GuildFeature } from 'seyfert/lib/types';

// THIS IS A FUCKING MESS AND I HATE IT BUT IT WORKS SO WHATEVER
// I HATE THIS SO MUCH, BUT I HAVE D.JS MORE FOR NOT ALLOWING PEOPLE
// TO RETURN API OBJECTS DIRECTLY

class APIUtils {
  async message(message: Message): Promise<APIMessage> {
    const messageReference = await message.fetchReference().catch(() => null);

    return {
      content: message.content,
      id: message.id,
      type: message.type,
      pinned: message.pinned,
      tts: message.tts,
      message_snapshots: message.messageSnapshots?.map((snapshot) => this.snapshot(snapshot)) ?? [],
      attachments: message.attachments.map((attachment) => this.attachment(attachment)),
      author: this.user(message.author),
      channel_id: message.channelId,
      timestamp: message.createdAt.toISOString(),
      edited_timestamp: message.editedAt ? message.editedAt.toISOString() : null,
      mention_everyone: message.mentions.everyone,
      mention_roles: message.mentions.roles.map((role) => role.id),
      embeds: message.embeds.map((embed) => embed.toJSON()),
      reactions: message.reactions.cache.map((reaction) => this.reaction(reaction)),
      nonce: message.nonce ?? undefined,
      activity: message.activity ? toSnakeCase(message.activity) : undefined,
      flags: message.flags.bitfield,
      sticker_items: message.stickers.map((sticker) => this.sticker(sticker)),
      components: message.components.map((component) => component.toJSON()),
      thread: message.hasThread ? (this.channel(message.thread!) as APIChannel) : undefined,
      position: message.position ?? undefined,
      resolved: undefined,
      mentions: message.mentions.users.map((user) => this.user(user)),
      referenced_message: messageReference ? await this.message(messageReference) : null,
      // @ts-expect-error the types are fucked up
      interaction_metadata: message.interactionMetadata
        ? {
            id: message.interactionMetadata.id,
            type: message.interactionMetadata.type,
            user: this.user(message.interactionMetadata.user),
            authorizing_integration_owners: message.interactionMetadata.authorizingIntegrationOwners,
            interacted_message_id: message.interactionMetadata.interactedMessageId!,
            original_response_message_id: message.interactionMetadata.originalResponseMessageId!,
            triggering_interaction_metadata: message.interactionMetadata.triggeringInteractionMetadata
              ? {
                  type: message.interactionMetadata.triggeringInteractionMetadata.type,
                  id: message.interactionMetadata.triggeringInteractionMetadata.id,
                  user: this.user(message.interactionMetadata.triggeringInteractionMetadata.user),
                  authorizing_integration_owners:
                    message.interactionMetadata.triggeringInteractionMetadata.authorizingIntegrationOwners,
                  interacted_message_id: message.interactionMetadata.triggeringInteractionMetadata.interactedMessageId!,
                  original_response_message_id:
                    message.interactionMetadata.triggeringInteractionMetadata.originalResponseMessageId!,
                }
              : ({} as APIModalSubmitInteractionMetadata['triggering_interaction_metadata']),
          }
        : undefined,
      mention_channels: message.mentions.channels.map((channel) => ({
        id: channel.id,
        type: channel.type,
        name: 'name' in channel && channel.name ? channel.name : '',
        guild_id: 'guildId' in channel ? channel.guildId : '',
      })),
      poll: message.poll
        ? {
            allow_multiselect: message.poll.allowMultiselect,
            expiry: message.poll.expiresAt.toISOString(),
            layout_type: message.poll.layoutType,
            question: message.poll.question,
            answers: message.poll.answers.map((answer) => ({
              answer_id: answer.id,
              poll_media: {
                emoji: answer.emoji ? this.emoji(answer.emoji) : undefined,
                text: answer.text ?? undefined,
              },
            })),
          }
        : undefined,
      interaction: message.interaction
        ? {
            id: message.interaction.id,
            type: message.interaction.type,
            name: message.interaction.commandName,
            user: this.user(message.interaction.user),
          }
        : undefined,
      message_reference: message.reference
        ? {
            channel_id: message.reference.channelId,
            guild_id: message.reference.guildId,
            message_id: message.reference.messageId,
            type: message.reference.type,
          }
        : undefined,
      call: message.call
        ? {
            ended_timestamp: message.call.endedAt ? `${message.call.endedAt.toISOString()}` : undefined,
            participants: message.call.participants as string[],
          }
        : undefined,
    };
  }

  user(user: User): APIUser {
    const raw: APIUser = {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar ?? null,
      bot: user.bot ? user.bot : undefined,
      system: user.system ? user.system : undefined,
      global_name: user.globalName,
      flags: user.flags?.bitfield ?? 0,
      accent_color: user.accentColor ?? undefined,
      banner: user.banner ?? undefined,
      collectibles: undefined,
      avatar_decoration_data: undefined,
    };

    if (user.avatarDecorationData) {
      raw.avatar_decoration_data = toSnakeCase(user.avatarDecorationData);
    }

    if (user.collectibles?.nameplate) {
      raw.collectibles = { nameplate: toSnakeCase(user.collectibles.nameplate) };
    }

    return raw;
  }

  attachment(attachment: Attachment): APIAttachment {
    return {
      id: attachment.id,
      size: attachment.size,
      url: attachment.url,
      duration_secs: attachment.duration ?? undefined,
      ephemeral: attachment.ephemeral ?? undefined,
      height: attachment.height ?? undefined,
      width: attachment.width ?? undefined,
      proxy_url: attachment.proxyURL,
      filename: attachment.name,
      content_type: attachment.contentType ?? undefined,
      title: attachment.title ?? undefined,
      description: attachment.description ?? undefined,
      waveform: attachment.waveform ?? undefined,
      flags: attachment.flags.bitfield,
    };
  }

  reaction(reaction: MessageReaction): APIReaction {
    return {
      count: reaction.count,
      me: reaction.me,
      burst_colors: reaction.burstColors ?? [],
      count_details: reaction.countDetails,
      emoji: this.emoji(reaction.emoji),
      me_burst: reaction.meBurst ?? [],
    };
  }

  emoji(emoji: GuildEmoji | ReactionEmoji | ApplicationEmoji | Emoji): APIEmoji {
    return {
      id: emoji.id,
      name: emoji.name ?? null,
      roles: 'roles' in emoji ? emoji.roles.cache.map((role) => role.id) : undefined,
      user: 'user' in emoji && emoji.user ? this.user(emoji.user as User) : undefined,
      available: 'available' in emoji && emoji.available ? emoji.available : undefined,
      animated: 'animated' in emoji && emoji.animated ? emoji.animated : undefined,
      managed: 'managed' in emoji && emoji.managed ? emoji.managed : undefined,
    };
  }

  sticker(sticker: Sticker): APISticker {
    return {
      description: sticker.description ?? null,
      id: sticker.id,
      name: sticker.name,
      guild_id: sticker.guildId ?? undefined,
      sort_value: sticker.sortValue ?? undefined,
      pack_id: sticker.packId ?? undefined,
      format_type: sticker.format,
      type: sticker.type!,
      tags: sticker.tags!,
      available: sticker.available ?? undefined,
      user: sticker.user ? this.user(sticker.user) : undefined,
    };
  }

  member(member: GuildMember): APIGuildMember {
    return {
      avatar: member.avatar ?? null,
      nick: member.nickname ?? null,
      premium_since: member.premiumSince ? `${member.premiumSince.getTime()}` : null,
      pending: member.pending ?? undefined,
      avatar_decoration_data: member.avatarDecorationData ? toSnakeCase(member.avatarDecorationData) : undefined,
      banner: member.banner ?? null,
      user: this.user(member.user),
      deaf: member.voice.deaf ?? false,
      mute: member.voice.mute ?? false,
      communication_disabled_until: member.communicationDisabledUntil
        ? `${member.communicationDisabledUntil.getTime()}`
        : null,
      roles: member.roles.cache.map((role) => role.id),
      joined_at: `${member.joinedAt?.getTime()}`,
      flags: member.user.flags?.bitfield ?? 0,
    };
  }

  channel(channel: Channel): AllAPIChannel {
    //@ts-expect-error the channel type is everything but is not assignable to APIChannel
    return {
      id: channel.id,
      position: 'position' in channel && channel.position !== null ? channel.position : 0,
      flags: channel.flags?.bitfield ?? 0,
      applied_tags: 'appliedTags' in channel ? (channel.appliedTags ?? []) : [],
      name: 'name' in channel && channel.name ? channel.name : '',
      type: channel.type,
      topic: 'topic' in channel ? (channel.topic ?? null) : null,
      nsfw: 'nsfw' in channel ? channel.nsfw : false,
      default_forum_layout: 'defaultForumLayout' in channel ? channel.defaultForumLayout : undefined,
      default_sort_order: 'defaultSortOrder' in channel ? channel.defaultSortOrder : undefined,
      bitrate: 'bitrate' in channel && channel.bitrate ? channel.bitrate : undefined,
      default_auto_archive_duration:
        'defaultAutoArchiveDuration' in channel && channel.defaultAutoArchiveDuration
          ? channel.defaultAutoArchiveDuration
          : undefined,
      last_message_id: 'lastMessageId' in channel && channel.lastMessageId ? channel.lastMessageId : null,
      parent_id: 'parentId' in channel && channel.parentId ? channel.parentId : null,
      default_thread_rate_limit_per_user:
        'defaultThreadRateLimitPerUser' in channel && channel.defaultThreadRateLimitPerUser
          ? channel.defaultThreadRateLimitPerUser
          : undefined,
      guild_id: 'guildId' in channel && channel.guildId ? channel.guildId : undefined,
      icon: 'icon' in channel && channel.icon ? channel.icon : null,
      rate_limit_per_user: 'rateLimitPerUser' in channel && channel.rateLimitPerUser ? channel.rateLimitPerUser : 0,
      last_pin_timestamp:
        'lastPinTimestamp' in channel && channel.lastPinTimestamp ? `${channel.lastPinTimestamp}` : null,
      rtc_region: 'rtcRegion' in channel ? (channel.rtcRegion ?? null) : null,
      user_limit: 'userLimit' in channel && channel.userLimit ? channel.userLimit : 0,
      managed: 'managed' in channel ? channel.managed : false,
      permission_synced: 'permissionSynced' in channel ? channel.permissionSynced : false,
      archived: 'archived' in channel ? channel.archived : false,
      member_count: 'memberCount' in channel && channel.memberCount ? channel.memberCount : undefined,
      thread_metadata:
        'threadMetadata' in channel && channel.threadMetadata ? toSnakeCase(channel.threadMetadata) : undefined,
      message_count: 'messageCount' in channel && channel.messageCount ? channel.messageCount : undefined,
      member: 'member' in channel && channel.member ? this.member(channel.member as GuildMember) : undefined,
      owner_id: 'ownerId' in channel && channel.ownerId ? channel.ownerId : undefined,
      total_message_sent:
        'totalMessageSent' in channel && channel.totalMessageSent ? channel.totalMessageSent : undefined,
      video_quality_mode:
        'videoQualityMode' in channel && channel.videoQualityMode ? channel.videoQualityMode : undefined,
      permission_overwrites:
        'permissionOverwrites' in channel
          ? channel.permissionOverwrites.cache.map((perm) => ({
              id: perm.id,
              allow: perm.allow.bitfield,
              deny: perm.deny.bitfield,
              type: perm.type,
            }))
          : [],
      default_reaction_emoji:
        'defaultReactionEmoji' in channel && channel.defaultReactionEmoji
          ? {
              emoji_id: channel.defaultReactionEmoji.id,
              emoji_name: channel.defaultReactionEmoji.name ?? null,
            }
          : undefined,
      available_tags:
        'availableTags' in channel
          ? (channel.availableTags?.map(
              (tag): APIGuildForumTag => ({
                emoji_id: tag.emoji!.id,
                emoji_name: tag.emoji!.name ?? null,
                id: tag.id,
                moderated: tag.moderated,
                name: tag.name,
              })
            ) ?? [])
          : [],
    };
  }

  snapshot(snapshot: MessageSnapshot): APIMessageSnapshot {
    return {
      message: {
        attachments: snapshot.attachments.map((attachment) => this.attachment(attachment)),
        content: snapshot.content,
        components: snapshot.components.map((component) => component.toJSON()),
        edited_timestamp: snapshot.editedTimestamp ? `${snapshot.editedTimestamp}` : null,
        embeds: snapshot.embeds.map((embed) => embed.toJSON()),
        mention_roles: snapshot.mentions.roles.map((role) => role.id),
        timestamp: snapshot.createdAt!.toISOString(),
        type: snapshot.type,
        sticker_items: snapshot.stickers.map((sticker) => this.sticker(sticker)),
        flags: snapshot.flags.bitfield,
        mentions: snapshot.mentions.users.map((user) => this.user(user)),
      },
    };
  }

  role(role: Role): APIRole {
    return {
      color: role.color,
      id: role.id,
      name: role.name,
      permissions: role.permissions.bitfield.toString(),
      position: role.position,
      hoist: role.hoist,
      flags: role.flags.bitfield,
      managed: role.managed,
      mentionable: role.mentionable,
      icon: role.icon ?? undefined,
      unicode_emoji: role.unicodeEmoji ?? undefined,
    };
  }

  guild(guild: Guild): APIGuild {
    // @ts-expect-error region is not available anymore
    return {
      id: guild.id,
      name: guild.name,
      icon: guild.icon ?? null,
      afk_channel_id: guild.afkChannelId ?? null,
      afk_timeout: guild.afkTimeout as 1800 | 3600 | 60 | 300 | 900,
      banner: guild.banner ?? null,
      application_id: guild.applicationId ?? null,
      approximate_member_count: guild.approximateMemberCount ?? undefined,
      approximate_presence_count: guild.approximatePresenceCount ?? undefined,
      default_message_notifications: guild.defaultMessageNotifications,
      description: guild.description ?? null,
      discovery_splash: guild.discoverySplash ?? null,
      emojis: guild.emojis.cache.map((emoji) => this.emoji(emoji)),
      explicit_content_filter: guild.explicitContentFilter,
      hub_type: null,
      mfa_level: guild.mfaLevel,
      nsfw_level: guild.nsfwLevel,
      owner_id: guild.ownerId ?? null,
      preferred_locale: guild.preferredLocale,
      premium_subscription_count: guild.premiumSubscriptionCount ?? undefined,
      premium_tier: guild.premiumTier,
      premium_progress_bar_enabled: guild.premiumProgressBarEnabled,
      public_updates_channel_id: guild.publicUpdatesChannelId ?? null,
      roles: guild.roles.cache.map((role) => this.role(role)),
      rules_channel_id: guild.rulesChannelId ?? null,
      splash: guild.splash ?? null,
      system_channel_id: guild.systemChannelId ?? null,
      system_channel_flags: guild.systemChannelFlags.bitfield,
      verification_level: guild.verificationLevel,
      widget_enabled: guild.widgetEnabled ?? undefined,
      widget_channel_id: guild.widgetChannelId ?? null,
      safety_alerts_channel_id: guild.safetyAlertsChannelId ?? null,
      stickers: guild.stickers.cache.map((sticker) => this.sticker(sticker)),
      vanity_url_code: guild.vanityURLCode ?? null,
      incidents_data: guild.incidentsData
        ? {
            dms_disabled_until: guild.incidentsData.dmsDisabledUntil ? `${guild.incidentsData.dmsDisabledUntil.toISOString()}` : null,
            invites_disabled_until: guild.incidentsData.invitesDisabledUntil
              ? `${guild.incidentsData.invitesDisabledUntil.toISOString()}`
              : null,
            dm_spam_detected_at: guild.incidentsData.dmSpamDetectedAt
              ? `${guild.incidentsData.dmSpamDetectedAt.toISOString()}`
              : null,
            raid_detected_at: guild.incidentsData.raidDetectedAt ? `${guild.incidentsData.raidDetectedAt.toISOString()}` : null,
          }
        : null,
      features: guild.features
        .map((feature) => {
          const values = Object.entries(GuildFeature).map(([key, value]) => ({ key, value }));
          const found = values.find((v) => v.key === feature);
          if (found) return found.value;

          return null;
        })
        .filter((f): f is GuildFeature => f !== null),
    };
  }
}

export const apiUtils = new APIUtils();
