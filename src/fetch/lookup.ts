import type { APIGuild, APIGuildMember, APIRole, APIUser } from 'discord-api-types/v10';
import type { Awaitable, TranscriptAdapter } from '../adapters/types';
import { httpStatus } from '../adapters/types';
import type { TranscriptChannel, TranscriptGuild } from '../model';

/** The channel fields the model keeps, from any raw-shaped channel. */
export function pickChannel(channel: TranscriptChannel & Record<string, unknown>): TranscriptChannel {
  return {
    id: channel.id,
    type: channel.type,
    name: channel.name,
    topic: channel.topic,
    guild_id: channel.guild_id,
    parent_id: channel.parent_id,
    owner_id: channel.owner_id,
    recipients: channel.recipients,
  };
}

export const pickGuild = (guild: Pick<APIGuild, 'id' | 'name' | 'icon'>): TranscriptGuild => ({
  id: guild.id,
  name: guild.name,
  icon: guild.icon,
});

/**
 * Run an adapter lookup. What it cannot answer (undefined, an empty list) is a miss, and REST is
 * asked instead. If it fails with an HTTP status, the library already asked the API, so the error is
 * the answer (a 404 stays a 404) and is not retried. Any other failure (a broken cache) is a miss.
 */
async function fromCache<T>(read: (() => Awaitable<T | undefined>) | undefined): Promise<T | undefined> {
  if (!read) return undefined;
  try {
    const value = await read();
    return Array.isArray(value) && value.length === 0 ? undefined : (value ?? undefined);
  } catch (error) {
    if (httpStatus(error) !== undefined) throw error;
    return undefined;
  }
}

/**
 * Every lookup the fetch phase makes, each one trying the adapter (the library's cache, or its
 * cache-then-fetch methods) before REST. Counts what came from where.
 */
export class Lookup {
  public readonly stats = { cache: 0, rest: 0 };

  public constructor(private readonly adapter: TranscriptAdapter) {}

  private async read<T>(cached: (() => Awaitable<T | undefined>) | undefined, rest: () => Promise<T>) {
    const hit = await fromCache(cached);
    if (hit !== undefined) {
      this.stats.cache++;
      return hit;
    }
    this.stats.rest++;
    return rest();
  }

  public get<T>(route: `/${string}`, query?: Parameters<TranscriptAdapter['get']>[1]): Promise<T> {
    this.stats.rest++;
    return this.adapter.get<T>(route, query);
  }

  public async channel(id: string): Promise<TranscriptChannel> {
    const cache = this.adapter.cache;
    const channel = await this.read(cache?.channel && (() => cache.channel!(id)), () =>
      this.adapter.get<TranscriptChannel>(`/channels/${id}`)
    );
    return pickChannel(channel as TranscriptChannel & Record<string, unknown>);
  }

  public async guildChannels(guildId: string): Promise<TranscriptChannel[]> {
    const cache = this.adapter.cache;
    const channels = await this.read(cache?.channels && (() => cache.channels!(guildId)), () =>
      this.adapter.get<TranscriptChannel[]>(`/guilds/${guildId}/channels`)
    );
    return channels.map((channel) => pickChannel(channel as TranscriptChannel & Record<string, unknown>));
  }

  /** The guild and its roles: from the adapter when it has both, otherwise one REST request. */
  public async guild(id: string): Promise<{ guild: TranscriptGuild; roles: APIRole[] }> {
    const cache = this.adapter.cache;
    // One after the other: a library that has to fetch the guild usually caches its roles with it.
    const guild = await fromCache(cache?.guild && (() => cache.guild!(id)));
    const roles = guild ? await fromCache(cache?.roles && (() => cache.roles!(id))) : undefined;

    if (guild && roles) {
      this.stats.cache++;
      return { guild: pickGuild(guild), roles };
    }

    this.stats.rest++;
    const full = await this.adapter.get<APIGuild>(`/guilds/${id}`);
    return { guild: pickGuild(full), roles: full.roles };
  }

  /** Just the guild (name and icon), for guilds other messages were forwarded from. */
  public async guildInfo(id: string): Promise<TranscriptGuild> {
    const cache = this.adapter.cache;
    const guild = await this.read<Pick<APIGuild, 'id' | 'name' | 'icon'>>(
      cache?.guild && (() => cache.guild!(id)),
      () => this.adapter.get<APIGuild>(`/guilds/${id}`)
    );
    return pickGuild(guild);
  }

  /** A guild member. Rejects when the user is not a member (REST answers 404). */
  public member(guildId: string, userId: string): Promise<APIGuildMember | Omit<APIGuildMember, 'user'>> {
    const cache = this.adapter.cache;
    return this.read(cache?.member && (() => cache.member!(guildId, userId)), () =>
      this.adapter.get<APIGuildMember>(`/guilds/${guildId}/members/${userId}`)
    );
  }

  public user(id: string): Promise<APIUser> {
    const cache = this.adapter.cache;
    return this.read(cache?.user && (() => cache.user!(id)), () => this.adapter.get<APIUser>(`/users/${id}`));
  }
}
